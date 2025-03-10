const fs = require('fs');
const csv = require('csv-parser');

const COMMON_EXTENSIONS = ['.csv', '.txt', '.json'];

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
    ...data.map(row => headers.map(header => row[header] ?? '').join(',')) // FILAS
  ].join('\n');
  fs.writeFileSync(fileName, csvContent);
  console.log(`[ JOIN COLUMN: ${fileName} ]`);
}

// [ UNIR COLUMNAS ]
function joinColumns(data, columnsToUnite, separator) {
  if (!columnsToUnite || columnsToUnite.length === 0) {
    throw new Error("NO COLUMNS TO JOIN");
  }
  return data.map(row => {
    for (const col of columnsToUnite) {
      if (!(col in row)) {
        throw new Error(`Column "${col}" does not exist in the row.`);
      }
    }
    const newRow = { ...row };
    const newColumnName = columnsToUnite.join('_');
    const joinedValues = columnsToUnite.map(col => row[col].replace(/'/g, '')).join(separator); // ELIMINA COMILLAS
    newRow[newColumnName] = `'${joinedValues}'`; // AGREGA NUEVA COLUMNA
    return newRow;
  });
}

// [ PARÁMETROS DE ENTRADA ]
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('! ERROR: INPUT !');
  process.exit(1);
}
try {
  const inputFile = findFileWithExtension(args[0]);
  const outputFile = args[1]; 

  let config = {
    separator1: '_',
    separator2: '_',
    joinFiles: ['month', 'day', 'hour', 'min']
  };

  if (args[2]) {
    try {
      const rawConfig = args[2];
      config = JSON.parse(rawConfig); 
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

// [ MAIN ]
async function main(inputFile, outputFile, config) {
  try {
    const { headers, results } = await readCSV(inputFile);
    const columnsToUnite = config.joinFiles;
    const unitedData = joinColumns(results, columnsToUnite, config.separator1); // PROCESAR
    const newHeaders = [...headers, columnsToUnite.join(config.separator2)];
    saveCSV(unitedData, newHeaders, outputFile+'.csv'); // GUARDAR
  } catch (error) {
    console.error('ERROR:', error);
  }
}
