
// Obtener la conexión a la base de datos
const db = require('../database/configdb');
const fs = require('fs');
const path = require('path');

const crearProyectos = async (req, res) => {
  const { nombre, descripcion } = req.body;
  const archivos = req.files;

  if (!nombre || !descripcion) {
    return res.status(400).send('Todos los campos son requeridos.');
  }

  // Fecha de creación
  const fechaCreacion = new Date().toISOString();

  const sql = 'INSERT INTO proyectos (nombre, descripcion, archivo, last_modified) VALUES (?, ?, ?, ?)';
  const archivoNames = archivos.map(file => file.originalname).join(','); // Guardamos los nombres de los archivos separados por comas
  const values = [nombre, descripcion, archivoNames, fechaCreacion];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error al insertar el proyecto en la base de datos', err);
      return res.status(500).send('Error al guardar el proyecto');
    }
    const projectId = result.insertId;
    const carpetaNombre = `id${projectId}${nombre.charAt(0).toLowerCase()}`;
    const carpetaPath = path.join(process.env.BASE_PROJECTS_PATH, carpetaNombre);

    try {
      if (!fs.existsSync(carpetaPath)) {
        fs.mkdirSync(carpetaPath, { recursive: true });
      }

      archivos.forEach(file => {
        const archivoOrigen = file.path;
        const archivoDestino = path.join(carpetaPath, file.originalname);
        fs.renameSync(archivoOrigen, archivoDestino);
      });
      res.status(200).send({
        message: 'Proyecto creado con éxito',
        projectId: projectId,
        carpeta: carpetaPath,
      });
    } catch (error) {
      console.error('Error al crear la carpeta o mover los archivos:', error);
      return res.status(500).send('Error al crear la carpeta del proyecto');
    }
  });
};

const duplicarProyecto = async (req, res) => {
  const { id } = req.params;

  const sql = 'SELECT * FROM proyectos WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al buscar el proyecto original:', err);
      return res.status(500).send('Error al buscar el proyecto');
    }

    if (result.length === 0) {
      return res.status(404).send('Proyecto no encontrado');
    }
    const proyectoOriginal = result[0];

    // Crear un nuevo proyecto duplicado con el mismo nombre y descripción
    const nuevoNombre = proyectoOriginal.nombre + ' - Copy';
    const nuevoDescripcion = proyectoOriginal.descripcion;
    const archivos = proyectoOriginal.archivo.split(',');

    const fechaCreacion = new Date().toISOString();
    const sqlInsert = 'INSERT INTO proyectos (nombre, descripcion, archivo, last_modified) VALUES (?, ?, ?, ?)';
    const archivoNames = archivos.join(',');

    db.query(sqlInsert, [nuevoNombre, nuevoDescripcion, archivoNames, fechaCreacion], (err, result) => {
      if (err) {
        console.error('Error al insertar el proyecto duplicado:', err);
        return res.status(500).send('Error al guardar el proyecto duplicado');
      }

      const projectId = result.insertId;
      const carpetaNombre = `id${projectId}${nuevoNombre.charAt(0).toLowerCase()}`;
      const carpetaPath = path.join(process.env.BASE_PROJECTS_PATH, carpetaNombre);
      const carpetaProyectoOriginal = path.join(process.env.BASE_PROJECTS_PATH, `id${id}${proyectoOriginal.nombre.charAt(0).toLowerCase()}`);

      try {
        if (!fs.existsSync(carpetaPath)) {
          fs.mkdirSync(carpetaPath, { recursive: true });
        }

        // Obtener todos los archivos de la carpeta del proyecto original
        const archivosOriginales = fs.readdirSync(carpetaProyectoOriginal);

        // Copiar todos los archivos del proyecto original a la nueva carpeta
        archivosOriginales.forEach(file => {
          const archivoOrigen = path.join(carpetaProyectoOriginal, file);
          const archivoDestino = path.join(carpetaPath, file);
          fs.copyFileSync(archivoOrigen, archivoDestino); // Copiar archivo
        });

        // Duplicar las operaciones asociadas con este proyecto en la tabla proyecto_operacion
        const sqlOperaciones = 'SELECT * FROM proyecto_operacion WHERE id_proyecto = ?';
        db.query(sqlOperaciones, [id], (err, operaciones) => {
          if (err) {
            console.error('Error al obtener las operaciones del proyecto:', err);
            return res.status(500).send('Error al obtener las operaciones del proyecto');
          }

          // Insertar las operaciones para el nuevo proyecto
          const sqlInsertOperaciones = 'INSERT INTO proyecto_operacion (id_proyecto, id_operacion, entrada, salida, confi, activa, orden) VALUES (?, ?, ?, ?, ?, ?, ?)';
          operaciones.forEach(operacion => {
            db.query(sqlInsertOperaciones, [projectId, operacion.id_operacion, operacion.entrada, null, operacion.confi, operacion.activa, operacion.orden], (err, result) => {
              if (err) {
                console.error('Error al insertar operación duplicada:', err);
                return res.status(500).send('Error al insertar operaciones duplicadas');
              }
            });
          });
          res.status(200).send({
            message: 'Proyecto duplicado con éxito',
            projectId: projectId,
            carpeta: carpetaPath,
          });
        });
      } catch (error) {
        console.error('Error al crear la carpeta o copiar los archivos:', error);
        return res.status(500).send('Error al duplicar los archivos del proyecto');
      }
    });
  });
};

