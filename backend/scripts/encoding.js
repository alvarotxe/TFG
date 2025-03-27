const fs = require('fs');
const csv = require('csv-parser');
const COMMON_EXTENSIONS = ['.csv', '.txt', '.json'];

// [ EJECUTAR MAIN ]
const args = process.argv.slice(2);
if (args.length === 1 && (args[0] === '-c' || args[0] === '-C')) {
  console.log(JSON.stringify({
    version: "1.0.0",
    configData : {
      verDF4IA:"1.0",
      name: "Codificar",
      description: "Codifica un archivo",
      input:2,
      output: 1,
      configexample:'{\"expandedValue\":\"#fill#\", \"headers\":\"header,value,key\", \"fillTransform\":\"mean\", \"_\":[\"none\",\"zero\",\"one\",\"mean\",\"median\"]}'
    }
  }, null, 2));
  process.exit(0);
}
if (args.length < 3) {
  console.error('Uso: node script.js <inputFile> <dictFile> <outputFile> [configFile]');
  process.exit(1);
}
try {
  const inputFile = findFileWithExtension(args[0]);
  const dictFile = args[1];
  const outputFile = args[2];
  const config = loadConfig(args[3]);

  main(inputFile, dictFile, outputFile, config)
    .catch(error => console.error('! ERROR !', error));
} 
catch (error) {
  console.error('ERROR:', error.message);
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

// [ CARGA CONFIGURACIÓN ]
function loadConfig(configPath) {

  const defaultConfig = {
    expandedValue: "#fill#",
    headers: "header,value,key",
    fillTransform: "mean",
    _: ["none", "zero", "one", "mean", "median"]
  };

  if (!configPath) {
    console.log('Configuración no proporcionada. Usando configuración por defecto:', defaultConfig);
    return defaultConfig;
  }

  if (configPath.startsWith('{') && configPath.endsWith('}')) {
    try {
      const inlineConfig = JSON.parse(configPath);
      console.log('Configuración cargada correctamente desde el argumento:', inlineConfig);
      return inlineConfig;
    } 
    catch (error) {
      console.error('Configuración malformateada. Usando configuración por defecto:', defaultConfig);
      return defaultConfig;
    }
  }

  try {
    const resolvedPath = findFileWithExtension(configPath);
    const configFile = fs.readFileSync(resolvedPath, 'utf8');
    const parsedConfig = JSON.parse(configFile);
    console.log('Configuración cargada correctamente desde archivo:', parsedConfig);
    return parsedConfig;
  } 
  catch (error) {
    console.error(`Error al cargar la configuración desde ${configPath}: ${error.message}. Usando configuración por defecto:`, defaultConfig);
    return defaultConfig;
  }
}

// [ LEE CSV ]
const readCSV = (filePath) => new Promise((resolve, reject) => {
  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => resolve(results))
    .on('error', (error) => reject(error));
});

// [ GUARDA CSV ]
const saveCSV = (data, fileName) => {
  const csvContent = [
    Object.keys(data[0]).join(','), // ENCABEZADOS
    ...data.map(row => Object.values(row).map(value => value ?? 'null').join(',')) // FILAS
  ].join('\n');
  fs.writeFileSync(fileName, csvContent);
  console.log(`[ ENCODING: ${fileName} ]`);
};

// [ GUARDA DICCIONARIO ]
const saveDictionary = (dictionaries, dictFileName, headers) => {
  if (!Array.isArray(headers)) {
    console.error('Error: "headers" no es un array válido.');
    return;
  }
  const dictContent = [
    headers.join(','), // ENCABEZADOS
    ...Object.entries(dictionaries).flatMap(([header, dictionary]) =>
      Object.entries(dictionary)
        .sort(([, a], [, b]) => a - b)
        .map(([key, value]) => `${header},${key},${value}`)
    )
  ].join('\n');
  fs.writeFileSync(dictFileName, dictContent);
  console.log(`[ DICTIONARY: ${dictFileName} ]`);
};

// [ LEE DICCIONARIO ]
const loadDictionary = async (dictFilePath) => {
  const dictionaries = {};
  if (fs.existsSync(dictFilePath)) {
    await new Promise((resolve, reject) => {
      fs.createReadStream(dictFilePath)
        .pipe(csv())
        .on('data', (row) => {
          if (!dictionaries[row.header]) dictionaries[row.header] = {};
          dictionaries[row.header][row.value] = parseInt(row.key, 10);
        })
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });
  }
  return dictionaries;
};

// [ STRING A INT ]
function stringToNumeric(existingDictionary = {}) {
  const uniqueMapping = existingDictionary;
  let uniqueCounter = Object.keys(uniqueMapping).length;
  const seenValues = new Set(Object.keys(uniqueMapping));
  return (value) => {
    if (!seenValues.has(value)) {
      uniqueMapping[value] = uniqueCounter++;
      seenValues.add(value);
    }
    return uniqueMapping[value];
  };
}

// [ MAIN ]
const main = async (inputFile, dictFile, outputFile, config) => {
  const existingDictionaries = await loadDictionary(dictFile);
  const data = await readCSV(inputFile);
  const dictionaries = { ...existingDictionaries };
  const transformedData = data.map(row => {
    const newRow = {};
    for (const key in row) {
      let value = row[key];
      if (value === null || value === '' || value === undefined || value === 'null') {
        newRow[key] = null;
        continue;
      }
      if (!dictionaries[key]) dictionaries[key] = {};
      const getNumericValue = stringToNumeric(dictionaries[key]);
      value = isNaN(value) ? getNumericValue(value) : parseFloat(value);
      newRow[key] = value;
    }
    return newRow;
  });
  saveCSV(transformedData, outputFile+'.csv');
  saveDictionary(dictionaries, dictFile+'.csv', config.headers.split(','));
};