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
                
                // Load the model using the CDN path for vosk-browser WebAssembly
                const modelUrl = message.modelUrl || 'https://cdn.jsdelivr.net/gh/ccoreilly/vosk-browser@master/public/models/vosk-model-small-en-us-0.15';
                
                model = await vosk.createModel(modelUrl);
                
                self.postMessage({status: 'init', message: 'Creating recognizer...'});
                
                // Create the recognizer with the specified sample rate
                recognizer = new vosk.Recognizer({
                    model: model,
                    sampleRate: message.sampleRate
                });
                
                self.postMessage({status: 'ready', message: 'Model loaded successfully'});
            } catch (error) {
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
