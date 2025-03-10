const fs = require('fs');

// OBTENER ARGUMENTOS DESDE LA TERMINAL
const [inputFilePath, outputFilePath, additionalText] = process.argv.slice(2);

// VALIDAR ARGUMENTOS
if (!inputFilePath || !outputFilePath || !additionalText) {
    console.error("ERROR: DEBES PROPORCIONAR TRES ARGUMENTOS: ENTRADA, SALIDA Y ARG1");
    process.exit(1); // SALIR SI FALTAN ARGUMENTOS
}

try {
    // LEER EL ARCHIVO JSON DE ENTRADA
    const inputData = fs.readFileSync(inputFilePath, 'utf-8');
    const jsonData = JSON.parse(inputData);

    // AGREGAR EL NUEVO PARÁMETRO 'ARG1' AL JSON
    jsonData.texto = additionalText;

    // GUARDAR EL JSON MODIFICADO EN EL ARCHIVO DE SALIDA
    fs.writeFileSync(outputFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log(`ARCHIVO GUARDADO CON ÉXITO EN: ${outputFilePath}`);
} 
catch (error) {
    // MOSTRAR ERRORES
    console.error("ERROR:", error.message);
}

// node ejemplo.js ruta/entrada.json ruta/salida.json "arg1"
