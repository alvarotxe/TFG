const express = require('express');
const cors = require('cors');
require('dotenv').config()
const bodyParser = require('body-parser');
const { crearProyectos } = require('./controllers/proyectos');
const db = require('./database/configdb');
// Crear una aplicación de express
const app = express();

const router = express();
const corsOptions = {
    origin: '*',  // Permite todas las solicitudes de cualquier origen
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Permite los métodos que estás utilizando
    allowedHeaders: ['Content-Type', 'Authorization']  // Agrega encabezados adicionales si es necesario
};

app.use(bodyParser.json());
app.use(cors(corsOptions)); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//app.use('/api/usuarios', require('./routes/usuarios.js'));
app.use('/proyectos', require('./routes/proyectos.js'));
app.use('/operaciones', require('./routes/operaciones.js'));



// Abrir la aplicacíon en el puerto 3000
app.listen(process.env.PORT, () => {
    console.log('Servidor corriendo en el puerto ', process.env.PORT);
});