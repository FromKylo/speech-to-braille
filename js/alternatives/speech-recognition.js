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
        'error': []
    };
    
    // Recognition instances
    let webSpeechRecognition = null;
    let localRecognition = null;
    let currentRecognition = null;
    
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
    
    // Public API
    return {
        // Properties
        webSpeechRecognition: !!webSpeechAvailable,
        localRecognition: null,
        
        // Methods
        isSupported: function() {
            return !!webSpeechAvailable || !!localRecognition;
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
            
            // Simulate loading progress for demonstration
            // In a real implementation, you would load the actual speech recognition model here
            progressCallback(10, 'Starting model download...');
            
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    progressCallback(30, 'Downloading model files...');
                    
                    setTimeout(() => {
                        progressCallback(60, 'Installing model...');
                        
                        setTimeout(() => {
                            progressCallback(90, 'Finalizing setup...');
                            
                            try {
                                // Create a mock local recognition implementation
                                localRecognition = {
                                    start: async function() {
                                        console.log('Starting local speech recognition');
                                        triggerEvent('start');
                                        
                                        // Start listening for audio here
                                        // This would normally connect to WebAudio and process audio data
                                        
                                        // For demo purposes, simulate some speech results
                                        this.resultInterval = setInterval(() => {
                                            triggerEvent('partialresult', 'Simulated interim results...');
                                            
                                            // Periodically send a final result
                                            if (Math.random() > 0.7) {
                                                triggerEvent('result', 'This is a simulated final result.');
                                            }
                                        }, 1000);
                                    },
                                    
                                    stop: function() {
                                        console.log('Stopping local speech recognition');
                                        clearInterval(this.resultInterval);
                                        triggerEvent('end');
                                    }
                                };
                                
                                progressCallback(100, 'Model ready!');
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        }, 1000);
                    }, 1000);
                }, 1000);
            });
        },
        
        isModelAvailableOffline: async function() {
            // In a real implementation, you would check IndexedDB for the model
            return !!localRecognition;
        }
    };
})();

// Log initialization
console.log('Speech recognition module initialized:', {
    webSpeech: speechRecognition.webSpeechRecognition,
    supported: speechRecognition.isSupported()
});