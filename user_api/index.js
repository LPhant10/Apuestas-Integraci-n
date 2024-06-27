//  Importa las bibliotecas express y amqplib (que se usa para trabajar con RabbitMQ

const express = require('express');
const amqp = require('amqplib');

const app = express();                                                                    // Crea una instancia de la aplicación Express.
const queue = 'apuestas';                                                                 // Define el nombre de la cola apuestas.
const exchange = 'apuestas_exchange';                                                     // Define el nombre del intercambio apuestas_exchange.


// Define una lista de usuarios con sus respectivos nombres de usuario y saldo inicial.
const usuarios = [     
  { username: 'Luis Cardenas', saldo: 500 },
  { username: 'usuario2', saldo: 500 },
  { username: 'usuario3', saldo: 500 },
  // Agrega más usuarios aquí
];

// Lista para almacenar las apuestas recibidas
let apuestasRecibidas = [];

// Define una función asíncrona conectarRabbitMQ que:
async function conectarRabbitMQ() {                                                       
  const conn = await amqp.connect('amqp://user_api:user_api@localhost');                  // Conecta a RabbitMQ usando las credenciales y la URL proporcionada.
  const channel = await conn.createChannel();                                             // Crea un canal de comunicación en RabbitMQ.

  await channel.assertExchange(exchange, 'direct', { durable: true });                    // Declara (crea) un intercambio de tipo direct con durabilidad.
  await channel.assertQueue(queue, { durable: true });                                    // Declara (crea) una cola con durabilidad.
  await channel.bindQueue(queue, exchange, 'apuestas_key');                               // Vincula la cola al intercambio usando la clave de enrutamiento apuestas_key.

  return channel;                                                                         // Retorna el canal creado.
}

// Define una función asíncrona consumirApuestas que:
async function consumirApuestas() {
  const channel = await conectarRabbitMQ();                                               // Obtiene un canal conectándose a RabbitMQ.
  channel.consume(queue, (msg) => {                                                       // Comienza a consumir mensajes de la cola apuestas.
    console.log('Apuesta recibida');                                                      // Al recibir un mensaje, se registra en la consola.
    const apuesta = JSON.parse(msg.content.toString());                                   // Parse el contenido del mensaje a un objeto JSON apuesta.
    const usuario = usuarios.find((u) => u.username === apuesta.usuario);                 // Busca el usuario que ha realizado la apuesta.

 //  Si el usuario existe, se registra la apuesta en la consola, se deduce el monto apostado del saldo del usuario y se registra el saldo restante en la consola.   
    if (usuario) {
      console.log(`Usuario ${usuario.username} ha realizado una apuesta de ${apuesta.montoApostado} en ${apuesta.partido}`);
      usuario.saldo -= apuesta.montoApostado;
      console.log(`Saldo restante para ${usuario.username}: ${usuario.saldo}`);

  // Almacenar la apuesta recibida
      apuestasRecibidas.push(apuesta);
    }
    channel.ack(msg);                                                                     // Acknowledge el mensaje para confirmar su recepción.
  });
}

consumirApuestas();                                                                      // Llama a la función consumirApuestas para iniciar la escucha de apuestas.

// Define un endpoint GET /estado que retorna el estado de user_api. Actualmente, siempre responde con { estado: 'activo' }.
// Endpoint para verificar el estado de user_api
app.get('/estado', (req, res) => {
  // Aquí podrías implementar la lógica para verificar si user_api está activo o no
  // Por simplicidad, retornaremos un estado estático
  res.json({ estado: 'activo' }); // Cambiar a 'inactivo' cuando sea necesario
});

// Define un endpoint GET /usuarios que retorna la lista de usuarios con sus nombres de usuario y saldos.
app.get('/usuarios', (req, res) => {
  res.json(usuarios.map(u => ({
    username: u.username,
    saldo: u.saldo
  })));
});

// Define un endpoint GET /apuestas que retorna la lista de apuestas recibidas.
// Endpoint para obtener las apuestas recibidas
app.get('/apuestas', (req, res) => {
  res.json(apuestasRecibidas);
});

// Inicia el servidor Express en el puerto 3001 y registra un mensaje en la consola indicando que user_api está escuchando en ese puerto.
app.listen(3001, () => {
  console.log('USER_api escuchando en el puerto 3001');
});
