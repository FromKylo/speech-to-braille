const config = require('./config');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

exports.listen = function(duration, callback) {
  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
    interimResults: false,
  };

  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error)
    .on('data', data => {
      if (data.results[0] && data.results[0].alternatives[0]) {
        const recognizedText = data.results[0].alternatives[0].transcript;
        callback(recognizedText);
      }
    });

  // Set timeout based on the config duration
  const timer = setTimeout(() => {
    recognizeStream.end();
  }, duration * 1000);
};