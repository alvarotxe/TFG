const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// [ OBTENER PARÁMETROS ]
const args = process.argv.slice(2);
if (args.length === 1 && (args[0] === '-c' || args[0] === '-C')) {
  console.log(`input:1,output:8,config:1`);
  console.log(`./results/Nulls_s1 ./results/CreateGroups/Function_Level_s1 ./results/CreateGroups/Function_Drive_s2 ./results/CreateGroups/Function_Pressure_s3 ./results/CreateGroups/Function_Flow_s4 ./results/CreateGroups/Position_PlaXiquet_s5 ./results/CreateGroups/Position_Playa_s6 ./results/CreateGroups/Position_Falcon_s7 ./results/CreateGroups/Position_Pueblo_s8 ./exec/waterConfig.json`);
  process.exit(0);
}
if (args.length < 9) {
  console.error('! ERROR: INPUT !');
  process.exit(1);
}

const inputFilePath = args[0];
const outputPaths = args.slice(1, 9);
const configPath = args[9]; 

// CONFIGURACIÓN POR DEFECTO
let config = {
  "groups": [
      {
          "output": "Function_Level_s1",
          "fields": [
              "month","day","hour","min","n_px","n_p","truth"
          ]
      },
      {
          "output": "Function_Drive_s2",
          "fields": [
              "month","day","hour","min","i_uiip","i_f","i_uiipu","truth"
          ]
      },
      {
          "output": "Function_Pressure_s3",
          "fields": [
              "month","day","hour","min","p_uiip","p_f","p_pu","truth"
          ]
      },
      {
          "output": "Function_Flow_s4",
          "fields": [
              "month","day","hour","min","ce_px","cs_px","c_pu_p","truth"
          ]
      },
      {
          "output": "Position_PlaXiquet_s5",
          "fields": [
              "month","day","hour","min","n_px","ce_px","cs_px","truth"
          ]
      },
      {
          "output": "Position_Playa_s6",
          "fields": [
              "month","day","hour","min","n_p","i_uiip","p_uiip","truth"
          ]
      },
      {
          "output": "Position_Falcon_s7",
          "fields": [
              "month","day","hour","min","i_f","p_f","truth"
          ]
      },
      {
          "output": "Position_Pueblo_s8",
          "fields": [
              "month","day","hour","min","i_uiipu","c_pu_p","p_pu","truth"
          ]
      }
  ]
};

// [ CARGAR CONFIGURACIÓN ]
try {
  if (configPath.trim().startsWith("{")) {
    config = JSON.parse(configPath);
  } else {
    const configFile = fs.readFileSync(configPath);
    config = JSON.parse(configFile);
  }
  console.log('Configuración cargada correctamente');
} catch (error) {
  console.error('Error cargando la configuración:', error);
  process.exit(1);
}

// [ LEER CSV ]
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
      if (headers.includes(header)) {
        newRow[header] = row[header];
      }
    });
    return newRow;
  });
}

// [ CREAR DIRECTORIO SI NO EXISTE ]
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

// [ GUARDAR CSV ]
function saveCSV(data, headers, fileName) {
  ensureDirectoryExistence(fileName);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header] ?? '').join(','))
  ].join('\n');
  try {
    fs.writeFileSync(fileName, csvContent);
    if (fs.existsSync(fileName)) {
      console.log(`[ ARCHIVO GUARDADO: ${fileName} ]`);
    } else {
      console.error(`[ ERROR AL GUARDAR: ${fileName} ]`);
    }
  } catch (error) {
    console.error(`[ ERROR AL GUARDAR: ${fileName} ]`, error);
  }
}

// [ MAIN ]
async function main(inputFile, outputFiles) {
  try {
    const { headers, results } = await readCSV(inputFile);
    config.groups.forEach((group, index) => {
      if (index < outputFiles.length) {
        const groupData = divideGroups(results, group.fields, headers);
        saveCSV(groupData, group.fields.filter(header => headers.includes(header)), outputFiles[index]+'.csv');
      }
    });
  } catch (error) {
    console.error('PROCESSING ERROR:', error);
  }
}

// [ CALL MAIN ]
const inputFile = inputFilePath;
main(inputFile, outputPaths);