const getProyectos = async (req, res) => {
  const sql = 'SELECT id, nombre, descripcion, last_modified, archivo FROM proyectos';

  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error al obtener los proyectos de la base de datos', err);
      return res.status(500).send('Error al obtener los proyectos');
    }
    res.status(200).json(result);
  });
};

const getProyectoById = (req, res) => {
  const { id } = req.params;

  const sql = 'SELECT * FROM proyectos WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al obtener el proyecto', err);
      return res.status(500).send('Error al obtener el proyecto');
    }

    if (result.length === 0) {
      return res.status(404).send('Proyecto no encontrado');
    }
    const carpetaNombre = `id${id}${result[0].nombre.charAt(0).toLowerCase()}`;
    const inputFilesResolved = path.resolve(process.env.BASE_PROJECTS_PATH, carpetaNombre, '/', result[0].archivo);
    result[0].ruta = inputFilesResolved;
    res.status(200).json(result[0]);
  });
};

const actualizarProyecto = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, existingFiles, deletedFiles } = req.body;
  const archivos = req.files;

  if (!nombre || !descripcion) {
    return res.status(400).send('Todos los campos son requeridos.');
  }
  const archivosExistentes = existingFiles ? JSON.parse(existingFiles) : [];
  const archivosEliminados = deletedFiles ? JSON.parse(deletedFiles) : [];

  // Fecha de modificación
  const fechaModificacion = new Date().toISOString();

  const sqlGetProyecto = 'SELECT archivo, nombre FROM proyectos WHERE id = ?';
  db.query(sqlGetProyecto, [id], (err, result) => {
    if (err) {
      console.error('Error al obtener el proyecto para actualizarlo', err);
      return res.status(500).send('Error al obtener el proyecto');
    }

    if (result.length === 0) {
      return res.status(404).send('Proyecto no encontrado');
    }
    const proyecto = result[0];
    const carpetaNombre = `id${id}${proyecto.nombre.charAt(0).toLowerCase()}`;
    const carpetaPath = path.join(process.env.BASE_PROJECTS_PATH, carpetaNombre);

    let archivosActuales = proyecto.archivo ? proyecto.archivo.split(',') : [];

    // **Eliminar solo los archivos seleccionados por el usuario**
    archivosEliminados.forEach((archivo) => {
      const archivoPath = path.join(carpetaPath, archivo);
      if (fs.existsSync(archivoPath)) {
        fs.unlink(archivoPath, (err) => {
          if (err) {
            console.error(`Error al eliminar ${archivo}:`, err);
          }
        });
      }
      // Removerlo de la lista de archivos actuales
      archivosActuales = archivosActuales.filter((file) => file !== archivo);
    });

    // Agregar los nuevos archivos subidos
    const nuevosArchivos = archivos.map((file) => file.originalname);
    const archivosFinales = [...archivosActuales, ...nuevosArchivos].filter(Boolean); // Asegura que no haya valores vacíos

    const sqlUpdate = 'UPDATE proyectos SET nombre = ?, descripcion = ?, archivo = ?, last_modified = ? WHERE id = ?';
    const values = [nombre, descripcion, archivosFinales.join(','), fechaModificacion, id];
    db.query(sqlUpdate, values, (err, result) => {
      if (err) {
        console.error('Error al actualizar el proyecto en la base de datos', err);
        return res.status(500).send('Error al actualizar el proyecto');
      }

      // Mover los archivos nuevos a la carpeta del proyecto
      archivos.forEach((file) => {
        const archivoPath = file.path;
        const archivoDestinoPath = path.join(carpetaPath, file.originalname);
        fs.renameSync(archivoPath, archivoDestinoPath);
      });
      res.status(200).send({ message: 'Proyecto actualizado con éxito' });
    });
  });
};

