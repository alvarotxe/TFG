const fs = require('fs');
const csv = require('csv-parser');

// [ OBTENER PARÁMETROS ]
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('! ERROR: INPUT !');
  process.exit(1);
}

const COMMON_EXTENSIONS = ['.csv', '.txt', '.json'];

const inputFile = findFileWithExtension(args[0]); // ARCHIVO DE ENTRADA PARA LEER CABECERAS
const weightFileName = args[1]; // ARCHIVO DE SALIDA PARA PESOS
let config = {};

// [ LEER CABECERAS DEL CSV ]
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = []; // RESULTADOS VACÍOS
    fs.createReadStream(filePath) // LEER CSV
      .pipe(csv()) // PARSEAR CSV
      .on('data', data => results.push(data)) // ALMACENAR DATOS
      .on('end', () => {
        if (results.length === 0) {
          reject(new Error(`El archivo ${filePath} está vacío o no tiene datos válidos.`));
        } 
        else {
          resolve(results);
        }
      }) // RESOLVER PROMESA
      .on('error', reject); // RECHAZAR EN ERROR
  });
}

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

try {

  // CONFIGURACIÓN
  config = { weight: "1" };

  if (args[2]) {
    try {
      const configData = fs.readFileSync(args[2], 'utf8'); // LEE ARCHIVO DE CONFIGURACIÓN
      config = JSON.parse(configData); // PARSEAR JSON
      console.log('Configuración cargada correctamente:', config);
    } 
    catch (error) {
      console.error('Error al cargar la configuración:', error.message);
      console.log('Usando configuración por defecto:', config);
    }
  } 
  else {
    console.log('Configuración no proporcionada. Usando configuración por defecto:', config);
  }
} 
catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

// [ GUARDAR ARCHIVO WEIGHT ]
function saveWeight(headers) {
  const onesRow = headers.map(() => config.weight).join(','); // FILA DE VALORES (1) MULTIPLICADOR DE PESOS
  const csvContent = [headers.join(','), onesRow].join('\n'); // UNIR VALORES Y CLAVES
  fs.writeFileSync(weightFileName + ".csv", csvContent); // GUARDAR
  console.log(`[ ADD COLUMN - WEIGHT: ${weightFileName}]`);
}

// [ MAIN ]
async function main() {
  try {
    const results = await readCSV(inputFile);
    const headers = [...Object.keys(results[0])]; // NUEVAS CABECERAS
    saveWeight(headers);
  } 
  catch (error) {
    console.error('ERROR MAIN: ', error); // ERROR DE PROCESAMIENTO
  }
}

main();