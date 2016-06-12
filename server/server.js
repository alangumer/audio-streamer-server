var fs = require('fs');
var connect = require('connect');
var https = require('https');

// http://binaryjs.com/
// Realtime binary streaming for the web using websockets
var binaryServer = require('binaryjs').BinaryServer;
// https://github.com/TooTallNate/node-wav
var wav = require('wav');
// https://github.com/TooTallNate/node-lame
var lame = require('lame');

/* crear la carpeta para almacenar la grabaciones */
if(!fs.existsSync("recordings"))
  fs.mkdirSync("recordings");

/* utilizar certificados ssl para el desarrollo local */
var options = {
  key:    fs.readFileSync('ssl/server.key'),
  cert:   fs.readFileSync('ssl/server.crt'),
};

/* conectar el servidor HTTP a la aplicacion */
var app = connect();

/* crear el servidor y escuchar en el puerto 9191 */
var server = https.createServer(options,app);
server.listen(9191);

/* crear el servidor binario para la conexion a traves de sockets */
var server = binaryServer({server:server});

/* escuchar las conneciones desde el cliente */
server.on('connection', function(client) {
  
  console.log("new connection...");
  // inicializar las variables para escritura una vez se genere el evento stream
  var fileWriter = null;
  var writeStream = null;
  
  /* evento stream se genera al iniciar la grabacion y todo el tiempo que dure */
  client.on('stream', function(stream, meta) {

    console.log("Stream Start@" + meta.sampleRate +"Hz");
    var fileName = "recordings/" + "_" + new Date().getTime();
    
    /* Hay dos formas de grabar el audio que viene del stream
      por default viene en PCM lo cual significa que viene intacto sin ninguna modificacion
      esto significa que el audio va ser de la mejor calidad, siendo que no viene comprimido ocupara mas espacio,
      La primera opcion es guardarlo como WAV que recibe el PCM intacto.
      La segunda opcion es codificarlo en MP3 para eso usamos la libreria node-lame, en este caso el archivo sera
      mucho mas pequenio con una pequenia perdida de calidad del audio.
      Comentar o descomentar una de las dos opciones de abajo segun sea mejor, por default esta funcionando la codificacion en MP3
    */
      
    /* opcion 1 codificar en WAV */
    /* The Writer class accepts raw audio data written to it (only PCM audio data is currently supported), and outputs a WAV file with a valid WAVE header at the       beginning specifying the formatting information of the audio stream.
    */
    /*fileWriter = new wav.FileWriter(fileName + ".wav", {
        channels: 1,
        sampleRate: meta.sampleRate,
        bitDepth: 16
    });
    stream.pipe(fileWriter);*/
    
    
    /* opcion 2 codificar en MP3 */
    // https://github.com/TooTallNate/node-lame
    writeStream = fs.createWriteStream( fileName + ".mp3" );
    stream.pipe( new lame.Encoder(
      {
        channels: 1, bitDepth: 16, sampleRate: 44100, bitRate: 128, outSampleRate: 22050, mode: lame.MONO
      })
    )
    .pipe( writeStream );
  });
  
  /* Se genera el evento close, cuando el usuario para la grabacion, en este momento se finaliza la grabacion y escritura del archivo de audio */
  client.on('close', function() {
    if ( fileWriter != null ) {
      fileWriter.end();
    } else if ( writeStream != null ) {
      writeStream.end();
    }
    console.log("Connection Closed");
  });
});
