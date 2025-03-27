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
      name: "Nulos",
      description: "Elimina valores nulos de un archivo",
      input:2,
      output: 1,
      configexample:'{\"remove\": [\"R\", \"r\", \"D\", \"d\"]}'
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
const outputFileName = args[2];
const configPath = args[3]; 

// CONFIGURACIÓN 
let config = {
  remove: [
      "R", 
      "r", 
      "D", 
      "d"
  ]
};

const COMMON_EXTENSIONS = ['.csv', '.txt', '.json'];

// [ BUSCAR ARCHIVO CON EXTENSIÓN ]
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

// [ LEER CSV Y DEVOLVER CABECERAS Y RESULTADOS ]
const readCSV = (filePath) => new Promise((resolve, reject) => {
  const results = [];
  let headers = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('headers', (headerList) => { headers = headerList; })
    .on('data', (data) => results.push(data))
    .on('end', () => resolve({ headers, results }))
    .on('error', reject);
});

// [ GUARDAR CSV ]
const saveCSV = (data, headers, fileName) => {
  const csvContent = [
    headers.join(','), // CABECERAS
    ...data.map(row => headers.map(header => row[header] ?? '').join(',')) // FORMAR ARCHIVO
  ].join('\n');
  fs.writeFileSync(fileName, csvContent); // GUARDAR
  console.log(`[ NULLS: ${fileName} ]`);
};

// [ CARGAR CONFIGURACIÓN ]
try {
  // DETECTAR ARCHIVOS DE ENTRADA
  const inputFile = findFileWithExtension(inputFilePath);
  const nullsFile = findFileWithExtension(nullsFileName);

  if (configPath) {
    try {
      const rawConfig = configPath;
      config = JSON.parse(rawConfig); // INTENTA PARSEAR LA CONFIGURACIÓN
      console.log('Configuración cargada correctamente:', config);
    } catch (error) {
      console.error('Configuración malformateada. Usando configuración por defecto:', config);
    }
  } 
  else {
    console.log('Configuración no proporcionada. Usando configuración por defecto:', config);
  }
  main(inputFile, nullsFile, outputFileName, config);
} 
catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

// [ MAIN ]
async function main(inputFile, nullsFile, outputFile, config) { 
  try {
    const { headers, results } = await readCSV(inputFile); // LEER CSV PRINCIPAL
    const { results: nullValues } = await readCSV(nullsFile); // LEER CSV DE NULOS
    if (nullValues.length === 0) throw new Error('EMPTY NULLS FILE'); // ARCHIVO DE NULOS NO VACÍO
    const values1 = nullValues[0]; // VALORES DE PRIMERA FILA DE NULOS

    // ENCONTRAR COLUMNAS CON 'R'
    const columnsToCheck = Object.keys(values1).filter(
      (header) => config.remove.includes(values1[header])
    );

    // FILTRAR FILAS EN BASE A COLUMNAS ESPECIFICADAS EN columnsToCheck
    const filteredResults = results.filter(row => {
      return columnsToCheck.every(header => row[header] !== null && row[header] !== 'null' && row[header] !== '');
    });

    // MAPEAR Y NORMALIZAR DATOS
    const normalizedData = filteredResults.map(row => {
      return headers.reduce((newRow, header) => {
        newRow[header] = (row[header] === null || row[header] === 'null' || row[header] === '')
          ? (header in values1 ? values1[header] : null) // REMPLAZAR CON LO DEL ARCHIVO NULLS
          : row[header]; // MANTENER VALOR ORIGINAL SI NO ES NULO
        return newRow;
      }, {});
    });
    saveCSV(normalizedData, headers, outputFile+".csv"); // GUARDAR RESULTADOS
  } 
  catch (error) {
    console.error('! ERROR ! ', error);
  }
}
