const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../database/configdb');

const crearOperacion = async (req, res) => {
    const { operacion, descripcion, entradas, salidas, confi } = req.body;
    const archivos = req.files || [];
    
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

    const archivosExistentes = existingFiles ? JSON.parse(existingFiles) : [];
    const archivosEliminados = deletedFiles ? JSON.parse(deletedFiles) : [];

    const carpetaPath = path.join(process.env.BASE_SCRIPTS_PATH);

    try {
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

            for (const archivo of archivosEliminados) {
                const archivoPath = path.join(carpetaPath, path.basename(archivo));
                try {
                    await fs.promises.rm(archivoPath, { force: true });
                } catch (error) {
                    console.warn(`No se pudo eliminar el archivo: ${archivoPath}. Puede que no exista.`);
                }
                // Remover de la lista de archivos actuales
                archivosActuales = archivosActuales.filter((file) => file !== archivo);
            }

            let archivosGuardados = [];
            for (const file of archivos) {
                let ext = path.extname(file.originalname);
                let base = path.basename(file.originalname, ext);
            
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
            const archivosFinales = [...archivosActuales, ...archivosGuardados].filter(Boolean);

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

            for (const archivo of archivos) {
                const archivoPath = path.join(carpetaPath, path.basename(archivo));

                try {
                    await fs.promises.rm(archivoPath, { force: true });
                } catch (error) {
                    console.warn(`No se pudo eliminar el archivo: ${archivoPath}. Puede que no exista.`);
                }
            }

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

async function getOperations(req, res) {
    try {
        const sql = 'SELECT id, operacion, descripcion, script_text, entradas, salidas, confi FROM operaciones';

        db.query(sql, (err, results) => {
            if (err) {
                console.error('Error al obtener las operaciones de la base de datos:', err);
                return res.status(500).json({ error: 'Error al obtener las operaciones' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'No se encontraron operaciones' });
            }
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
      
      res.status(200).json(result[0]);
    });
};

async function getOperationsByProject(req, res) {
    const proyectoId = req.params.projectId;
    
    try {
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

            if (results.length === 0) {
                return res.status(404).json({ error: 'No se encontraron operaciones asociadas a este proyecto' });
            }
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

            if (results.length === 0) {
                return res.status(404).json({ error: 'No se encontraron operaciones asociadas a este proyecto' });
            }
            res.json(results);
        });
    } catch (error) {
        console.error('Error al obtener las operaciones:', error);
        res.status(500).json({ error: 'Error al obtener las operaciones' });
    }
}

async function saveOperationsToProject(req, res) {
    if (!req.body || req.body.length === 0) {
        return res.status(400).json({ error: 'No se han proporcionado operaciones para guardar' });
    }
    const projectId = req.body[0].id_proyecto;

    if (!projectId) {
        return res.status(400).json({ error: 'Falta el id del proyecto' });
    }
    const existingOperationsQuery = `SELECT id_operacion FROM proyecto_operacion WHERE id_proyecto = ${projectId}`;

    try {
        db.query(existingOperationsQuery, (err, existingOperations) => {
            if (err) {
                console.error('Error al obtener las operaciones existentes:', err);
                return res.status(500).json({ error: 'Error al consultar las operaciones existentes' });
            }
            const deleteOperationsQuery = `DELETE FROM proyecto_operacion WHERE id_proyecto = ${projectId}`;
            
            db.query(deleteOperationsQuery, (err, result) => {
                if (err) {
                    console.error('Error al eliminar las operaciones existentes:', err);
                    return res.status(500).json({ error: 'Error al eliminar las operaciones existentes' });
                }

                // Crear un conjunto de id_operacion que ya están asociadas
                const operationsToInsert = req.body;

                const lastOrderQuery = `SELECT MAX(orden) as last_order FROM proyecto_operacion WHERE id_proyecto = ${projectId}`;

                db.query(lastOrderQuery, (err, result) => {
                    if (err) {
                        console.error('Error al obtener el último orden:', err);
                        return res.status(500).json({ error: 'Error al consultar el último orden' });
                    }

                    let lastOrder = result[0].last_order || 0;

                    // Construir la consulta SQL para insertar las operaciones con el orden secuencial y el count
                    const insertQueries = [];
                    operationsToInsert.forEach((operation) => {
                        
                        // Insertar la operación "count"
                        for (let i = 0; i < operation.count; i++) {
                            lastOrder++;
                            const archivoArray = Array.isArray(operation.archivo) ? operation.archivo : [operation.archivo];
                            const archivoJSON = JSON.stringify(archivoArray);
                            insertQueries.push({
                                id_proyecto: projectId,
                                id_operacion: operation.id_operacion,
                                nombre_operacion: operation.nombre_operacion,
                                archivo: archivoJSON,
                                orden: lastOrder,
                                confi: operation.confi
                            });
                        }
                    });
                    const sql = `INSERT INTO proyecto_operacion (id_proyecto, id_operacion, entrada, salida, confi, activa, orden)
                                VALUES
                                ${insertQueries.map(op => `(${op.id_proyecto}, ${op.id_operacion}, '${op.archivo}', 'null', '${op.confi}', 0, ${op.orden})`).join(', ')}`;

                    db.query(sql, (err, results) => {
                        if (err) {
                            console.error('Error al guardar las operaciones:', err);
                            return res.status(500).json({ error: 'Error al guardar las operaciones en la base de datos' });
                        }
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
    const operationsToRemove = req.body.operationsToRemove;

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
        const operationIdsMap = {};

        for (const operation of updatedOperations) {
            const { id_operacion } = operation;

            if (!id_operacion) {
                return res.status(400).json({ error: 'Falta el ID de la operación' });
            }

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
                            resolve(results.map(row => row.id));
                        }
                    });
                });

                if (ids.length === 0) {
                    return res.status(404).json({ error: `Operación no encontrada con id_operacion=${id_operacion}` });
                }
                operationIdsMap[id_operacion] = ids;
            }
        }

        for (const operation of updatedOperations) {
            const { id_operacion, entradaValue, confi, active, orden, positionIndex } = operation;

            const idList = operationIdsMap[id_operacion];
            const id = idList.shift();

            if (!id) {
                return res.status(404).json({ error: `No hay más registros disponibles para id_operacion=${id_operacion}` });
            }
            const entrada = Array.isArray(entradaValue) ? entradaValue : [entradaValue];
            const entradaJSON = JSON.stringify(entrada);
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

const buscarOperaciones = (req, res) => {
    const { query } = req.query;
  
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Se requiere un término de búsqueda válido' });
    }
    const sqlQuery = `SELECT * FROM operaciones WHERE operacion LIKE ?`;
    const values = [`%${query}%`];
  
    db.query(sqlQuery, values, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Error al buscar operaciones' });
      }
      const cleanedResults = results.map(row => ({
        id: row.id,
        operacion: row.operacion,
        descripcion: row.descripcion,
        script_text: row.script_text,
        entradas: row.entradas,
        salidas: row.salidas,
        confi: row.confi || null
      }));
      if (cleanedResults.length === 0) {
        return res.status(404).json({ message: 'No se encontraron operaciones' });
      }
      return res.json(cleanedResults);
    });
};

async function saveOperations(req, res) {
    try {
        let operaciones = req.body;

        if (!Array.isArray(operaciones) || operaciones.length === 0) {
            return res.status(400).json({ error: 'No se enviaron operaciones a actualizar' });
        }
        let groupedOperations = {};

        for (let op of operaciones) {
            const { id_proyecto, id_operacion, entradaValue, confi, active, id, nombre, isMainRow } = op;

            if (!id_proyecto) {
                continue;
            }

            if (!entradaValue || entradaValue.length === 0) {
                continue;
            }

            if (id_proyecto) {
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
                            resolve(results.map(row => row.id));
                        }
                    });
                });

                if (ids.length === 0) {
                    return res.status(404).json({ error: `Operación no encontrada con id_operacion=${id_operacion}` });
                }

                for (let i = 0; i < ids.length && isMainRow; i++) {
                    const dbId = ids[i];

                    if (dbId !== id) {
                        continue;
                    }
                    const entradaLimpiaFinal = Array.isArray(entradaValue)
                    ? [...new Set(entradaValue.filter(item => item != null && item !== ''))]
                    : [];
                    const configActive = operaciones.filter(op => op.isMainRow && op.id === dbId);

                    if (configActive.length === 0) {
                        continue;
                    }
                    const mainOp = configActive[0];

                    // Ahora podemos acceder a confi y active
                    const configuracion = mainOp.confi;
                    const Active = mainOp.active;
                    
                    const updateQuery = `
                        UPDATE proyecto_operacion
                        SET entrada = ?, confi = ?, activa = ?
                        WHERE id = ? AND id_proyecto = ?;
                    `;
                    const values = [JSON.stringify(entradaLimpiaFinal), configuracion, Active, dbId, id_proyecto];

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
                if (!groupedOperations[nombre]) {
                    groupedOperations[nombre] = [];
                }
                groupedOperations[nombre].push({ id, entradaValue });
            }
        }
        for (let nombre in groupedOperations) {
            const operacionesAdicionales = groupedOperations[nombre];

            const opPrincipal = operaciones.find(op => op.nombre === nombre && op.id_operacion);
            if (opPrincipal) {
                const { id_operacion, id_proyecto, entradaValue, confi, activa } = op;
                let allEntradaValues = new Set(entradaValue);

                for (let adicional of operacionesAdicionales) {
                    adicional.entradaValue.forEach(val => allEntradaValues.add(val));
                }
                const entradaLimpiaFinal = Array.from(allEntradaValues);
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
                            resolve(results.map(row => row.id));
                        }
                    });
                });

                if (ids.length === 0) {
                    return res.status(404).json({ error: `Operación no encontrada con id_operacion=${id_operacion}` });
                }

                for (let dbId of ids) {
                    const updateQuery = `
                        UPDATE proyecto_operacion
                        SET entrada = ?, confi = ?, activa = ?
                        WHERE id = ? AND id_proyecto = ?;
                    `;
                    const values = [JSON.stringify(entradaLimpiaFinal), opPrincipal.confi, opPrincipal.active, dbId, id_proyecto];

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
        res.status(200).json({ message: 'Operaciones actualizadas correctamente' });
    } catch (error) {
        console.error('Error al actualizar las operaciones:', error);
        res.status(500).json({ error: 'Error al actualizar las operaciones' });
    }
}

