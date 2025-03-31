const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../database/configdb');

const crearOperacion = async (req, res) => {
    const { operacion, descripcion, entradas, salidas, confi } = req.body;
    console.log(req.body);
    const archivos = req.files || [];
    console.log(archivos)
    if (!operacion || !descripcion) {
        return res.status(400).send('Todos los campos son requeridos.');
    }

    const carpetaPath = path.join(process.env.BASE_SCRIPTS_PATH);
    if (!fs.existsSync(carpetaPath)) {
        fs.mkdirSync(carpetaPath, { recursive: true });
    }

    let archivosGuardados = [];

    for (const file of archivos) {
        let ext = path.extname(file.originalname);
        let base = path.basename(file.originalname, ext);
        let nuevoNombre = `${base}${ext}`;
        let archivoDestino = path.join(carpetaPath, nuevoNombre);

        archivosGuardados.push(`${nuevoNombre}`);
       
    }

    const sql = 'INSERT INTO operaciones (operacion, descripcion, script_text, entradas, salidas, confi) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [operacion, descripcion, archivosGuardados.join(','), entradas, salidas, confi];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error al insertar en la base de datos:', err);
            return res.status(500).send('Error al guardar en la base de datos');
        }

        res.status(200).send({
            message: 'Operación creada con éxito',
            archivos: archivosGuardados
        });
    });
};

const actualizarOperacion = async (req, res) => {
    const { id } = req.params;
    const { operacion, descripcion, existingFiles, deletedFiles, entradas, salidas } = req.body;
    const archivos = req.files || [];

    if (!operacion || !descripcion) {
        return res.status(400).send('Todos los campos son requeridos.');
    }

    // Convertir `existingFiles` y `deletedFiles` a arrays si existen
    const archivosExistentes = existingFiles ? JSON.parse(existingFiles) : [];
    const archivosEliminados = deletedFiles ? JSON.parse(deletedFiles) : [];

    const carpetaPath = path.join(process.env.BASE_SCRIPTS_PATH);

    try {
        // 1️⃣ Obtener los archivos actuales de la base de datos
        const sqlGetOperacion = 'SELECT script_text FROM operaciones WHERE id = ?';
        db.query(sqlGetOperacion, [id], async (err, result) => {
            if (err) {
                console.error('Error al obtener la operación para actualizarla', err);
                return res.status(500).send('Error al obtener la operación');
            }

            if (result.length === 0) {
                return res.status(404).send('Operación no encontrada');
            }

            let archivosActuales = result[0].script_text ? result[0].script_text.split(',') : [];

            // 2️⃣ Eliminar los archivos seleccionados por el usuario
            for (const archivo of archivosEliminados) {
                const archivoPath = path.join(carpetaPath, path.basename(archivo));
                try {
                    await fs.promises.rm(archivoPath, { force: true });
                    console.log(`Archivo eliminado: ${archivoPath}`);
                } catch (error) {
                    console.warn(`No se pudo eliminar el archivo: ${archivoPath}. Puede que no exista.`);
                }
                // Remover de la lista de archivos actuales
                archivosActuales = archivosActuales.filter((file) => file !== archivo);
            }

            // 3️⃣ Agregar los nuevos archivos subidos
            let archivosGuardados = [];
            for (const file of archivos) {
                let ext = path.extname(file.originalname); // Obtener la extensión
                let base = path.basename(file.originalname, ext); // Nombre sin extensión
            
                // Obtener todos los archivos en la carpeta
                let archivosEnCarpeta = fs.readdirSync(carpetaPath);
                
                // Generar el nuevo nombre con el número correcto
                let nuevoNombre = `${base}${ext}`;
                let archivoDestino = path.join(carpetaPath, nuevoNombre);
            
                try {
                    await fs.promises.copyFile(file.path, archivoDestino);
                    
            
                    archivosGuardados.push(nuevoNombre);
                } catch (error) {
                    console.error('Error al mover el archivo:', error);
                }
            }
            

            // 4️⃣ Fusionar archivos existentes con los nuevos
            const archivosFinales = [...archivosActuales, ...archivosGuardados].filter(Boolean);

            // 5️⃣ Actualizar la base de datos con la nueva información
            const sqlUpdate = 'UPDATE operaciones SET operacion = ?, descripcion = ?, script_text = ?, entradas = ?, salidas = ? WHERE id = ?';
            const values = [operacion, descripcion, archivosFinales.join(','), entradas, salidas, id];

            db.query(sqlUpdate, values, (err, result) => {
                if (err) {
                    console.error('Error al actualizar la operación en la base de datos', err);
                    return res.status(500).send('Error al actualizar la operación');
                }

                res.status(200).send({ message: 'Operación actualizada con éxito', archivos: archivosFinales });
            });
        });
    } catch (error) {
        console.error('Error inesperado al actualizar la operación:', error);
        res.status(500).send('Error inesperado al actualizar la operación');
    }
};

