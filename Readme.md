# 1. Corremos este comando con el Docker abierto para crear el Contenedor

docker run -d -p 15672:15672 -p 5672:5672 --name some-rabbit rabbitmq:3-management

# 2. Ingresamos a RABBITMQ en la web

username: guest
password: guest

# 3. Creamos Usuarios para los servicios:

> Add a user: user_api

username:   user_api
password:   user_api
conf pass:  user_api

tags: administrator

permisos: set permission

> Add a user: game_api

username:   game_api
password:   game_api
conf pass:  game_api

tags: administrator

permisos: set permission

# 4. Ejecutar los Servicios

abrir 2 terminales en simultaneo: game_api y user_api y colocamos el siguiente comando.

node index.js

# 5. Pruebas en POSTMAN

> Crea una nueva solicitud POST. 
> En la URL, ingresa http://localhost:3000/apostar 
> Haz clic en la pestaña "Body" debajo de la URL. 
> Selecciona "raw" y elige el formato "JSON" en el menú desplegable a la derecha. 
> En el área de texto, ingresa el siguiente JSON:

    {
      "partido": "Equipo A vs Equipo B",
      "montoApostado": 50,
      "usuario": "usuario1"
    }

> Haz clic en el botón "Send" para enviar la solicitud.

# 6. Pruebas en Postman con Colas

 apagamos el servicio de user_api, pero dejar corriendo  game_api, enviar apuestas, luego activar de nuevo el servicio de user_api
 tienen que entrar las apuestas enviadas y decir "apuesta recibida" de las que se encontraban en cola.

 Las apuestas enviadas en cola se pueden observar en RABBITMQ. > Queues and Streams

link http://localhost:3000/apostar 
link http://localhost:3001/users 
