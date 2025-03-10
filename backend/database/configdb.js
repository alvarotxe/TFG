const mysql = require('mysql');

// Configuración de la conexión a la base de datos

    const connection = mysql.createConnection(process.env.DBCON);

    connection.connect(function(err) {
        if (err) {
          console.error('Error conectando a la base de datos: ' + err.stack);
          return;
        }
        console.log('Conectado a la base de datos con el ID ' + connection.threadId);
      });


module.exports = connection;