const borrarOperacion = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).send('El ID de la operación es requerido.');
    }

    try {
        // 1️⃣ Buscar la operación en la base de datos
        const sql = 'SELECT script_text FROM operaciones WHERE id = ?';
        db.query(sql, [id], async (err, result) => {
            if (err) {
                console.error('Error al obtener la operación para eliminarla', err);
                return res.status(500).send('Error al obtener la operación');
            }

            if (result.length === 0) {
                return res.status(404).send('Operación no encontrada');
            }

            const archivos = result[0].script_text ? result[0].script_text.split(',') : [];
            const carpetaPath = path.join(process.env.BASE_SCRIPTS_PATH);

            // 2️⃣ Eliminar cada archivo relacionado con la operación
            for (const archivo of archivos) {
                const archivoPath = path.join(carpetaPath, path.basename(archivo));

                try {
                    await fs.promises.rm(archivoPath, { force: true });
                    console.log(`Archivo eliminado: ${archivoPath}`);
                } catch (error) {
                    console.warn(`No se pudo eliminar el archivo: ${archivoPath}. Puede que no exista.`);
                }
            }

            // 3️⃣ Eliminar la operación de la base de datos
            const deleteSql = 'DELETE FROM operaciones WHERE id = ?';
            db.query(deleteSql, [id], (err, result) => {
                if (err) {
                    console.error('Error al eliminar la operación en la base de datos', err);
                    return res.status(500).send('Error al eliminar la operación');
                }

                if (result.affectedRows === 0) {
                    return res.status(404).send('Operación no encontrada');
                }

                res.status(200).send({ message: 'Operación y sus archivos eliminados con éxito' });
            });
        });
    } catch (error) {
        console.error('Error inesperado al eliminar la operación:', error);
        res.status(500).send('Error inesperado al eliminar la operación');
    }
};

const duplicarOperacion = async (req, res) => {
    const operacion = req.body; // Recibimos toda la operación desde el body
    console.log(operacion);
    const {id_proyecto} = operacion;
    if (!id_proyecto || !operacion.id) {
      return res.status(400).send('La operación con id_proyecto y id_operacion es requerida.');
    }
    
    const idProyecto = operacion.id_proyecto;
    const idOperacion = operacion.id;
  
    // Paso 1: Obtener el máximo valor de "orden" de las operaciones existentes
    const maxOrdenSql = 'SELECT MAX(orden) AS maxOrden FROM proyecto_operacion WHERE id_proyecto = ?';
    db.query(maxOrdenSql, [idProyecto], (err, maxResult) => {
      if (err) {
        console.error('Error al obtener el orden máximo:', err);
        return res.status(500).send('Error al obtener el orden máximo');
      }
  
      // Paso 2: Asignar el siguiente orden (evitando añadir un número extra)
      const siguienteOrden = maxResult[0].maxOrden + 1;
  
      // Paso 3: Insertar la nueva operación duplicada con el siguiente orden
      const insertSql = 'INSERT INTO proyecto_operacion (id_proyecto, id_operacion, entrada, salida, confi, activa, orden) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const values = [idProyecto, idOperacion, operacion.entrada, operacion.salida, operacion.confi, 0, siguienteOrden];
  
      db.query(insertSql, values, (err, result) => {
        if (err) {
          console.error('Error al duplicar la operación:', err);
          return res.status(500).send('Error al duplicar la operación');
        }
  
        res.status(200).send({
          message: 'Operación duplicada con éxito',
        });
      });
    });
  };
  



