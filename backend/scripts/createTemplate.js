const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// [ OBTENER PARÁMETROS ]
const args = process.argv.slice(2);
if (args.length === 1 && (args[0] === '-c' || args[0] === '-C')) {
  console.log(JSON.stringify({
    version: "1.0.0",
    configData : {
      verDF4IA:"1.0",
      name: "Crear Plantilla de  Nulos y Normalización ",
      description: "Crear plantilla de valores nulos y normalización",
      input:1,
      output: 2,
      configexample:'{\"nulls\": \"0\",\"normalize1\": \"0\",\"normalize2\": \"1\"}}'
    }
  }, null, 2));
  process.exit(0);
}
if (args.length !== 4) {
  console.error('! ERROR: INPUT !');
  process.exit(1);
}

const inputFilePath = args[0];
const nullsFileName = args[1];
const normalizeFileName = args[2];

// CONFIGURACIÓN POR DEFECTO
let config = {
  separator1: '_',
  separator2: '_',
  joinFiles: ['month', 'day', 'hour', 'min'],
  createTemplate: {
    nulls: 'null',
    normalize1: '1',
    normalize2: '0'
  }
};

// [ DETECTAR EXTENSIONES ]
function findFileWithExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const extensions = ['.csv', '.txt', '.json'];
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  for (const extension of extensions) {
    const fileWithExt = filePath + extension;
    if (fs.existsSync(fileWithExt)) {
      return fileWithExt;
    }
  }
  throw new Error(`Archivo no encontrado: ${filePath} (se buscó con extensiones ${extensions.join(', ')})`);
}

// [ CARGAR CONFIGURACIÓN ]
try {
  const inputFile = findFileWithExtension(inputFilePath);

  // CONFIGURACIÓN
  let config = {
    nulls: "0",
    normalize1: "0",
    normalize2: "1"
  };

  if (args[3]) {
    try {
      const rawConfig = args[3];
      config = JSON.parse(rawConfig); // INTENTA PARSEAR LA CONFIGURACIÓN
      console.log('Configuración cargada correctamente:', config);
    } 
    catch (error) {
      console.error('Configuración malformateada. Usando configuración por defecto:', config);
    }
  } 
  else {
    console.log('Configuración no proporcionada. Usando configuración por defecto:', config);
  }
  main(inputFile);
} 
catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

// [ LEER CSV ]
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// [ VERIFICAR NULLS POR COLUMNAS ]
function getNulls(data, headers) {
  const nullsMap = {};
  headers.forEach(header => nullsMap[header] = false); // INICIALIZAR
  for (const row of data) {
    headers.forEach(header => {
      if (row[header] === null || row[header] === '') nullsMap[header] = true; // SI HAY NULL O VACIO SE INDICA
    });
  }
  return nullsMap;
}

// [ *** NULLS ]
function saveNulls(headers, nullsMap) {
  const nullsRow = headers.map(header => (nullsMap[header] ? 'null' : config.createTemplate.nulls)).join(','); // GENERAR FILA
  const csvContent = [headers.join(','), nullsRow].join('\n'); // GENERAR PLANTILLA NULLS
  fs.writeFileSync(nullsFileName+".csv", csvContent);
  console.log(`[ CREATE TEMPLATE - NULLS: ${nullsFileName} ]`);
}

// [ *** NORMALIZADO ]
function saveNormalized(headers) {
  const nullsRow = headers.map(() => config.createTemplate.normalize1).join(','); // SI HAY NULL -> 1
  const onesRow = headers.map(() => config.createTemplate.normalize2).join(','); // SI NO HAY NULL -> 0
  const csvContent = [headers.join(','), nullsRow, onesRow].join('\n'); // UNIR CLAVES VALOR
  fs.writeFileSync(normalizeFileName+".csv", csvContent);
  console.log(`[ CREATE TEMPLATE - NORMALIZE: ${normalizeFileName} ]`);
}

// [ MAIN ]
async function main(inputFilename) { // LEER ENTRADA
  const data = await readCSV(inputFilename);
  if (data.length === 0) {
    console.error('! ERROR: EMPTY CSV !');
    return;
  }
  const headers = Object.keys(data[0]);
  const nullsMap = getNulls(data, headers);
  saveNulls(headers, nullsMap); // NULLS
  saveNormalized(headers); // NORMALIZADO
}
