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
      name: "Crear Grupos",
      description: "Crea grupos de datos",
      input:1,
      output: 2,
      configexample:'{\"groups\": [{\"output\": \"function_level\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"n_px\",\"n_p\",\"truth\"]},{\"output\": \"function_drive\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"i_uiip\",\"i_f\",\"i_uiipu\",\"truth\"]},{\"output\": \"function_pressure\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"p_uiip\",\"p_f\",\"p_pu\",\"truth\"]},{\"output\": \"function_flow\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"ce_px\",\"cs_px\",\"c_pu_p\",\"truth\"]},{\"output\": \"position_plaXiquet\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"n_px\",\"ce_px\",\"cs_px\",\"truth\"]},{\"output\": \"position_playa\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"n_p\",\"i_uiip\",\"p_uiip\",\"truth\"]},{\"output\": \"position_falcon\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"i_f\",\"p_f\",\"truth\"]},{\"output\": \"position_pueblo\",\"fields\": [\"month\",\"day\",\"hour\",\"min\",\"i_uiipu\",\"c_pu_p\",\"p_pu\",\"truth\"]}]}'
    }
  }, null, 2));
  process.exit(0);
}
if (args.length < 2) {
  console.error('! ERROR: INPUT !');
  process.exit(1);
}

const inputFilePath = args[0];
const outputDir = args[1];
const configPath = args[2]; 

// CONFIGURACIÓN POR DEFECTO
let config = {
  "groups": [
      {
          "output": "function_level",
          "fields": [
              "month","day","hour","min","n_px","n_p","truth"
          ]
      },
      {
          "output": "function_drive",
          "fields": [
              "month","day","hour","min","i_uiip","i_f","i_uiipu","truth"
          ]
      },
      {
          "output": "function_pressure",
          "fields": [
              "month","day","hour","min","p_uiip","p_f","p_pu","truth"
          ]
      },
      {
          "output": "function_flow",
          "fields": [
              "month","day","hour","min","ce_px","cs_px","c_pu_p","truth"
          ]
      },
      {
          "output": "position_plaXiquet",
          "fields": [
              "month","day","hour","min","n_px","ce_px","cs_px","truth"
          ]
      },
      {
          "output": "position_playa",
          "fields": [
              "month","day","hour","min","n_p","i_uiip","p_uiip","truth"
          ]
      },
      {
          "output": "position_falcon",
          "fields": [
              "month","day","hour","min","i_f","p_f","truth"
          ]
      },
      {
          "output": "position_pueblo",
          "fields": [
              "month","day","hour","min","i_uiipu","c_pu_p","p_pu","truth"
          ]
      }
  ]
};

// [ DETECTAR FORMATO DE FICHERO ]
const COMMON_EXTENSIONS = ['.csv', '.json'];
function findFileWithExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (fs.existsSync(filePath)) {
    return filePath; // SI  EL ARCHIVO YA EXISTE, LO DEVUELVE
  }
  for (const ext of COMMON_EXTENSIONS) {
    const fileWithExt = filePath + ext;
    if (fs.existsSync(fileWithExt)) {
      return fileWithExt; // DEVUELVE LA PRIMERA COINCIDENCIA
    }
  }
  throw new Error(`Archivo no encontrado: ${filePath} (se buscó con extensiones ${COMMON_EXTENSIONS.join(', ')})`);
}

// [ CARGAR CONFIGURACIÓN ]
try {
  if (configPath.trim().startsWith("{")) {
    config = JSON.parse(configPath);
    console.log('Configuración cargada desde JSON en línea:', config);
  }
  else {
    const configFile = fs.readFileSync(configPath);
    config = JSON.parse(configFile);
    console.log('Configuración cargada desde archivo:', config);
  }
} 
catch (error) {
  console.error('Error cargando la configuración:', error);
  process.exit(1);
}

// [ LEER CSV ORIGINAL ]
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    let headers = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList) => { headers = headerList; })
      .on('data', (data) => results.push(data))
      .on('end', () => resolve({ headers, results }))
      .on('error', reject);
  });
}

// [ DIVIDIR EN GRUPOS ]
function divideGroups(data, groupHeaders, headers) {
  return data.map(row => {
    const newRow = {};
    groupHeaders.forEach(header => {
      if (headers.includes(header)) { // VERIFICAR QUE EXISTE
        newRow[header] = row[header]; // FORMAR GRUPOS
      }
    });
    return newRow;
  });
}

// [ GUARDAR CSV ]
function saveCSV(data, headers, fileName) {
  const csvContent = [
    headers.join(','), // CABECERAS
    ...data.map(row => headers.map(header => row[header] ?? '').join(',')) // FORMAR ARCHIVO
  ].join('\n');
  fs.writeFileSync(fileName, csvContent); // GUARDAR
  console.log(`[ ARCHIVO GUARDADO: ${fileName} ]`);
}

// [ MAIN ]
async function main(inputFile) {
  try {
    const { headers, results } = await readCSV(inputFile);
    const groups = config.groups.reduce((acc, group) => { // OBTENER GRUPOS
      acc[group.output] = group.fields;
      return acc;
    }, {});
    for (const [groupName, groupHeaders] of Object.entries(groups)) { // DIVIDIR Y GUARDAR CADA GRUPO
      const groupData = divideGroups(results, groupHeaders, headers);
      saveCSV(groupData, groupHeaders.filter(header => headers.includes(header)), groupName+".csv"); // GUARDAR CADA GRUPO
    }
  } 
  catch (error) {
    console.error('PROCESSING ERROR: ', error);
  }
}

// [ CALL MAIN ]
const inputFile = findFileWithExtension(inputFilePath);
const outputFile = path.join(outputDir, 'output.csv');
main(inputFile, outputFile);
