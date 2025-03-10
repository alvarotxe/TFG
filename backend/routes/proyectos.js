const { Router } = require('express');
const { crearProyectos,getProyectos,getProyectoById, actualizarProyecto, borrarProyecto, buscarProyectos } = require('../controllers/proyectos');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null,'../',process.env.BASE_PROJECTS_PATH);  // Define la carpeta donde se guardarán los archivos
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);  // Define el nombre único del archivo
    }
  });
  const upload = multer({ storage: storage });

const router = Router();


router.get('/proyecto', getProyectos);
router.get('/p/:id', getProyectoById);
router.get('/download/:filename/:name/:id', (req, res) => {
  const { filename, name, id } = req.params;
  // Construir el nombre de la carpeta
  const carpetaNombre = `id${id}${name.charAt(0).toLowerCase()}`;
  // Construir la ruta completa al archivo
  const rutaDescarga = path.resolve(__dirname, '../../proyectos', carpetaNombre, filename); // Usa path.resolve para obtener la ruta absoluta
  console.log('Ruta del archivo:', rutaDescarga);
  // Comprobar si el archivo existe antes de enviarlo
  fs.stat(rutaDescarga, (err, stats) => {
    if (err || !stats.isFile()) {
      console.log('Error al encontrar el archivo:', err);
      return res.status(404).send('Archivo no encontrado');
    }
    // Aquí puedes especificar el nombre real del archivo en la descarga
    const realFileName = filename; // Este es el nombre real del archivo que se encuentra en la ruta
    // Enviar el archivo con el nombre real
    res.download(rutaDescarga, realFileName, (err) => {
      if (err) {
        console.log('Error al enviar el archivo:', err);
        res.status(404).send('Error al enviar el archivo');
      }
    });
  });
});

router.post('/', upload.array('archivo[]',5), crearProyectos);
router.get('/buscar', buscarProyectos);

router.put('/updateProyecto/:id',upload.array('archivo[]'), actualizarProyecto);

router.delete('/deleteProyecto/:id', borrarProyecto);

module.exports = router;