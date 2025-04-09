/**
 * Enhanced Speech Recognition Module
 * 
 * This module provides multiple speech recognition options:
 * 1. Web Speech API (when available)
 * 2. Local recognition using audio processing
 * 3. Optional pre-loaded models
 */

class SpeechRecognitionService {
    constructor() {
        this.recognitionActive = false;
        this.recognitionType = 'none'; // 'webspeech', 'local', 'none'
        this.audioContext = null;
        this.audioStream = null;
        this.processor = null;
        this.source = null;
        this.webSpeechRecognition = null;
        this.localRecognition = null;
        this.eventHandlers = {
            onstart: () => {},
            onend: () => {},
            onresult: () => {},
            onerror: () => {},
            onpartialresult: () => {}
        };
        this.db = null;
        this.modelLoaded = false;
        
        // Initialize available recognizers
        this._initializeRecognizers();
        this._initializeDatabase();
    }
    
    _initializeRecognizers() {
        // Try to set up Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.webSpeechRecognition = new SpeechRecognition();
            
            // Configure recognition
            this.webSpeechRecognition.continuous = true;
            this.webSpeechRecognition.interimResults = true;
            this.webSpeechRecognition.lang = 'en-US';
            
            // Set up event handlers
            this.webSpeechRecognition.onstart = () => {
                this.recognitionActive = true;
                this.eventHandlers.onstart();
            };
            
            this.webSpeechRecognition.onend = () => {
                this.recognitionActive = false;
                this.eventHandlers.onend();
            };
            
            this.webSpeechRecognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                // Process results
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                // Send interim results
                if (interimTranscript) {
                    this.eventHandlers.onpartialresult(interimTranscript);
                }
                
                // Send final results
                if (finalTranscript) {
                    this.eventHandlers.onresult(finalTranscript);
                }
            };
            
            this.webSpeechRecognition.onerror = (event) => {
                console.error('Web Speech API error:', event.error);
                this.eventHandlers.onerror(event.error);
            };
            
