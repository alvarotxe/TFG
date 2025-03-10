const fs = require('fs');
const args = process.argv.slice(2);
const configPath = args[3] ? args[3] : './config.json';
let config = {};

// [ OBTENER NOMBRES DE ARCHIVO ]
if (args.length < 2) {
  console.error('! ERROR: INPUT !');
  process.exit(1);
}

// [ CARGAR CONFIGURACIÓN ]
try {
  const configFile = fs.readFileSync(configPath);
  config = JSON.parse(configFile);
}
catch (error) {
  console.error(`! ERROR: CONFIG ${configPath} !`, error);
  process.exit(1);
}

// [ LEER JSON ORIGINAL ]
function readData(filePath) {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data); // DEVOLVER JSON PARSEADO
  }
  return [];
}

// [ GUARDAR RESULTADO EN CSV ]
function saveCSV(data, outputFilename) {
  const csvRows = [];
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(',')); // AÑADIR CABECERAS
  data.forEach(obj => { // OBTENER VALORES DE CADA OBJETO
    const values = Object.values(obj).map(value => {
      let stringValue = (typeof value === 'string') ? value.replace(/"/g, '""') : String(value); // ESCAPAR COMILLAS
      return (typeof value === 'string') ? `'${stringValue}'` : stringValue; // PONER COMILLAS SI ES CADENA
    });
    csvRows.push(values.join(',')); // AÑADIR FILA
  });
  fs.writeFileSync(outputFilename, csvRows.join('\n')); // GUARDAR CSV
  console.log(`[ TO CSV: ${outputFilename} ]`);
}

// [ *** APLANAR EL JSON ]
function flattenData(ob) {
  const result = {};
  function recurse(cur, prop) {
    if (Object(cur) !== cur) {
      result[prop] = cur; // AÑADIR CLAVE-VALOR AL RESULTADO
    }
    else if (Array.isArray(cur)) {
      cur.forEach((item, index) => {
        recurse(item, `${prop}${config.toCsv.separator}${index}`); // APLANAR ARRAYS
      });
    }
    else {
      for (const key in cur) {
        recurse(cur[key], prop ? `${prop}${config.toCsv.keySeparator}${key}` : key); // CONCATENAR CLAVES
      }
    }
  }
  recurse(ob, '');
  return result;
}

`{arg:1, arg2:2}`

// [ *** TRANSFORMAR ARRAY DE MENSAJES ]
function transformData(messages) {
  return messages.map(message => flattenData(message));
}

// [ MAIN ]
function main(inputFilename, outputFilename) {
  const messages = readData(inputFilename);
  const flattenedMessages = transformData(messages); // APLANAR 
  if (flattenedMessages.length > 0) { // SI HAY CONTENIDO
    saveCSV(flattenedMessages, outputFilename); // GUARDAR CSV
  }
  else {
    console.error('! ERROR: JSON FILE CONTAINS NO DATA !');
  }
}

main(args[0], args[1]);