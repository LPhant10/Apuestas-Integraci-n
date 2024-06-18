const express = require('express');
const amqp = require('amqplib');

const app = express();
const queue = 'apuestas';

// Middleware para analizar los cuerpos JSON
app.use(express.json());

async function conectarRabbitMQ() {
  const conn = await amqp.connect('amqp://game_api:game_api@localhost');
  const channel = await conn.createChannel();
  await channel.assertQueue(queue, { durable: true });
  return channel;
}

app.post('/apostar', async (req, res) => {
  const { partido, montoApostado, usuario } = req.body;
  console.log('apuesta enviada');
  const channel = await conectarRabbitMQ();
  const apuesta = { partido, montoApostado, usuario };
  await channel.sendToQueue(queue, Buffer.from(JSON.stringify(apuesta)));
  res.send('Apuesta realizada');
});

app.listen(3000, () => {
  console.log('GAME_api escuchando en el puerto 3000');
});