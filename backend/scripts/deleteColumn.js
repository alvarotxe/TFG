const fs = require('fs');
const csv = require('csv-parser');
const COMMON_EXTENSIONS = ['.csv', '.txt', '.json'];

// [ PARÁMETROS DE ENTRADA ]
const args = process.argv.slice(2);
if (args.length === 1 && (args[0] === '-c' || args[0] === '-C')) {
  console.log(JSON.stringify({
    version: "1.0.0",
    configData : {
      verDF4IA:"1.0",
      name: "Eliminar Columnas",
      description: "Elimina columnas de un archivo",
      input:1,
      output: 1,
      configexample:'{\"delete\": [\"﻿num\"]}'
    }
  }, null, 2));
  process.exit(0);
}
if (args.length < 2) {
  console.error('! ERROR: INPUT !');
  process.exit(1);
}

try {
  const inputFile = findFileWithExtension(args[0]);
  const outputFile = args[1]; // ARCHIVO DE SALIDA PARA GUARDAR RESULTADOS

  // CONFIGURACIÓN
  let config = {
    deleteColumns: [] 
  };

  if (args[2]) {
    try {
      const rawConfig = args[2];
      config = JSON.parse(rawConfig); // INTENTAR PARSEAR LA CONFIGURACIÓN
      console.log('Configuración cargada correctamente:', config);
    } 
    catch (error) {
      console.error('Configuración malformateada. Usando configuración por defecto:', config);
    }
  } 
  else {
    console.log('Configuración no proporcionada. Usando configuración por defecto:', config);
  }
  main(inputFile, outputFile, config);
} 
catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}


// [ BUSCA ARCHIVO CON EXTENSIÓN ]
function findFileWithExtension(filePath) {
  if (fs.existsSync(filePath)) {
    return filePath; // SI EL ARCHIVO YA EXISTE, LO DEVUELVE
  }
  for (const ext of COMMON_EXTENSIONS) {
    const fileWithExt = filePath + ext;
    if (fs.existsSync(fileWithExt)) {
      return fileWithExt; // DEVUELVE LA PRIMERA COINCIDENCIA
    }
  }
  throw new Error(`Archivo no encontrado: ${filePath} (se buscó con extensiones ${COMMON_EXTENSIONS.join(', ')})`);
}

// [ LEE CSV ]
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

// [ GUARDA CSV ]
function saveCSV(data, headers, fileName) {
  const csvContent = [
    headers.join(','), // CABECERA
    ...data.map(row => headers.map(header => row[header] ?? '').join(',')) // Filas
  ].join('\n');
  fs.writeFileSync(fileName, csvContent);
  console.log(`[ DELETE COLUMN: ${fileName} ]`);
}

// [ ELIMINA COLUMNAS ]
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


// [ MAIN  ]
async function main(inputFile, outputFile, config) {
  try {
    const { headers, results } = await readCSV(inputFile);
    const columnsToDelete = config.delete;
    const filteredData = deleteColumns(results, columnsToDelete); // ELIMINAR COLUMNAS
    saveCSV(filteredData, headers.filter(header => !columnsToDelete.includes(header)), outputFile+'.csv'); // GUARDAR 
  } 
  catch (error) {
    console.error('ERROR:', error);
  }
}
