/**
 * Speech Recognition Service
 * This module provides a unified interface for both Web Speech API and local model speech recognition
 */

// Create a namespace for our speech recognition functionality
const speechRecognition = (function() {
    // Event listeners
    const eventListeners = {
        'start': [],
        'end': [],
        'result': [],
        'partialresult': [],
        'error': [],
        'loadprogress': []
    };
    
    // Recognition instances
    let webSpeechRecognition = null;
    let localRecognition = null;
    let currentRecognition = null;
    
    // Web Worker for Vosk
    let voskWorker = null;
    let audioContext = null;
    let audioStream = null;
    let audioProcessor = null;
    let modelLoaded = false;
    
    // IndexedDB model storage
    const DB_NAME = 'speechToTextDB';
    const STORE_NAME = 'models';
    let db = null;
    
    // Check if Web Speech API is available
    const webSpeechAvailable = window.webkitSpeechRecognition || window.SpeechRecognition;
    
    // Initialize Web Speech API if available
    if (webSpeechAvailable) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        webSpeechRecognition = new SpeechRecognition();
        webSpeechRecognition.continuous = true;
        webSpeechRecognition.interimResults = true;
        webSpeechRecognition.lang = 'en-US';
        
        // Set up Web Speech API event handlers
        webSpeechRecognition.onstart = function() {
            triggerEvent('start');
        };
        
        webSpeechRecognition.onend = function() {
            triggerEvent('end');
        };
        
        webSpeechRecognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            if (finalTranscript) {
                triggerEvent('result', finalTranscript);
            }
            
            if (interimTranscript) {
                triggerEvent('partialresult', interimTranscript);
            }
        };
        
        webSpeechRecognition.onerror = function(event) {
            triggerEvent('error', event.error);
        };
    }
    
    // Helper function to trigger events
    function triggerEvent(eventName, data) {
        if (eventListeners[eventName]) {
            for (const callback of eventListeners[eventName]) {
                callback(data);
            }
        }
    }
    
    // Initialize IndexedDB
    function initIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported - offline model storage unavailable');
                return resolve(false);
            }
            
            const request = indexedDB.open(DB_NAME, 1);
            
            request.onerror = function(event) {
                console.error('IndexedDB error:', event);
                reject(new Error('Could not open IndexedDB'));
            };
            
            request.onupgradeneeded = function(event) {
                db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    console.log('Created IndexedDB store for speech models');
                }
            };
            
            request.onsuccess = function(event) {
                db = event.target.result;
                console.log('IndexedDB initialized successfully');
                resolve(true);
            };
        });
    }
    
    // Function to check if model is cached in IndexedDB
    async function isModelCached() {
        if (!db) {
            await initIndexedDB();
        }
        
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get('vosk-model-status');
                
                request.onsuccess = function(event) {
                    const result = event.target.result;
                    resolve(!!result && result.status === 'cached');
                };
                
                request.onerror = function() {
                    resolve(false);
                };
            } catch (error) {
                console.error('Error checking model cache:', error);
                resolve(false);
            }
        });
    }
    
    // Function to mark model as cached in IndexedDB
    async function markModelAsCached() {
        if (!db) {
            await initIndexedDB();
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                
                const modelData = {
                    id: 'vosk-model-status',
                    status: 'cached',
                    timestamp: new Date().toISOString()
                };
                
                const request = store.put(modelData);
                
                request.onsuccess = function() {
                    resolve(true);
                };
                
                request.onerror = function(event) {
                    reject(new Error('Failed to store model status: ' + event.target.error));
                };
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Function to initialize the Vosk Web Worker
    function initVoskWorker() {
        if (voskWorker) {
            voskWorker.terminate();
        }
        
        voskWorker = new Worker('js/vosk-worker.js');
        
        voskWorker.onmessage = function(event) {
            const message = event.data;
            
            switch(message.status) {
                case 'workerReady':
                    console.log('Vosk worker is ready');
                    break;
                    
                case 'loading':
                case 'init':
                    triggerEvent('loadprogress', { 
                        percent: message.status === 'loading' ? 30 : 60, 
                        message: message.message 
                    });
                    break;
                    
                case 'ready':
                    console.log('Vosk model loaded successfully');
                    modelLoaded = true;
                    triggerEvent('loadprogress', { percent: 100, message: message.message });
                    markModelAsCached()
                        .then(() => console.log('Model marked as cached in IndexedDB'))
                        .catch(error => console.error('Failed to mark model as cached:', error));
                    break;
                    
                case 'error':
                    console.error('Vosk error:', message.message);
                    triggerEvent('error', message.message);
                    break;
                    
                case 'result':
                    if (message.type === 'final') {
                        triggerEvent('result', message.text);
                    } else if (message.type === 'partial') {
                        triggerEvent('partialresult', message.text);
                    }
                    break;
            }
        };
        
        voskWorker.onerror = function(error) {
            console.error('Vosk worker error:', error);
            triggerEvent('error', 'Web worker error: ' + error.message);
        };
        
        return voskWorker;
    }
    
    // Initialize audio context for capturing audio
    async function initAudioCapture() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        try {
            // Request microphone access
            audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });
            
            // Create audio processor for Vosk
            const source = audioContext.createMediaStreamSource(audioStream);
            
            // Use AudioWorklet if available, fallback to ScriptProcessor
            if (audioContext.audioWorklet) {
                await audioContext.audioWorklet.addModule('js/audio-processor.js');
                audioProcessor = new AudioWorkletNode(audioContext, 'audio-processor', {
                    processorOptions: {
                        sampleRate: audioContext.sampleRate
                    }
                });
                
                audioProcessor.port.onmessage = (event) => {
                    if (voskWorker && event.data) {
                        voskWorker.postMessage({
                            command: 'processAudio',
                            audio: event.data
                        });
                    }
                };
            } else {
                // Fallback to ScriptProcessor (deprecated)
                audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                
                audioProcessor.onaudioprocess = function(e) {
                    if (voskWorker) {
                        const audioData = e.inputBuffer.getChannelData(0);
                        voskWorker.postMessage({
                            command: 'processAudio',
                            audio: audioData
                        });
                    }
                };
                
                // Keep ScriptProcessor alive by connecting to destination
                audioProcessor.connect(audioContext.destination);
            }
            
            // Connect the audio graph
            source.connect(audioProcessor);
            if (audioContext.audioWorklet) {
                audioProcessor.connect(audioContext.destination);
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing audio capture:', error);
            triggerEvent('error', `Microphone access error: ${error.message}`);
            return false;
        }
    }
    
    // Function to clean up audio resources
    function cleanupAudio() {
        if (audioProcessor) {
            if (audioProcessor.disconnect) {
                audioProcessor.disconnect();
            }
            audioProcessor = null;
        }
        
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
    }
    
    // Create the localRecognition implementation using Vosk
    function createVoskRecognition() {
        return {
            start: async function() {
                if (!voskWorker || !modelLoaded) {
                    throw new Error('Vosk model not loaded. Please load the model first.');
                }
                
                const audioInitialized = await initAudioCapture();
                if (!audioInitialized) {
                    throw new Error('Failed to initialize audio capture');
                }
                
                // Reset the recognizer to start fresh
                voskWorker.postMessage({ command: 'reset' });
                
                // Signal that recognition has started
                triggerEvent('start');
            },
            
            stop: function() {
                cleanupAudio();
                
                if (voskWorker) {
                    voskWorker.postMessage({ command: 'reset' });
                }
                
                triggerEvent('end');
            }
        };
    }
    
    // Public API
    return {
        // Properties
        webSpeechRecognition: !!webSpeechAvailable,
        localRecognition: null,
        
        // Methods
        isSupported: function() {
            return !!webSpeechAvailable || !!window.Worker;
        },
        
        on: function(eventName, callback) {
            if (eventListeners[eventName]) {
                eventListeners[eventName].push(callback);
            }
            return this;
        },
        
        start: async function(method = 'webspeech') {
            console.log(`Starting speech recognition with method: ${method}`);
            
            if (method === 'webspeech' && webSpeechRecognition) {
                currentRecognition = webSpeechRecognition;
                webSpeechRecognition.start();
                console.log('Web Speech recognition started');
                return true;
            } else if (method === 'local' && localRecognition) {
                currentRecognition = localRecognition;
                await localRecognition.start();
                console.log('Local recognition started');
                return true;
            } else {
                throw new Error(`Speech recognition method '${method}' is not available`);
            }
        },
        
        stop: function() {
            if (currentRecognition) {
                if (currentRecognition === webSpeechRecognition) {
                    webSpeechRecognition.stop();
                } else if (currentRecognition === localRecognition) {
                    localRecognition.stop();
                }
                currentRecognition = null;
                return true;
            }
            return false;
        },
        
        loadLocalModel: async function(options = {}) {
            const progressCallback = options.progressCallback || function() {};
            
            try {
                // Initialize IndexedDB first
                await initIndexedDB();
                
                // Setup progress event handler
                this.on('loadprogress', (data) => {
                    progressCallback(data.percent, data.message);
                });
                
                progressCallback(10, 'Initializing Vosk...');
                
                // Initialize Vosk worker
                const worker = initVoskWorker();
                
                // Check if model is already cached
                const modelIsCached = await isModelCached();
                
                // Load the Vosk model
                worker.postMessage({
                    command: 'loadModel',
                    modelUrl: options.modelUrl || 'https://cdn.jsdelivr.net/gh/ccoreilly/vosk-browser@master/public/models/vosk-model-small-en-us-0.15',
                    sampleRate: 16000
                });
                
                // Wait for the model to load
                return new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error('Model loading timed out after 30 seconds'));
                    }, 30000);
                    
                    const onLoadProgress = (data) => {
                        if (data.percent === 100) {
                            clearTimeout(timeoutId);
                            // Create and store the Vosk recognition implementation
                            localRecognition = createVoskRecognition();
                            // Remove the temporary handler
                            const index = eventListeners['loadprogress'].indexOf(onLoadProgress);
                            if (index > -1) {
                                eventListeners['loadprogress'].splice(index, 1);
                            }
                            resolve();
                        }
                    };
                    
                    // Add temporary handler for load completion
                    eventListeners['loadprogress'].push(onLoadProgress);
                    
                    // Add error handler
                    const onError = (error) => {
                        const index = eventListeners['error'].indexOf(onError);
                        if (index > -1) {
                            eventListeners['error'].splice(index, 1);
                        }
                        clearTimeout(timeoutId);
                        reject(new Error(`Failed to load Vosk model: ${error}`));
                    };
                    
                    eventListeners['error'].push(onError);
                });
            } catch (error) {
                console.error('Error loading Vosk model:', error);
                throw error;
            }
        },
        
        isModelAvailableOffline: async function() {
            await initIndexedDB();
            return await isModelCached();
        }
    };
})();

// Log initialization
console.log('Speech recognition module initialized:', {
    webSpeech: speechRecognition.webSpeechRecognition,
    supported: speechRecognition.isSupported()
});