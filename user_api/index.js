const express = require('express');
const amqp = require('amqplib');

const app = express();
const queue = 'apuestas';
const delayedQueue = 'apuestas_delayed';
const exchange = 'apuestas_exchange';

const usuarios = [
  { username: 'usuario1', saldo: 100 },
  { username: 'usuario2', saldo: 200 },
  { username: 'usuario3', saldo: 200 },
  // Agrega más usuarios aquí
];

async function conectarRabbitMQ() {
  const conn = await amqp.connect('amqp://user_api:user_api@localhost');
  const channel = await conn.createChannel();

  await channel.assertExchange(exchange, 'direct', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'apuestas_key');

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
      usuario.saldo -= apuesta.montoApostado;
      console.log(`Saldo restante para ${usuario.username}: ${usuario.saldo}`);
    }
    channel.ack(msg);
  });
}

consumirApuestas();

app.get('/usuarios', (req, res) => {
  res.json(usuarios.map(u => ({
    username: u.username,
    saldo: u.saldo
  })));
});

app.listen(3001, () => {
  console.log('USER_api escuchando en el puerto 3001');
});
