const express = require('express');
const amqp = require('amqplib');

const app = express();
const queue = 'apuestas';
const exchange = 'apuestas_exchange';

const usuarios = [
  { username: 'Luis Cardenas', saldo: 500 },
  { username: 'usuario2', saldo: 500 },
  { username: 'usuario3', saldo: 500 },
  // Agrega más usuarios aquí
];

// Lista para almacenar las apuestas recibidas
let apuestasRecibidas = [];

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
    console.log('Apuesta recibida');
    const apuesta = JSON.parse(msg.content.toString());
    const usuario = usuarios.find((u) => u.username === apuesta.usuario);
    if (usuario) {
      console.log(`Usuario ${usuario.username} ha realizado una apuesta de ${apuesta.montoApostado} en ${apuesta.partido}`);
      usuario.saldo -= apuesta.montoApostado;
      console.log(`Saldo restante para ${usuario.username}: ${usuario.saldo}`);
      // Almacenar la apuesta recibida
      apuestasRecibidas.push(apuesta);
    }
    channel.ack(msg);
  });
}

consumirApuestas();

// Endpoint para verificar el estado de user_api
app.get('/estado', (req, res) => {
  // Aquí podrías implementar la lógica para verificar si user_api está activo o no
  // Por simplicidad, retornaremos un estado estático
  res.json({ estado: 'activo' }); // Cambiar a 'inactivo' cuando sea necesario
});

app.get('/usuarios', (req, res) => {
  res.json(usuarios.map(u => ({
    username: u.username,
    saldo: u.saldo
  })));
});

// Endpoint para obtener las apuestas recibidas
app.get('/apuestas', (req, res) => {
  res.json(apuestasRecibidas);
});

app.listen(3001, () => {
  console.log('USER_api escuchando en el puerto 3001');
});