async function runOperation(req, res) {
    const { rute, inputFilePath, outputFilePath, additionalText, id, name } = req.body;
    let config;

    if(additionalText){
        config = additionalText.replace(/\\"/g, '"');
    }
    else{
        config = additionalText;
    }
    const carpetaNombre = `id${id}${name.charAt(0).toLowerCase()}`;
    let inputFilePaths = Array.isArray(inputFilePath) ? inputFilePath : [inputFilePath];
    // Filtrar valores vacíos o nulos
    inputFilePaths = inputFilePaths.filter(file => file && file.trim() !== "");
    // Generar las rutas absolutas para los archivos de entrada
    const inputFilesResolved = inputFilePaths.map(filePath => 
        path.join(process.env.BASE_PROJECTS_PATH, carpetaNombre, '/', filePath)
    );
    const outputDir = path.resolve(process.env.BASE_PROJECTS_PATH, carpetaNombre);

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

    // Si no hay archivos de entrada o salida, lanzar un error
    if (!rute || inputFilesResolved.length === 0 || outputFilePathsResolved.length === 0) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
    }

    // Ejecutar el proceso con múltiples archivos de entrada y salida
    const proceso = spawn('node', [
        path.join(process.env.BASE_SCRIPTS_PATH, rute), 
        ...inputFilesResolved, 
        ...outputFilePathsResolved, 
        config
    ]);

    let logs = '';

    // Capturar la salida estándar
    proceso.stdout.on('data', (data) => {
        const log = data.toString();
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
                    if (!filePath.toLowerCase().endsWith('.csv')) {
                        filePath += '.csv';
                    }
                    return path.join(outputDir, filePath);
                });
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

    // Ejecutar el script con spawn
    const proceso = spawn('node', [path.join(process.env.BASE_SCRIPTS_PATH, archivosGuardados.toString()),'-c']);

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

module.exports = { 
    runOperation,
    crearOperacion,
    buscarOperaciones,
    runScript,
    borrarOperacion,
    actualizarOperacion,
    getOperations,
    getOperationById,
    saveOperationsToProject,
    removeOperationsFromProject,
    updateOperationsForProject,
    getOperationsByProject,
    getOperationsByProjects,
    saveOperations };
