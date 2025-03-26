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
            SELECT id_operacion, entrada, salida, confi, activa, orden
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

            // Crear un conjunto de id_operacion que ya están asociadas
            const existingOperationIds = existingOperations.map(op => op.id_operacion);

            // Filtrar las operaciones a insertar, eliminando las que ya existen
            const operationsToInsert = req.body.filter(operation => !existingOperationIds.includes(operation.id_operacion));
            if (operationsToInsert.length === 0) {
                return res.status(400).json({ error: 'Todas las operaciones ya están asociadas al proyecto' });
            }

            // Obtener el último orden asociado al proyecto (si existe)
            const lastOrderQuery = `SELECT MAX(orden) as last_order FROM proyecto_operacion WHERE id_proyecto = ${projectId}`;

            db.query(lastOrderQuery, (err, result) => {
                if (err) {
                    console.error('Error al obtener el último orden:', err);
                    return res.status(500).json({ error: 'Error al consultar el último orden' });
                }

                let lastOrder = result[0].last_order || 0; // Si no hay operaciones, empezar desde 0

                // Construir la consulta SQL para insertar las operaciones con el orden secuencial
                const insertQueries = operationsToInsert.map((operation) => {
                    lastOrder++;  // Incrementar el orden antes de asignarlo a la siguiente operación
                    const archivoArray = Array.isArray(operation.archivo) ? operation.archivo : [operation.archivo];
                    const archivoJSON = JSON.stringify(archivoArray);
                    return {
                        id_proyecto: projectId,
                        id_operacion: operation.id_operacion,
                        nombre_operacion: operation.nombre_operacion,
                        archivo: archivoJSON,  // Si no hay archivo, se guarda como NULL
                        orden: lastOrder,  // Asignar el nuevo orden
                        confi: operation.confi
                    };
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
    const projectId = req.params.id;  // Asegúrate de que el ID del proyecto se obtiene correctamente de los parámetros
    const updatedOperations = req.body.operations;  // Accede al array de operaciones desde el cuerpo de la solicitud
    if (!projectId || !updatedOperations || updatedOperations.length === 0) {
        return res.status(400).json({ error: 'Faltan parámetros o no se proporcionaron operaciones para actualizar' });
    }

    // Iteramos sobre cada operación a actualizar
    try {
        // Para cada operación en el array de operaciones a actualizar
        for (let operation of updatedOperations) {
            const {id_operacion, entradaValue, archivo, confi, active, orden } = operation;
            const projectIdInt = parseInt(projectId, 10);
            if (!id_operacion) {
                return res.status(400).json({ error: 'Falta id_operacion en los datos proporcionados' });
            }
            const entrada = Array.isArray(entradaValue) ? entradaValue : [entradaValue];
            const entradaJSON = JSON.stringify(entrada);

            // Consulta SQL para actualizar la operación asociada al proyecto
            const sql = `
                UPDATE proyecto_operacion
                SET 
                    entrada = COALESCE(?, entrada),
                    confi = COALESCE(?, confi),
                    activa = COALESCE(?, activa),
                    orden = COALESCE(?, orden)
                WHERE id_proyecto = ? AND id_operacion = ?
            `;

            // Ejecutamos la consulta SQL
            await new Promise((resolve, reject) => {
                db.query(sql, [entradaJSON, confi, active, orden, projectIdInt, id_operacion], (err, results) => {
                    if (err) {
                        console.error('Error al actualizar las operaciones:', err);
                        reject(err);  // Si hay error, rechazamos la promesa
                    } else {
                        resolve(results);  // Si todo es correcto, resolvemos la promesa
                    }
                });
            });
        }

        // Si la actualización fue exitosa para todas las operaciones
        res.json({ message: 'Operaciones actualizadas correctamente' });

    } catch (error) {
        console.error('Error al procesar las actualizaciones de operaciones:', error);
        res.status(500).json({ error: 'Error al actualizar las operaciones' });
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
        const operaciones = req.body;
        if (!Array.isArray(operaciones) || operaciones.length === 0) {
            return res.status(400).json({ error: 'No se enviaron operaciones a actualizar' });
        }

        await db.beginTransaction();

        // Mapa para agrupar las operaciones por nombre
        const operacionesAgrupadas = {};

        // Primero, filtramos las operaciones que tienen entradaValue no vacío y las agrupamos por nombre
        operaciones.forEach((operation) => {
            const { id_proyecto, id_operacion, name, entradaValue, confi, active } = operation;

            if (!id_proyecto) {
                console.log('Falta id_proyecto en la operación:', operation);
                return;
            }
            
            // Si la operación tiene entradaValue vacío, la ignoramos
            if (entradaValue && entradaValue.length === 0) {
                return;
            }

            // Si no está en el mapa, lo inicializamos
            if (!operacionesAgrupadas[name]) {
                operacionesAgrupadas[name] = [];
            }

            // Agregamos los valores de entradaValue a la lista del nombre
            operacionesAgrupadas[name].push({ id_proyecto, id_operacion, entradaValue, confi, active });
        });

        // Ahora, procesamos cada grupo de operaciones por nombre
        for (let name in operacionesAgrupadas) {
            // Combinar todas las entradas de las operaciones con el mismo nombre
            let entradaValueCombinada = [];

            operacionesAgrupadas[name].forEach((operation) => {
                // Combinar los valores de entradaValue asegurándonos de no tener nulos o duplicados
                const entradaLimpia = Array.isArray(operation.entradaValue)
                    ? [...new Set(operation.entradaValue.filter(item => item != null && item !== ''))]
                    : [];

                // Unimos los valores de entrada
                entradaValueCombinada = [...entradaValueCombinada, ...entradaLimpia];
            });

            operacionesAgrupadas[name] = operacionesAgrupadas[name].filter((operation) => {
                return operation.id_operacion != null; // Solo mantiene las operaciones con un id_operacion válido
            });

            // Filtramos de nuevo para quitar posibles repeticiones globales
            entradaValueCombinada = [...new Set(entradaValueCombinada.filter(item => item != null && item !== ''))];

            // Convertimos la entrada combinada a JSON para guardarla
            let entradaLimpiaFinal = entradaValueCombinada // Usamos `let` aquí para permitir reasignación

            // Procesamos cada operación para este nombre
            for (let operation of operacionesAgrupadas[name]) {
                const { id_proyecto, id_operacion, confi, active } = operation;
                // Filtrar y limpiar la entrada de cada operación (si quieres aplicar la limpieza a nivel individual)
                console.log(`Actualizando operación ${id_operacion} con entrada:`, entradaLimpiaFinal);

                // Realizamos un UPDATE para cada operación
                const updateQuery = `
                    UPDATE proyecto_operacion
                    SET entrada = ?, confi = ?, activa = ?
                    WHERE id_proyecto = ? AND id_operacion = ?;
                `;
                const values = [JSON.stringify(entradaLimpiaFinal), confi, active, id_proyecto, id_operacion];

                // Ejecutamos el UPDATE en la base de datos
                await db.query(updateQuery, values);
            }
        }

        await db.commit();
        res.status(200).json({ message: 'Operaciones actualizadas correctamente' });

    } catch (error) {
        await db.rollback();
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





module.exports = { runOperation,crearOperacion,runScript,eliminarTodasLasEntradas,borrarOperacion,actualizarOperacion,getOperations,getOperationById,saveOperationsToProject,removeOperationsFromProject,updateOperationsForProject,getOperationsByProject,getOperationsByProjects, saveOperations };
