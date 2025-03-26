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
      name: "Añadir columnas",
      description: "Añadir columnas a un archivo",
      input:1,
      output: 1,
      configexample:'{\"columnName\":[\"truth\"], \"value\":[0]}'
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
  const outputFile = args[1]; // EL ARCHIVO DE SALIDA PUEDE SER CREADO, NO NECESITA EXISTIR.

  // CONFIGURACIÓN POR DEFECTO
  let config = {
    addColumn: {
      columnName: ["truth"],
      value: [0]
    }  
  };

  // LEE CONFIGURACIÓN
  if (args[2]) {
    try {
      const rawConfig = args[2];
      config = JSON.parse(rawConfig); // INSTENTA PARSEAR LA CONFIGURACIÓN
      console.log('Configuración cargada correctamente:', config);
    } catch (error) {
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

// [ LEE JSON ]
async function readJSON(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data));
    });
  });
}

// [ LEE TXT ]
async function readTXT(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err);
      else {
        resolve(data.split('\n').map(line => ({ value: line })));
      }
    });
  });
}

// [ GUARDA CSV ]
function saveCSV(data, headers, fileName) {
  const csvContent = [
    headers.join(','), // CABECERA
    ...data.map(row => headers.map(header => row[header] ?? '').join(',')) // FILAS
  ].join('\n');
  fs.writeFileSync(fileName, csvContent);
  console.log(`[ ADD COLUMN: ${fileName} ]`);
}

// [ AÑADE COLUMNAS ]
function addColumns(data, columnNames, columnValues) {
  if (!columnNames || columnNames.length === 0 || !columnValues || columnValues.length !== columnNames.length) {
    throw new Error("Error al añadir columnas. Verifique las columnas y los valores.");
  }
  return data.map(row => {
    const newRow = { ...row };
    columnNames.forEach((columnName, index) => {
      newRow[columnName] = columnValues[index]; // ASIGNA VALOR A LA COLUMNA
    });
    return newRow;
  });
}

// [ MAIN ]
async function main(inputFile, outputFile, config) {
  try {
    const extname = path.extname(inputFile).toLowerCase();
    let data;
    if (extname === '.csv') {
      const { headers, results } = await readCSV(inputFile);
      data = { headers, results };
    } 
    else if (extname === '.json') {
      data = await readJSON(inputFile);
    } 
    else if (extname === '.txt') {
      data = await readTXT(inputFile);
    } 
    else {
      throw new Error(`Formato no soportado: ${extname}`);
    }
    const { columnName, value } = config;
    const updatedData = addColumns(data.results || data, columnName, value); // PROCESA DATOS AÑADIENDO COLUMNAS
    const headers = data.headers || Object.keys(updatedData[0]); // GUARDA 
    saveCSV(updatedData, [...headers, ...columnName], outputFile + '.csv');
  } 
  catch (error) {
    console.error('ERROR:', error);
  }
}