async function getOperations(req, res) {
    try {

        // Consulta SQL para obtener las operaciones de la tabla "operaciones"
        const sql = 'SELECT id, operacion, descripcion, script_text, entradas, salidas, confi FROM operaciones';

        db.query(sql, (err, results) => {
            if (err) {
                console.error('Error al obtener las operaciones de la base de datos:', err);
                return res.status(500).json({ error: 'Error al obtener las operaciones' });
            }

            // Verificar si hay resultados
            if (results.length === 0) {
                return res.status(404).json({ error: 'No se encontraron operaciones' });
            }

            // Responder con las operaciones obtenidas de la base de datos
            res.json(results);
        });
    } catch (error) {
        console.error('Error al obtener las operaciones:', error);
        res.status(500).json({ error: 'Error al obtener las operaciones' });
    }
}

const getOperationById = (req, res) => {
    const { id } = req.params;
  
    const sql = 'SELECT * FROM operaciones WHERE id = ?';
    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error('Error al obtener la operacion', err);
        return res.status(500).send('Error al obtener la operacion');
      }
  
      if (result.length === 0) {
        return res.status(404).send('Operacion no encontrada');
      }
      
      res.status(200).json(result[0]); // Devolver el primer elemento (único proyecto)
    });
};

// Obtener las operaciones asociadas a un proyecto
async function getOperationsByProject(req, res) {
    const proyectoId = req.params.projectId;
    
    try {
        // Consulta SQL para obtener las operaciones asociadas a un proyecto específico
        const sql = `
            SELECT o.id, o.operacion, o.descripcion, o.script_text, o.entradas, o.salidas, o.confi
            FROM operaciones o
            JOIN proyecto_operacion po ON o.id = po.id_operacion
            WHERE po.id_proyecto = ?
        `;

        db.query(sql, [proyectoId], (err, results) => {
            if (err) {
                console.error('Error al obtener las operaciones asociadas al proyecto:', err);
                return res.status(500).json({ error: 'Error al obtener las operaciones' });
            }

            // Verificar si hay resultados
            if (results.length === 0) {
                return res.status(404).json({ error: 'No se encontraron operaciones asociadas a este proyecto' });
            }

            // Responder con las operaciones obtenidas de la base de datos
            res.json(results);
        });
    } catch (error) {
        console.error('Error al obtener las operaciones:', error);
        res.status(500).json({ error: 'Error al obtener las operaciones' });
    }
}

async function getOperationsByProjects(req, res) {
    const proyectoId = req.params.id;
    
    try {
        // Consulta SQL para obtener las operaciones asociadas a un proyecto específico
        const sql = `
            SELECT id, id_operacion, entrada, salida, confi, activa, orden
            FROM proyecto_operacion 
            WHERE id_proyecto = ?
            ORDER BY orden ASC
        `;

        db.query(sql, [proyectoId], (err, results) => {
            if (err) {
                console.error('Error al obtener las operaciones asociadas al proyecto:', err);
                return res.status(500).json({ error: 'Error al obtener las operaciones' });
            }

            // Verificar si hay resultados
            if (results.length === 0) {
                return res.status(404).json({ error: 'No se encontraron operaciones asociadas a este proyecto' });
            }

            // Responder con las operaciones obtenidas de la base de datos
            res.json(results);
        });
    } catch (error) {
        console.error('Error al obtener las operaciones:', error);
        res.status(500).json({ error: 'Error al obtener las operaciones' });
    }
}

