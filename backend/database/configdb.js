require('dotenv').config(); // Asegúrate de instalar dotenv con `npm install dotenv`

const mysql = require('mysql');

// Configuración de conexión con variables separadas
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
});

connection.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos: ' + err.stack);
        return;
    }
    console.log('Conectado a la base de datos con el ID ' + connection.threadId);
});

module.exports = connection;


