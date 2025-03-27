const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const COMMON_EXTENSIONS = ['.csv', '.txt', '.json'];

// [ PARÁMETROS DE ENTRADA ]
const args = process.argv.slice(2);
if (args.length === 1 && (args[0] === '-c' || args[0] === '-C')) {
  console.log(JSON.stringify({
    version: "1.0.0",
    configData : {
      verDF4IA:"1.0",
      name: "Eliminar Truth",
      description: "Elimina Truth de un archivo",
      input:1,
      output: 1,
      configexample:'{\"delete\": [\"truth\"]}'
    }
  }, null, 2));
  process.exit(0);
}
if (args.length < 2) {
  console.error('! ERROR: INPUT !');
  process.exit(1);
}

try {
  // Detectar archivos con extensiones comunes
  const inputFile = findFileWithExtension(args[0]);
  const outputFile = args[1]; // El archivo de salida puede ser creado, no necesita existir.

  // Configuración por defecto
  let config = {
    deleteColumns: [] // Lista de columnas a eliminar por defecto
  };

  // Leer configuración del tercer argumento o usar predeterminada
  if (args[2]) {
    try {
      const rawConfig = args[2];
      config = JSON.parse(rawConfig); // Intenta parsear la configuración
      console.log('Configuración cargada correctamente:', config);
    } catch (error) {
      console.error('Configuración malformateada. Usando configuración por defecto:', config);
    }
  } else {
    console.log('Configuración no proporcionada. Usando configuración por defecto:', config);
  }

  // Ejecutar lógica principal
  main(inputFile, outputFile, config);

} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

// Busca un archivo en la ruta dada con extensiones comunes si no se proporciona una extensión.
function findFileWithExtension(filePath) {
  if (fs.existsSync(filePath)) {
    return filePath; // Si el archivo ya existe, lo devuelve
  }

  for (const ext of COMMON_EXTENSIONS) {
    const fileWithExt = filePath + ext;
    if (fs.existsSync(fileWithExt)) {
      return fileWithExt; // Devuelve la primera coincidencia
    }
  }

  throw new Error(`Archivo no encontrado: ${filePath} (se buscó con extensiones ${COMMON_EXTENSIONS.join(', ')})`);
}

// Lee un archivo CSV y devuelve sus datos.
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    let headers = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', headerList => { headers = headerList; })
      .on('data', data => results.push(data))
      .on('end', () => resolve({ headers, results }))
      .on('error', reject);
  });
}

// Guarda datos en un archivo CSV.
function saveCSV(data, headers, fileName) {
  const csvContent = [
    headers.join(','), // Cabecera
    ...data.map(row => headers.map(header => row[header] ?? '').join(',')) // Filas
  ].join('\n');
  fs.writeFileSync(fileName, csvContent);
  console.log(`[ DELETE COLUMN: ${fileName} ]`);
}

// Elimina columnas específicas de los datos.
function deleteColumns(data, columnsToDelete) {
  if (!columnsToDelete || columnsToDelete.length === 0) {
    throw new Error("NO COLUMNS TO DELETE");
  }
  return data.map(row => {
    const newRow = { ...row };
    columnsToDelete.forEach(col => delete newRow[col]);
    return newRow;
  });
}


// Lógica principal del script.
async function main(inputFile, outputFile, config) {
  try {
    const { headers, results } = await readCSV(inputFile);
    const columnsToDelete = config.delete;
    
    // Procesar datos eliminando columnas
    const filteredData = deleteColumns(results, columnsToDelete);

    // Guardar resultado en el archivo de salida
    saveCSV(filteredData, headers.filter(header => !columnsToDelete.includes(header)), outputFile+'.csv');
  } catch (error) {
    console.error('ERROR:', error);
  }
}