// Función para guardar las operaciones seleccionadas en la tabla 'proyecto_operacion'
async function saveOperationsToProject(req, res) {
    // Verificar que req.body tenga datos antes de acceder
    if (!req.body || req.body.length === 0) {
        return res.status(400).json({ error: 'No se han proporcionado operaciones para guardar' });
    }

    // Extraemos el id del proyecto del primer objeto en el body
    const projectId = req.body[0].id_proyecto;
    if (!projectId) {
        return res.status(400).json({ error: 'Falta el id del proyecto' });
    }

    // Obtener las operaciones que ya están asociadas al proyecto
    const existingOperationsQuery = `SELECT id_operacion FROM proyecto_operacion WHERE id_proyecto = ${projectId}`;

    try {
        // Ejecutar la consulta para obtener las operaciones ya asociadas al proyecto
        db.query(existingOperationsQuery, (err, existingOperations) => {
            if (err) {
                console.error('Error al obtener las operaciones existentes:', err);
                return res.status(500).json({ error: 'Error al consultar las operaciones existentes' });
            }

            // Eliminar las operaciones ya asociadas al proyecto
            const deleteOperationsQuery = `DELETE FROM proyecto_operacion WHERE id_proyecto = ${projectId}`;
            
            db.query(deleteOperationsQuery, (err, result) => {
                if (err) {
                    console.error('Error al eliminar las operaciones existentes:', err);
                    return res.status(500).json({ error: 'Error al eliminar las operaciones existentes' });
                }

                // Crear un conjunto de id_operacion que ya están asociadas
                const operationsToInsert = req.body;  // Ya las operaciones que quieres insertar

                // Obtener el último orden asociado al proyecto (si existe)
                const lastOrderQuery = `SELECT MAX(orden) as last_order FROM proyecto_operacion WHERE id_proyecto = ${projectId}`;

                db.query(lastOrderQuery, (err, result) => {
                    if (err) {
                        console.error('Error al obtener el último orden:', err);
                        return res.status(500).json({ error: 'Error al consultar el último orden' });
                    }

                    let lastOrder = result[0].last_order || 0; // Si no hay operaciones, empezar desde 0

                    // Construir la consulta SQL para insertar las operaciones con el orden secuencial y el count
                    const insertQueries = [];
                    operationsToInsert.forEach((operation) => {
                        
                        // Insertar la operación "count" veces
                        for (let i = 0; i < operation.count; i++) {
                            lastOrder++;  // Incrementar el orden antes de asignarlo a la siguiente operación
                            const archivoArray = Array.isArray(operation.archivo) ? operation.archivo : [operation.archivo];
                            const archivoJSON = JSON.stringify(archivoArray);
                            insertQueries.push({
                                id_proyecto: projectId,
                                id_operacion: operation.id_operacion,
                                nombre_operacion: operation.nombre_operacion,
                                archivo: archivoJSON,  // Si no hay archivo, se guarda como NULL
                                orden: lastOrder,  // Asignar el nuevo orden
                                confi: operation.confi
                            });
                        }
                    });
                    
                    // Construir la consulta de inserción
                    const sql = `INSERT INTO proyecto_operacion (id_proyecto, id_operacion, entrada, salida, confi, activa, orden)
                                VALUES
                                ${insertQueries.map(op => `(${op.id_proyecto}, ${op.id_operacion}, '${op.archivo}', 'null', '${op.confi}', 0, ${op.orden})`).join(', ')}`;

                    // Ejecutar la consulta SQL para insertar las operaciones
                    db.query(sql, (err, results) => {
                        if (err) {
                            console.error('Error al guardar las operaciones:', err);
                            return res.status(500).json({ error: 'Error al guardar las operaciones en la base de datos' });
                        }

                        // Si la inserción es exitosa, responder con éxito
                        res.json({
                            message: 'Operaciones guardadas correctamente',
                            inserted: results.affectedRows,
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error al procesar las operaciones:', error);
        res.status(500).json({ error: 'Error al procesar las operaciones' });
    }
}





async function removeOperationsFromProject(req, res) {
    const projectId = req.body.projectId;
    
    const operationsToRemove = req.body.operationsToRemove; // Un array de IDs de las operaciones a eliminar

    if (!projectId || !operationsToRemove || operationsToRemove.length === 0) {
        return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const sql = `DELETE FROM proyecto_operacion WHERE id_proyecto = ? AND id_operacion IN (?)`;

    try {
        db.query(sql, [projectId, operationsToRemove], (err, results) => {
            if (err) {
                console.error('Error al eliminar las operaciones:', err);
                return res.status(500).json({ error: 'Error al eliminar las operaciones de la base de datos' });
            }

            res.json({
                message: 'Operaciones eliminadas correctamente',
                affectedRows: results.affectedRows
            });
        });
    } catch (error) {
        console.error('Error al eliminar las operaciones:', error);
        res.status(500).json({ error: 'Error al procesar la eliminación de operaciones' });
    }
}

async function updateOperationsForProject(req, res) {
    const projectId = req.params.id;
    const updatedOperations = req.body.operations;

    if (!projectId || !updatedOperations || updatedOperations.length === 0) {
        return res.status(400).json({ error: 'Faltan parámetros o no se proporcionaron operaciones para actualizar' });
    }

    try {
        const projectIdInt = parseInt(projectId, 10);

        // Agrupar por id_operacion y obtener TODOS los IDs disponibles en la BD para cada id_operacion
        const operationIdsMap = {};  // Guardará { id_operacion: [lista de IDs] }

        for (const operation of updatedOperations) {
            const { id_operacion } = operation;

            if (!id_operacion) {
                return res.status(400).json({ error: 'Falta el ID de la operación' });
            }

            // Si ya tenemos los IDs de esta operación, no los buscamos otra vez
            if (!operationIdsMap[id_operacion]) {
                const getIdSql = `
                    SELECT id FROM proyecto_operacion
                    WHERE id_proyecto = ? AND id_operacion = ?
                    ORDER BY id ASC;
                `;

                const ids = await new Promise((resolve, reject) => {
                    db.query(getIdSql, [projectIdInt, id_operacion], (err, results) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results.map(row => row.id));  // Guardamos todos los IDs en orden
                        }
                    });
                });

                if (ids.length === 0) {
                    return res.status(404).json({ error: `Operación no encontrada con id_operacion=${id_operacion}` });
                }

                operationIdsMap[id_operacion] = ids;  // Guardamos los IDs disponibles
            }
        }
        console.log(updatedOperations);
        // Ahora recorremos updatedOperations y asignamos el ID correcto de la base de datos
        for (const operation of updatedOperations) {
            const { id_operacion, entradaValue, confi, active, orden, positionIndex } = operation;

            // Obtener el ID correcto (tomamos el primero disponible y lo eliminamos de la lista)
            const idList = operationIdsMap[id_operacion];
            const id = idList.shift();  // Sacamos el primer ID de la lista

            if (!id) {
                return res.status(404).json({ error: `No hay más registros disponibles para id_operacion=${id_operacion}` });
            }

            const entrada = Array.isArray(entradaValue) ? entradaValue : [entradaValue];
            const entradaJSON = JSON.stringify(entrada);

            // Actualizar la operación
            const updateSql = `
                UPDATE proyecto_operacion
                SET 
                    entrada = COALESCE(?, entrada),
                    confi = COALESCE(?, confi),
                    activa = COALESCE(?, activa),
                    orden = COALESCE(?, orden),
                    positionIndex = COALESCE(?, positionIndex)
                WHERE id = ? AND id_proyecto = ?;
            `;

            

            await new Promise((resolve, reject) => {
                db.query(updateSql, [entradaJSON, confi, active, orden, positionIndex, id, projectIdInt], (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
        }

        res.json({ message: 'Operaciones actualizadas correctamente' });

    } catch (error) {
        res.status(500).json({ error: error.message || 'Error al actualizar las operaciones' });
    }
}







function queryAsync(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

async function saveOperations(req, res) {
    try {
        let operaciones = req.body;

        // Validar que se haya recibido un arreglo de operaciones
        if (!Array.isArray(operaciones) || operaciones.length === 0) {
            return res.status(400).json({ error: 'No se enviaron operaciones a actualizar' });
        }

        // Primero, agrupamos las operaciones adicionales por id interno y nombre
        let groupedOperations = {};

        // Iterar sobre las operaciones
        for (let op of operaciones) {
            const { id_proyecto, id_operacion, entradaValue, confi, active, id, nombre, isMainRow } = op;

            // Validar que exista id_proyecto
            if (!id_proyecto) {
                console.log('Falta id_proyecto en la operación:', op);
                continue; // Salta esta operación
            }

            // Ignorar operaciones que no tienen entradaValue o es vacío
            if (!entradaValue || entradaValue.length === 0) {
                continue; // Salta esta operación
            }
            // Si la operación tiene un id_operacion (es la principal)
            if (id_proyecto) {
                // Consultar los IDs internos de la operación para el id_proyecto y id_operacion
                const getIdSql = `
                    SELECT id FROM proyecto_operacion
                    WHERE id_proyecto = ? AND id_operacion = ?
                    ORDER BY id DESC;
                `;

                const ids = await new Promise((resolve, reject) => {
                    db.query(getIdSql, [id_proyecto, id_operacion], (err, results) => {
                        if (err) {
                            console.error("Error al obtener los IDs:", err);
                            reject(err);
                        } else {
                            resolve(results.map(row => row.id));  // Mapeamos todos los IDs internos
                        }
                    });
                });

                if (ids.length === 0) {
                    return res.status(404).json({ error: `Operación no encontrada con id_operacion=${id_operacion}` });
                }

                // Actualizamos las operaciones principales
                for (let i = 0; i < ids.length && isMainRow; i++) {
                    
                    const dbId = ids[i];
                    
                    
                    if (dbId !== id) {
                        console.log(`Saltando actualización para el ID interno ${dbId}, no coincide con el ID recibido`);
                        continue; // Saltamos esta iteración si los IDs no coinciden
                    }
                    
                    
                    console.log(entradaValue);
                    const entradaLimpiaFinal = Array.isArray(entradaValue)
                    ? [...new Set(entradaValue.filter(item => item != null && item !== ''))]
                    : [];
                   
                    
                    // Obtener la operación principal (configuración activa)
                    const configActive = operaciones.filter(op => op.isMainRow && op.id === dbId);

                    // Si no hay ninguna operación principal, continuar
                    if (configActive.length === 0) {
                        console.log('No se encontró una operación principal.');
                        continue;
                    }

                    // Asumimos que solo hay una operación principal en configActive
                    const mainOp = configActive[0];  // Accedemos al primer elemento del array

                    // Ahora podemos acceder a confi y active
                    const configuracion = mainOp.confi;
                    const Active = mainOp.active;
                    
                    // Realizar el UPDATE solo para el ID específico
                    const updateQuery = `
                        UPDATE proyecto_operacion
                        SET entrada = ?, confi = ?, activa = ?
                        WHERE id = ? AND id_proyecto = ?;
                    `;
                    const values = [JSON.stringify(entradaLimpiaFinal), configuracion, Active, dbId, id_proyecto];

                    // Ejecutar el UPDATE en la base de datos
                    await new Promise((resolve, reject) => {
                        db.query(updateQuery, values, (err, results) => {
                            if (err) {
                                console.error("Error en la actualización:", err);
                                reject(err);
                            } else {
                                resolve(results);
                            }
                        });
                    });
                }
            } else {
                // Si la operación no tiene id_operacion (es una fila adicional), la agrupamos
                // Agrupar por id interno y nombre
                if (!groupedOperations[nombre]) {
                    groupedOperations[nombre] = [];
                }

                // Agregar la operación adicional a su grupo correspondiente
                groupedOperations[nombre].push({ id, entradaValue });
            }
        }

        // Ahora, para cada grupo de operaciones adicionales, debemos agregar sus entradaValue a la operación principal
        for (let nombre in groupedOperations) {
            const operacionesAdicionales = groupedOperations[nombre];

            // Buscar la operación principal correspondiente (por nombre)
            const opPrincipal = operaciones.find(op => op.nombre === nombre && op.id_operacion);
            console.log(opPrincipal);
            if (opPrincipal) {
                // Obtenemos el id_operacion de la operación principal
                const { id_operacion, id_proyecto, entradaValue, confi, activa } = op;

                // Agrupar todas las entradaValue de la operación principal y las adicionales
                let allEntradaValues = new Set(entradaValue);

                // Agregar los entradaValue de las operaciones adicionales
                for (let adicional of operacionesAdicionales) {
                    adicional.entradaValue.forEach(val => allEntradaValues.add(val));
                }

                // Convertimos el Set en un array de valores únicos
                const entradaLimpiaFinal = Array.from(allEntradaValues);

                // Actualizar la operación principal con los nuevos valores de entrada
                const getIdSql = `
                    SELECT id FROM proyecto_operacion
                    WHERE id_proyecto = ? AND id_operacion = ?
                    ORDER BY id DESC;
                `;

                const ids = await new Promise((resolve, reject) => {
                    db.query(getIdSql, [id_proyecto, id_operacion], (err, results) => {
                        if (err) {
                            console.error("Error al obtener los IDs:", err);
                            reject(err);
                        } else {
                            resolve(results.map(row => row.id));  // Mapeamos todos los IDs internos
                        }
                    });
                });

                if (ids.length === 0) {
                    return res.status(404).json({ error: `Operación no encontrada con id_operacion=${id_operacion}` });
                }

                // Actualizar la operación principal con todos los valores combinados
                for (let dbId of ids) {
                    const updateQuery = `
                        UPDATE proyecto_operacion
                        SET entrada = ?, confi = ?, activa = ?
                        WHERE id = ? AND id_proyecto = ?;
                    `;
                    const values = [JSON.stringify(entradaLimpiaFinal), opPrincipal.confi, opPrincipal.active, dbId, id_proyecto];

                    // Ejecutar el UPDATE en la base de datos
                    await new Promise((resolve, reject) => {
                        db.query(updateQuery, values, (err, results) => {
                            if (err) {
                                console.error("Error en la actualización:", err);
                                reject(err);
                            } else {
                                resolve(results);
                            }
                        });
                    });
                }
            }
        }

        // Respuesta de éxito
        res.status(200).json({ message: 'Operaciones actualizadas correctamente' });

    } catch (error) {
        console.error('Error al actualizar las operaciones:', error);
        res.status(500).json({ error: 'Error al actualizar las operaciones' });
    }
}











const eliminarTodasLasEntradas = async (req, res) => {
    const { id: proyectoId } = req.params;

    if (!proyectoId) {
        return res.status(400).send('El ID del proyecto es requerido.');
    }

    const sql = 'UPDATE proyecto_operacion SET entrada = ? WHERE id_proyecto = ?';

    db.query(sql, ['[]', proyectoId], (err, result) => {
        if (err) {
            console.error('Error al eliminar todas las entradas:', err);
            return res.status(500).send('Error al eliminar todas las entradas.');
        }

        console.log(`Filas afectadas: ${result.affectedRows}`);

        res.status(200).send({
            message: 'Todas las entradas eliminadas correctamente',
            affectedRows: result.affectedRows
        });
    });
};








// Función para ejecutar el script de operación
async function runOperation(req, res) {
    const { rute, inputFilePath, outputFilePath, additionalText, id, name } = req.body;
    let config;
    if(additionalText){// Asegúrate de quitar las barras invertidas extra
        config = additionalText.replace(/\\"/g, '"'); // Elimina las barras invertidas extra
    }
    else{
        config = additionalText;
    }
    
    const carpetaNombre = `id${id}${name.charAt(0).toLowerCase()}`;

    // Asegúrate de que inputFilePath sea un array o conviértelo en uno
    let inputFilePaths = Array.isArray(inputFilePath) ? inputFilePath : [inputFilePath];
    console.log(inputFilePaths);
    // Filtrar valores vacíos o nulos
    inputFilePaths = inputFilePaths.filter(file => file && file.trim() !== "");
    console.log(inputFilePaths);
    // Generar las rutas absolutas para los archivos de entrada
    const inputFilesResolved = inputFilePaths.map(filePath => 
        path.join(process.env.BASE_PROJECTS_PATH, carpetaNombre, '/', filePath)
    );

    console.log('Archivos de entrada:', inputFilesResolved);

    const outputDir = path.resolve(process.env.BASE_PROJECTS_PATH, carpetaNombre);
    console.log('Directorio de salida:', outputDir);

    // Crear el directorio si no existe
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Asegurarse de que outputFilePath sea un array
    let outputFilePaths = Array.isArray(outputFilePath) ? outputFilePath : [outputFilePath];

    // Filtrar valores vacíos
    outputFilePaths = outputFilePaths.filter(file => file.trim() !== "");

    // Generar las rutas de salida
    const outputFilePathsResolved = outputFilePaths.map(filePath => 
        path.join(outputDir, filePath)
    );

    console.log('Archivos de salida:', outputFilePathsResolved);

    // Si no hay archivos de entrada o salida, lanzar un error
    if (!rute || inputFilesResolved.length === 0 || outputFilePathsResolved.length === 0) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
    }

    // Ejecutar el proceso con múltiples archivos de entrada y salida
    const proceso = spawn('node', [
        path.join(process.env.BASE_SCRIPTS_PATH, rute), 
        ...inputFilesResolved, 
        ...outputFilePathsResolved, 
        config // Ahora pasamos la configuración correctamente procesada
    ]);

    let logs = '';

    // Capturar la salida estándar
    proceso.stdout.on('data', (data) => {
        const log = data.toString();
        console.log(`[SALIDA] ${log}`);
        logs += log;
    });

    // Capturar errores
    proceso.stderr.on('data', (data) => {
        const errorLog = data.toString();
        console.error(`[ERROR] ${errorLog}`);
        logs += errorLog;
    });

    // Cuando el proceso finaliza
    proceso.on('close', (code) => {
        if (code === 0) {
            try {
                const outputFilePathsResolved = outputFilePaths.map(filePath => {
                    // Verificamos si ya tiene la extensión .csv, si no, la añadimos
                    if (!filePath.toLowerCase().endsWith('.csv')) {
                        filePath += '.csv';
                    }
                    return path.join(outputDir, filePath);
                });
                console.log(outputFilePathsResolved);
                // Verificar si los archivos de salida existen
                const allFilesExist = outputFilePathsResolved.every(filePath => fs.existsSync(filePath));

                if (allFilesExist) {
                    let outputData = outputFilePathsResolved.map(filePath => {
                        const ext = path.extname(filePath).toLowerCase();
                        const data = fs.readFileSync(filePath, 'utf8');

                        return ext === '.json' ? JSON.parse(data) : data;
                    });

                    res.json({
                        message: 'Operación completada con éxito',
                        logs,
                        output: outputData,
                        outputType: 'csv'
                    });
                } else {
                    res.status(404).json({
                        error: 'Uno o más archivos de salida no fueron generados',
                        logs,
                    });
                }
            } catch (err) {
                console.error('Error al leer los archivos de salida:', err);
                res.status(500).json({
                    error: 'Error al leer los archivos de salida',
                    logs,
                });
            }
        } else {
            res.status(500).json({
                error: `El proceso terminó con el código: ${code}`,
                logs,
            });
        }
    });

    // Manejar errores al iniciar el proceso
    proceso.on('error', (error) => {
        console.error('Error al iniciar el proceso:', error);
        res.status(500).json({ error: 'Error al ejecutar el script', logs });
    });
}

async function runScript(req, res) {
    const archivos = req.files || [];
    if (archivos.length === 0) {
        return res.status(400).json({ error: "No se recibió ningún archivo válido" });
    }

    // Proceso para guardar el script en su carpeta
    const carpetaPath = path.join(process.env.BASE_SCRIPTS_PATH);
    if (!fs.existsSync(carpetaPath)) {
        fs.mkdirSync(carpetaPath, { recursive: true });
    }

    let archivoDestino;
    let archivosGuardados = [];

    for (const file of archivos) {
        let ext = path.extname(file.originalname);
        let base = path.basename(file.originalname, ext);
        let nuevoNombre = `${base}${ext}`;
        archivoDestino = path.join(carpetaPath, nuevoNombre);

        archivosGuardados.push(`${nuevoNombre}`);
    }

    // Ejecutar el script con Node.js
    const proceso = spawn('node', [path.join(process.env.BASE_SCRIPTS_PATH, archivosGuardados.toString()), '-c']);

    let output = '';
    proceso.stdout.on('data', (data) => {
        output += data.toString();
    });

    proceso.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
    });

    proceso.on('close', async (code) => {
        // Después de que el proceso termine, eliminar el archivo
        try {
            await fs.promises.rm(archivoDestino, { force: true });
            console.log('Archivo temporal eliminado');
        } catch (err) {
            console.error('Error al eliminar el archivo temporal:', err);
        }

        // Enviar la respuesta dependiendo del código de salida
        if (code === 0) {
            res.json({ message: 'Script ejecutado correctamente', output });
        } else {
            res.status(500).json({ error: 'Error ejecutando el script' });
        }
    });
}





module.exports = { runOperation,crearOperacion,runScript,duplicarOperacion,eliminarTodasLasEntradas,borrarOperacion,actualizarOperacion,getOperations,getOperationById,saveOperationsToProject,removeOperationsFromProject,updateOperationsForProject,getOperationsByProject,getOperationsByProjects, saveOperations };
