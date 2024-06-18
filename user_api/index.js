const express = require('express');
const amqp = require('amqplib');

const app = express();
const queue = 'apuestas';

const usuarios = [
  { username: 'usuario1', saldo: 100 },
  { username: 'usuario2', saldo: 200 },
  // Agrega más usuarios aquí
];

async function conectarRabbitMQ() {
  const conn = await amqp.connect('amqp://user_api:user_api@localhost');
  const channel = await conn.createChannel();
  await channel.assertQueue(queue, { durable: true });
  return channel;
}

async function consumirApuestas() {
  const channel = await conectarRabbitMQ();
  channel.consume(queue, (msg) => {
    console.log('apuesta recibida');
    const apuesta = JSON.parse(msg.content.toString());
    const usuario = usuarios.find((u) => u.username === apuesta.usuario);
    if (usuario) {
      console.log(`Usuario ${usuario.username} ha realizado una apuesta de ${apuesta.montoApostado} en ${apuesta.partido}`);
      // Actualiza el saldo del usuario
      usuario.saldo -= apuesta.montoApostado;
      console.log(`Saldo restante para ${usuario.username}: ${usuario.saldo}`);
    }
    channel.ack(msg);
  });
}

consumirApuestas();

// Endpoint para obtener la lista de usuarios con sus saldos actualizados
app.get('/usuarios', (req, res) => {
  res.json(usuarios.map(u => ({
    username: u.username,
    saldo: u.saldo
  })));
});

app.listen(3001, () => {
  console.log('USER_api escuchando en el puerto 3001');
});
