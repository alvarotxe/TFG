const { Router } = require('express');
const path = require('path');
const { runOperation,getOperations,duplicarOperacion,eliminarTodasLasEntradas,runScript,crearOperacion,borrarOperacion,actualizarOperacion,getOperationById,saveOperationsToProject,getOperationsByProject,updateOperationsForProject,removeOperationsFromProject,getOperationsByProjects, saveOperations } = require('../controllers/operaciones');
const fs = require('fs');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, process.env.BASE_SCRIPTS_PATH);  // Define la carpeta donde se guardarán los archivos
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);  // Define el nombre único del archivo
    }
  });
  const upload = multer({ storage: storage });
const router = Router();

router.get('/oper', getOperations);
router.get('/operation/:id', getOperationById);
router.get('/proyecto/:projectId', getOperationsByProject);
router.get('/getP/:id', getOperationsByProjects);
router.get('/scripts/:filename/:name/:id', (req, res) => {
  const { filename, name, id } = req.params;
  // Construir la ruta completa al archivo
  const rutaDescarga = path.resolve(process.env.BASE_SCRIPTS_PATH,filename); // Usa path.resolve para obtener la ruta absoluta
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

router.post('/',upload.array('script_text',10),crearOperacion);
router.post('/execute-script',upload.array('script_text',10), runScript);
router.post('/run',runOperation);
router.post('/guardar',saveOperations);
router.post('/duplicar',duplicarOperacion);
router.post('/removeOperationsFromProject', removeOperationsFromProject);
router.post('/saveOperations',saveOperationsToProject);

router.put('/updateOperacion/:id',upload.array('script_text'),actualizarOperacion);
router.put('/update-order/:id',updateOperationsForProject);

router.delete('/delete/:id', eliminarTodasLasEntradas);
router.delete('/deleteOperacion/:id', borrarOperacion);


module.exports = router;