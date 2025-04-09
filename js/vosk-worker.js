// Web Worker for Vosk speech processing

importScripts('../node_modules/vosk-browser/dist/vosk.js');

let recognizer;
let model;

// Handle messages from the main thread
self.onmessage = async function(event) {
    const message = event.data;
    
    switch(message.command) {
        case 'loadModel':
            try {
                self.postMessage({status: 'loading', message: 'Downloading speech model...'});
                
                // Get the model URL from the message or use a reliable default
                const modelUrl = message.modelUrl || 'https://alphacephei.com/kaldi/models/vosk-model-small-en-us-0.15.zip';
                
                // Check if it's a ZIP file
                if (modelUrl.endsWith('.zip')) {
                    self.postMessage({status: 'loading', message: 'Downloading and extracting ZIP model...'});
                    model = await vosk.createModelFromZip(modelUrl);
                } else {
                    // It's a directory-based model
                    model = await vosk.createModel(modelUrl);
                }
                
                self.postMessage({status: 'init', message: 'Creating recognizer...'});
                
                // Create the recognizer with the specified sample rate
                recognizer = new vosk.Recognizer({
                    model: model,
                    sampleRate: message.sampleRate || 16000
                });
                
                self.postMessage({status: 'ready', message: 'Model loaded successfully'});
            } catch (error) {
                console.error('Vosk model loading error:', error);
                self.postMessage({
                    status: 'error',
                    message: 'Failed to load model: ' + error.message
                });
            }
            break;
            
        case 'processAudio':
            // Process audio data if recognizer is ready
            if (recognizer) {
                const audioData = message.audio;
                
                // Process audio with Vosk
                const result = recognizer.acceptWaveform(audioData);
                
                // Send results back to main thread
                if (result) {
                    // Final result
                    self.postMessage({
                        status: 'result',
                        type: 'final',
                        text: recognizer.result().text
                    });
                } else {
                    // Partial result
                    self.postMessage({
                        status: 'result',
                        type: 'partial',
                        text: recognizer.partialResult().partial
                    });
                }
            }
            break;
            
        case 'reset':
            // Reset the recognizer to start fresh
            if (recognizer) {
                recognizer.reset();
            }
            break;
            
        case 'terminate':
            // Clean up before terminating
            if (recognizer) {
                recognizer.free();
            }
            if (model) {
                model.free();
            }
            self.close();
            break;
    }
};

// Inform the main thread that the worker is ready
self.postMessage({status: 'workerReady', message: 'Vosk worker initialized'});