const borrarProyecto = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).send('El ID del proyecto es requerido.');
  }
  const sql = 'SELECT nombre, archivo FROM proyectos WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al obtener el proyecto para eliminarlo', err);
      return res.status(500).send('Error al obtener el proyecto');
    }

    if (result.length === 0) {
      return res.status(404).send('Proyecto no encontrado');
    }
    const proyecto = result[0];
    const carpetaNombre = `id${id}${proyecto.nombre.charAt(0).toLowerCase()}`;
    const carpetaPath = path.join(process.env.BASE_PROJECTS_PATH, carpetaNombre);

    // Eliminar el archivo si existe
    if (proyecto.archivo) {
      const archivoPath = path.join(carpetaPath, proyecto.archivo);

      // Verificar si el archivo existe y eliminarlo
      fs.unlink(archivoPath, (err) => {
        if (err) {
          console.error('Error al eliminar el archivo:', err);
        }
      });
    }

    // Eliminar la carpeta del proyecto si existe
    fs.rm(carpetaPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Error al eliminar la carpeta:', err);
      }
    });

    const deleteSql = 'DELETE FROM proyectos WHERE id = ?';
    db.query(deleteSql, [id], (err, result) => {
      if (err) {
        console.error('Error al eliminar el proyecto en la base de datos', err);
        return res.status(500).send('Error al eliminar el proyecto');
      }

      // Verificar si se eliminó algún proyecto
      if (result.affectedRows === 0) {
        return res.status(404).send('Proyecto no encontrado');
      }
      res.status(200).send({ message: 'Proyecto y sus archivos eliminados con éxito' });
    });
  });
};

const buscarProyectos = (req, res) => {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Se requiere un término de búsqueda válido' });
  }

  const sqlQuery = `SELECT * FROM proyectos WHERE nombre LIKE ?`;
  const values = [`%${query}%`];
  db.query(sqlQuery, values, (err, results) => {
    if (err) {
      console.error('Error en la base de datos:', err);
      return res.status(500).json({ message: 'Error al buscar proyectos en la base de datos' });
    }
  
    const cleanedResults = results.map(row => ({
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      last_modified: row.last_modified,
      archivo: row.archivo || null
    }));

    if (cleanedResults.length === 0) {
      return res.status(404).json({ message: 'No se encontraron proyectos' });
    }
    return res.json(cleanedResults);
  });
};

module.exports = {crearProyectos,
  getProyectos,
  getProyectoById,
  actualizarProyecto,
  duplicarProyecto,
  borrarProyecto,
  buscarProyectos
};
