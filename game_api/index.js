const express = require('express');
const amqp = require('amqplib');
const { DateTime } = require('luxon');

const app = express();
const exchange = 'apuestas_exchange';
const queue1m = 'apuestas_delayed_1m';
const queue10m = 'apuestas_delayed_10m';
const queue1h = 'apuestas_delayed_1h';
const queue1d = 'apuestas_delayed_1d';
const finalQueue = 'apuestas';

// Lista de usuarios con su saldo
const usuarios = [
  { username: 'usuario1', saldo: 100 },
  { username: 'usuario2', saldo: 200 },
  { username: 'usuario3', saldo: 200 }
  // Agrega más usuarios aquí si es necesario
];

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
      'x-message-ttl': 60000,
      'x-dead-letter-exchange': exchange,
      'x-dead-letter-routing-key': 'apuestas_10m'
    }
  });

  await channel.assertQueue(queue10m, {
    durable: true,
    arguments: {
      'x-message-ttl': 600000,
      'x-dead-letter-exchange': exchange,
      'x-dead-letter-routing-key': 'apuestas_1h'
    }
  });

  await channel.assertQueue(queue1h, {
    durable: true,
    arguments: {
      'x-message-ttl': 3600000,
      'x-dead-letter-exchange': exchange,
      'x-dead-letter-routing-key': 'apuestas_1d'
    }
  });

  await channel.assertQueue(queue1d, {
    durable: true,
    arguments: {
      'x-message-ttl': 86400000,
      'x-dead-letter-exchange': exchange,
      'x-dead-letter-routing-key': 'apuestas'
    }
  });

  await channel.assertQueue(finalQueue, {
    durable: true
  });

  // Enlace de las claves de enrutamiento a las colas
  await channel.bindQueue(queue1m, exchange, 'apuestas_1m');
  await channel.bindQueue(queue10m, exchange, 'apuestas_10m');
  await channel.bindQueue(queue1h, exchange, 'apuestas_1h');
  await channel.bindQueue(queue1d, exchange, 'apuestas_1d');
  await channel.bindQueue(finalQueue, exchange, 'apuestas');

  return channel;
}

// Función para obtener el saldo de un usuario
function obtenerSaldo(usuario) {
  const usuarioEncontrado = usuarios.find(u => u.username === usuario);
  return usuarioEncontrado ? usuarioEncontrado.saldo : null;
}

app.post('/apostar', async (req, res) => {
  const { partido, montoApostado, usuario } = req.body;
  const timestamp = DateTime.local().setZone('America/Lima').toFormat('yyyy-MM-dd HH:mm:ss'); // Hora de Lima con formato detallado
  console.log(`Apuesta enviada: Usuario: ${usuario}, Partido: ${partido}, Monto: ${montoApostado}, Hora: ${timestamp}`);

  // Buscar el usuario en la lista
  const usuarioExistente = usuarios.find(u => u.username === usuario);

  if (!usuarioExistente) {
    console.log(`Usuario ${usuario} no encontrado`);
    return res.status(404).send('Usuario no encontrado');
  }

  // Verificar saldo suficiente
  if (usuarioExistente.saldo < montoApostado) {
    console.log(`Usuario ${usuario} sin saldo suficiente`);
    return res.status(403).send('Usuario sin saldo suficiente');
  }

  const channel = await conectarRabbitMQ();
  const apuesta = { partido, montoApostado, usuario, timestamp };

  try {
    // Publica el mensaje en la cola de 1 minuto
    await channel.publish(exchange, 'apuestas_1m', Buffer.from(JSON.stringify(apuesta)));

    // Actualizar saldo del usuario
    usuarioExistente.saldo -= montoApostado;
    console.log(`Saldo restante para ${usuario}: ${usuarioExistente.saldo}`);

    res.send('Apuesta realizada');
  } catch (error) {
    console.error('Error al procesar la apuesta:', error.message);
    res.status(500).json({ error: 'Error al procesar la apuesta' });
  }
});

app.listen(3000, () => {
  console.log('GAME_api escuchando en el puerto 3000');
});