            console.log('Web Speech API recognition initialized');
        } else {
            console.log('Web Speech API not available');
        }
        
        // Try to load any cached model from IndexedDB
        this._loadCachedModel();
    }
    
    /**
     * Initialize IndexedDB for model storage
     * @private
     */
    _initializeDatabase() {
        if (!window.indexedDB) {
            console.log('IndexedDB not supported, offline model storage unavailable');
            return;
        }
        
        const request = indexedDB.open('SpeechRecognitionDB', 1);
        
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object store for speech model
            if (!db.objectStoreNames.contains('models')) {
                const modelStore = db.createObjectStore('models', { keyPath: 'id' });
                modelStore.createIndex('name', 'name', { unique: false });
            }
        };
        
        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('IndexedDB initialized');
            
            // Try to load cached model
            this._loadCachedModel();
        };
    }
    
    /**
     * Try to load a cached model from IndexedDB
     * @private
     */
    _loadCachedModel() {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['models'], 'readonly');
        const modelStore = transaction.objectStore('models');
        const getDefaultModel = modelStore.get('default-model');
        
        getDefaultModel.onsuccess = (event) => {
            if (event.target.result) {
                console.log('Found cached model, initializing...');
                
                // Initialize local recognition with cached model
                this._initializeLocalRecognition(event.target.result.data);
                this.modelLoaded = true;
            }
        };
    }
    
    /**
     * Initialize the local recognition engine with model data
     * @param {Object} modelData - Model data object
     * @private
     */
    _initializeLocalRecognition(modelData) {
        // In a real implementation, this would load the actual model
        // For now, we'll just set up our simulated recognition
        this.localRecognition = {
            processAudio: (audioData) => {
                // Simple audio level detection
                const audioLevel = this._calculateAudioLevel(audioData);
                
                // Simulate word detection based on audio level patterns
                this._simulateWordDetection(audioLevel);
            },
            modelData: modelData
        };
        
        this.recognitionType = 'local';
        console.log('Local recognition initialized');
    }
    
    /**
     * Store a model in IndexedDB for offline use
     * @param {String} modelId - Identifier for the model
     * @param {String} modelName - Display name for the model
     * @param {Object} modelData - Model data to store
     * @private
     */
    async _storeModel(modelId, modelName, modelData) {
        if (!this.db) {
            throw new Error('IndexedDB not available');
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['models'], 'readwrite');
            const modelStore = transaction.objectStore('models');
            
            const modelObject = {
                id: modelId,
                name: modelName,
                data: modelData,
                timestamp: Date.now()
            };
            
            const request = modelStore.put(modelObject);
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = (event) => {
                reject(new Error(`Failed to store model: ${event.target.error}`));
            };
        });
    }
    
    /**
     * Load the local recognition engine
     * @param {Object} options - Configuration options
     * @param {String} options.modelPath - Path to the local model file
     * @param {Function} options.progressCallback - Callback for loading progress
     * @returns {Promise} - Resolves when model is loaded
     */
    async loadLocalModel(options = {}) {
        const defaultOptions = {
            modelPath: '/models/speech-model.pbmm',
            modelName: 'Default Speech Model',
            progressCallback: (percent, message) => {}
        };
        
        const config = { ...defaultOptions, ...options };
        
        try {
            // Create audio context for sample rate
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Check if model is already available in IndexedDB
            if (this.modelLoaded && this.localRecognition) {
                config.progressCallback(100, 'Using cached model');
                return true;
            }
            
            // Implementation depends on whether we use DeepSpeech or a custom solution
            return new Promise((resolve, reject) => {
                // First check if we're online
                if (!navigator.onLine) {
                    // If we're not online, we can't download the model
                    // But let's check if we have it cached
                    if (this.localRecognition && this.modelLoaded) {
                        config.progressCallback(100, 'Using cached model (offline)');
                        resolve(true);
                    } else {
                        reject(new Error('Offline and no cached model available'));
                        return;
                    }
                }
                
                // Start progress updates
                let progressCounter = 0;
                const progressInterval = setInterval(() => {
                    progressCounter += 5;
                    const percent = Math.min(progressCounter, 95); // Cap at 95% until complete
                    config.progressCallback(percent, `Loading model (${percent}%)...`);
                }, 150);
                
                // Simulate model loading (in a real implementation, we'd fetch and initialize the model)
                setTimeout(async () => {
                    clearInterval(progressInterval);
                    config.progressCallback(100, 'Model loaded successfully');
                    
                    // Create a mock model data object (in a real implementation, this would be the actual model data)
                    const mockModelData = {
                        name: config.modelName,
                        type: 'simulated',
                        vocabulary: ['hello', 'world', 'speech', 'recognition', 'local', 'model', 
                            'example', 'test', 'braille', 'module'],
                        timestamp: Date.now()
                    };
                    
                    // Initialize local recognition
                    this._initializeLocalRecognition(mockModelData);
                    
                    // Store model in IndexedDB for offline use
                    try {
                        await this._storeModel('default-model', config.modelName, mockModelData);
                        console.log('Model stored in IndexedDB');
                    } catch (error) {
                        console.warn('Failed to store model in IndexedDB:', error);
                        // Continue despite storage error since recognition can still work
                    }
                    
                    this.modelLoaded = true;
                    resolve(true);
                }, 2000);
            });
        } catch (error) {
            console.error('Error loading local model:', error);
            throw error;
        }
    }
    
    // Audio utility functions
    _calculateAudioLevel(audioData) {
        // Calculate RMS of audio buffer
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }
    
    // Word simulation for the local model (temporary until real model integration)
    _simulateWordDetection(audioLevel) {
        const threshold = 0.01; // Adjust based on testing
        
        // Only process if we're receiving meaningful audio
        if (audioLevel > threshold) {
            // In a real implementation, we would use a trained model here
            // For now, just simulate words based on audio levels
            this._simulatedWordGeneration();
        }
    }
    
    // Simple word generator for demonstration (replace with real speech-to-text)
    _simulatedWordGeneration() {
        let vocabulary = ['hello', 'world', 'speech', 'recognition', 'local', 'model', 
            'example', 'test', 'braille', 'module'];
            
        // If we have a model loaded, use its vocabulary instead
        if (this.localRecognition && this.localRecognition.modelData && 
            this.localRecognition.modelData.vocabulary) {
            vocabulary = this.localRecognition.modelData.vocabulary;
        }
        
        // Randomly decide if this should be a partial or final result
        const isFinal = Math.random() > 0.7;
        
        if (isFinal) {
            const randomIndex = Math.floor(Math.random() * vocabulary.length);
            const word = vocabulary[randomIndex];
            this.eventHandlers.onresult(word + ' ');
        } else {
            const randomIndex = Math.floor(Math.random() * vocabulary.length);
            const word = vocabulary[randomIndex];
            this.eventHandlers.onpartialresult(word);
        }
    }
    
    /**
     * Start speech recognition
     * @param {String} type - Recognition type ('webspeech' or 'local')
     */
    async start(type = 'auto') {
        // If type is auto, use best available option
        if (type === 'auto') {
            if (this.webSpeechRecognition && navigator.onLine) {
                type = 'webspeech';
            } else if (this.localRecognition) {
                type = 'local';
            } else {
                throw new Error('No recognition engine available. Please load a model first.');
            }
        }
        
        if (this.recognitionActive) return;
        
        try {
            if (type === 'webspeech' && this.webSpeechRecognition) {
                // Start Web Speech API recognition
                this.webSpeechRecognition.start();
                this.recognitionType = 'webspeech';
            } else if (type === 'local' && this.localRecognition) {
                // Start local recognition
                this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                
                this.source = this.audioContext.createMediaStreamSource(this.audioStream);
                this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
                
                this.source.connect(this.processor);
                this.processor.connect(this.audioContext.destination);
                
                // Process audio data
                this.processor.onaudioprocess = (event) => {
                    const inputData = event.inputBuffer.getChannelData(0);
                    this.localRecognition.processAudio(inputData);
                };
                
                this.recognitionActive = true;
                this.recognitionType = 'local';
                this.eventHandlers.onstart();
            } else {
                throw new Error(`Recognition type '${type}' not available`);
            }
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.eventHandlers.onerror(error.message);
            throw error;
        }
    }
    
    /**
     * Stop speech recognition
     */
    stop() {
        if (!this.recognitionActive) return;
        
        if (this.recognitionType === 'webspeech' && this.webSpeechRecognition) {
            this.webSpeechRecognition.stop();
        } else if (this.recognitionType === 'local') {
            // Clean up WebAudio resources
            if (this.source) {
                this.source.disconnect();
                this.source = null;
            }
            
            if (this.processor) {
                this.processor.disconnect();
                this.processor = null;
            }
            
            if (this.audioContext && this.audioContext.state !== 'closed') {
                this.audioContext.suspend();
            }
            
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
            
            this.recognitionActive = false;
            this.eventHandlers.onend();
        }
    }
    
    /**
     * Set event handlers for recognition events
     * @param {String} event - Event name ('start', 'end', 'result', 'error', 'partialresult')
     * @param {Function} handler - Event handler function
     */
    on(event, handler) {
        if (this.eventHandlers.hasOwnProperty(event)) {
            this.eventHandlers[event] = handler;
        }
    }
    
    /**
     * Check if speech recognition is supported
     * @returns {Boolean} - True if either Web Speech API or local recognition is available
     */
    isSupported() {
        return (
            ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) ||
            this.localRecognition !== null
        );
    }
    
    /**
     * Get current recognition status
     * @returns {Object} - Status object with active state and recognition type
     */
    getStatus() {
        return {
            active: this.recognitionActive,
            type: this.recognitionType,
            modelLoaded: this.modelLoaded,
            online: navigator.onLine
        };
    }
    
    /**
     * Check if a model is available offline
     * @returns {Promise<boolean>} - Resolves with true if a model is available offline
     */
    async isModelAvailableOffline() {
        if (!this.db) return false;
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['models'], 'readonly');
            const modelStore = transaction.objectStore('models');
            const getDefaultModel = modelStore.get('default-model');
            
            getDefaultModel.onsuccess = (event) => {
                resolve(!!event.target.result);
            };
            
            getDefaultModel.onerror = () => {
                resolve(false);
            };
        });
    }
}

// Export a single instance to be used throughout the app
const speechRecognition = new SpeechRecognitionService();