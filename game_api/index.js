const express = require('express');
const amqp = require('amqplib');

const app = express();
const exchange = 'apuestas_exchange';
const queue1m = 'apuestas_delayed_1m'; // Nueva cola de 1 minuto
const queue10m = 'apuestas_delayed_10m';
const queue1h = 'apuestas_delayed_1h';
const queue1d = 'apuestas_delayed_1d';
const finalQueue = 'apuestas';

// Middleware para analizar los cuerpos JSON
app.use(express.json());

async function conectarRabbitMQ() {
  const conn = await amqp.connect('amqp://game_api:game_api@localhost');
  const channel = await conn.createChannel();

  await channel.assertExchange(exchange, 'direct', { durable: true });

  // Configuración de las colas
  await channel.assertQueue(queue1m, {
    durable: true,
    arguments: {
      'x-message-ttl': 60000, // 1 minuto en milisegundos
      'x-dead-letter-exchange': exchange,
      'x-dead-letter-routing-key': 'apuestas_10m' // Si no se consume, pasa a apuestas_delayed_10m
    }
  });

  await channel.assertQueue(queue10m, {
    durable: true,
    arguments: {
      'x-message-ttl': 600000, // 10 minutos en milisegundos
      'x-dead-letter-exchange': exchange,
      'x-dead-letter-routing-key': 'apuestas_1h'
    }
  });

  await channel.assertQueue(queue1h, {
    durable: true,
    arguments: {
      'x-message-ttl': 3600000, // 1 hora en milisegundos
      'x-dead-letter-exchange': exchange,
      'x-dead-letter-routing-key': 'apuestas_1d'
    }
  });

  await channel.assertQueue(queue1d, {
    durable: true,
    arguments: {
      'x-message-ttl': 86400000, // 1 día en milisegundos
      'x-dead-letter-exchange': exchange,
      'x-dead-letter-routing-key': 'apuestas'
    }
  });

  await channel.assertQueue(finalQueue, {
    durable: true
  });

  // Enlace de las claves de enrutamiento a las colas
  await channel.bindQueue(queue1m, exchange, 'apuestas_1m'); // Clave de enrutamiento para 1 minuto
  await channel.bindQueue(queue10m, exchange, 'apuestas_10m');
  await channel.bindQueue(queue1h, exchange, 'apuestas_1h');
  await channel.bindQueue(queue1d, exchange, 'apuestas_1d');
  await channel.bindQueue(finalQueue, exchange, 'apuestas');

  return channel;
}

app.post('/apostar', async (req, res) => {
  const { partido, montoApostado, usuario } = req.body;
  console.log('apuesta enviada');
  const channel = await conectarRabbitMQ();
  const apuesta = { partido, montoApostado, usuario };

  // Publica el mensaje en la cola de 1 minuto
  await channel.publish(exchange, 'apuestas_1m', Buffer.from(JSON.stringify(apuesta)));
  res.send('Apuesta realizada');
});

app.listen(3000, () => {
  console.log('GAME_api escuchando en el puerto 3000');
});
