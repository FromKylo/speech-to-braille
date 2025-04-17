/**
 * Speech Recognition Module
 * 
 * Provides a unified interface for speech recognition using either
 * the Web Speech API or local speech recognition models
 */

const speechRecognition = (function() {
    // Configuration
    const config = {
        METHOD: 'webspeech', // 'webspeech' or 'local'
        CONTINUOUS: false,
        INTERIM_RESULTS: true,
        MAX_ALTERNATIVES: 1,
        LANGUAGE: 'en-US'
    };
    
    // State
    let isListening = false;
    let recognition = null;
    let localModel = null;
    let eventHandlers = {};
    let isLocalModelLoaded = false;
    
    // Initialize speech recognition
    async function init(method = 'auto') {
        console.log('Initializing speech recognition...');
        
        // Determine recognition method
        if (method === 'auto') {
            method = detectBestMethod();
        }
        
        // Store the method in config
        config.METHOD = method;
        
        if (window.uiController) {
            uiController.showSpeechLoadingBar();
            uiController.updateSpeechLoadingProgress(10, 'Initializing speech recognition...');
        }
        
        try {
            if (method === 'webspeech') {
                // Initialize Web Speech API
                await initWebSpeech();
            } else if (method === 'local') {
                // Initialize local model
                await initLocalModel();
            } else {
                throw new Error(`Unsupported speech recognition method: ${method}`);
            }
            
            if (window.uiController) {
                uiController.updateSpeechLoadingProgress(100, 'Speech recognition ready');
                setTimeout(() => {
                    uiController.hideSpeechLoadingBar();
                }, 1000);
            }
            
            // Update UI if available
            updateModelBadge();
            
            console.log(`Speech recognition initialized using ${method} method`);
            return true;
        } catch (error) {
            console.error('Error initializing speech recognition:', error);
            
            if (window.uiController) {
                uiController.updateSpeechLoadingProgress(100, 'Error initializing speech recognition');
                setTimeout(() => {
                    uiController.hideSpeechLoadingBar();
                }, 2000);
            }
            
            return false;
        }
    }
    
    // Detect the best available speech recognition method
    function detectBestMethod() {
        // Check if Web Speech API is available
        const webSpeechAvailable = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        
        if (webSpeechAvailable) {
            console.log('Web Speech API is available');
            return 'webspeech';
        } else if (window.Worker) {
            console.log('Web Speech API not available, falling back to local model');
            return 'local';
        } else {
            console.warn('No speech recognition method is available');
            return 'webspeech'; // Default to webspeech and let it handle the error
        }
    }
    
    // Initialize Web Speech API
    async function initWebSpeech() {
        return new Promise((resolve, reject) => {
            try {
                // Check if Web Speech API is available
                const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
                
                if (!SpeechRecognitionAPI) {
                    throw new Error('Web Speech API is not supported in this browser');
                }
                
                recognition = new SpeechRecognitionAPI();
                
                // Configure recognition
                recognition.continuous = config.CONTINUOUS;
                recognition.interimResults = config.INTERIM_RESULTS;
                recognition.maxAlternatives = config.MAX_ALTERNATIVES;
                recognition.lang = config.LANGUAGE;
                
                // Set up recognition event handlers
                recognition.onstart = handleStart;
                recognition.onend = handleEnd;
                recognition.onresult = handleResult;
                recognition.onerror = handleError;
                
                // Update loading progress if UI controller available
                if (window.uiController) {
                    uiController.updateSpeechLoadingProgress(100, 'Web Speech API ready');
                }
                
                resolve();
            } catch (error) {
                console.error('Failed to initialize Web Speech API:', error);
                reject(error);
            }
        });
    }
    
    // Initialize local speech recognition model
    async function initLocalModel() {
        return new Promise((resolve, reject) => {
            try {
                if (!window.Worker) {
                    throw new Error('Web Workers are not supported in this browser, cannot load local model');
                }
                
                // Update loading progress if UI controller available
                if (window.uiController) {
                    uiController.updateSpeechLoadingProgress(20, 'Creating local model worker...');
                }
                
                // Create a Web Worker for the speech recognition model
                localModel = new Worker('js/vosk-worker.js');
                
                // Set up message handler for the Web Worker
                localModel.onmessage = (e) => {
                    const message = e.data;
                    
                    switch (message.type) {
                        case 'ready':
                            isLocalModelLoaded = true;
                            if (window.uiController) {
                                uiController.updateSpeechLoadingProgress(100, 'Local model loaded');
                            }
                            resolve();
                            break;
                            
                        case 'result':
                            if (message.isFinal) {
                                // Final result
                                triggerEvent('result', message.text);
                            } else {
                                // Interim result
                                triggerEvent('partialresult', message.text);
                            }
                            break;
                            
                        case 'error':
                            console.error('Local model error:', message.error);
                            triggerEvent('error', { message: message.error });
                            break;
                            
                        case 'progress':
                            if (window.uiController) {
                                uiController.updateSpeechLoadingProgress(
                                    message.progress, 
                                    message.status || 'Loading model...'
                                );
                            }
                            break;
                    }
                };
                
                // Initialize the local model
                localModel.postMessage({
                    type: 'init',
                    language: config.LANGUAGE
                });
                
            } catch (error) {
                console.error('Failed to initialize local speech model:', error);
                reject(error);
            }
        });
    }
    
    // Start speech recognition
    function startRecognition() {
        if (isListening) return;
        
        console.log('Starting speech recognition...');
        
        if (config.METHOD === 'webspeech' && recognition) {
            try {
                recognition.start();
            } catch (error) {
                console.error('Error starting Web Speech API:', error);
                triggerEvent('error', { message: 'Failed to start speech recognition' });
            }
        } else if (config.METHOD === 'local' && localModel) {
            if (!isLocalModelLoaded) {
                console.warn('Local model not yet loaded, trying to initialize...');
                initLocalModel()
                    .then(() => {
                        startLocalRecognition();
                    })
                    .catch(error => {
                        console.error('Failed to initialize local model:', error);
                        triggerEvent('error', { message: 'Failed to load local model' });
                    });
            } else {
                startLocalRecognition();
            }
        } else {
            console.error('No speech recognition method available');
            triggerEvent('error', { message: 'No speech recognition method available' });
        }
    }
    
    // Start local model recognition
    function startLocalRecognition() {
        if (!localModel) return;
        
        isListening = true;
        triggerEvent('start');
        
        // Request microphone access for the worker
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Create media recorder from the stream
                const mediaRecorder = new MediaRecorder(stream);
                
                // Store the media recorder and stream for later cleanup
                window.mediaRecorder = mediaRecorder;
                window.mediaStream = stream;
                
                // Set up data handler
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0 && isListening) {
                        // Send audio data to the worker
                        localModel.postMessage({
                            type: 'audio',
                            data: event.data
                        });
                    }
                };
                
                // Handle recorder stopping
                mediaRecorder.onstop = () => {
                    if (isListening) {
                        // If we're still supposed to be listening, restart recording
                        mediaRecorder.start(100);
                    }
                };
                
                // Start recording in small chunks
                mediaRecorder.start(100);
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                isListening = false;
                triggerEvent('error', { message: 'Could not access microphone' });
                triggerEvent('end');
            });
    }
    
    // Stop speech recognition
    function stopRecognition() {
        if (!isListening) return;
        
        console.log('Stopping speech recognition...');
        
        if (config.METHOD === 'webspeech' && recognition) {
            try {
                recognition.stop();
            } catch (error) {
                console.error('Error stopping Web Speech API:', error);
            }
        } else if (config.METHOD === 'local') {
            isListening = false;
            
            // Stop the media recorder if it exists
            if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
                window.mediaRecorder.stop();
            }
            
            // Stop the audio tracks if they exist
            if (window.mediaStream) {
                window.mediaStream.getTracks().forEach(track => track.stop());
            }
            
            // Tell the worker we're done listening
            if (localModel) {
                localModel.postMessage({ type: 'stop' });
            }
            
            triggerEvent('end');
        }
    }
    
    // Handle the start event from Web Speech API
    function handleStart() {
        isListening = true;
        triggerEvent('start');
    }
    
    // Handle the end event from Web Speech API
    function handleEnd() {
        isListening = false;
        triggerEvent('end');
    }
    
    // Handle the result event from Web Speech API
    function handleResult(event) {
        if (!event.results || !event.results.length) return;
        
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;
        
        if (lastResult.isFinal) {
            // Final result
            triggerEvent('result', transcript);
        } else {
            // Interim result
            triggerEvent('partialresult', transcript);
        }
    }
    
    // Handle errors from Web Speech API
    function handleError(event) {
        console.error('Speech recognition error:', event.error);
        triggerEvent('error', event);
    }
    
    // Update the model badge in the UI
    function updateModelBadge() {
        const modelBadge = document.getElementById('model-badge');
        if (modelBadge) {
            let badgeText = 'Not Available';
            let badgeClass = 'model-badge error';
            
            if (config.METHOD === 'webspeech' && recognition) {
                badgeText = 'Web Speech API';
                badgeClass = 'model-badge webspeech';
            } else if (config.METHOD === 'local' && isLocalModelLoaded) {
                badgeText = 'Local Model';
                badgeClass = 'model-badge local';
            }
            
            modelBadge.textContent = badgeText;
            modelBadge.className = badgeClass;
        }
        
        // Also update microphone status
        const micStatus = document.getElementById('mic-status');
        if (micStatus) {
            if (config.METHOD === 'webspeech' && recognition) {
                micStatus.textContent = 'Available';
                micStatus.className = 'mic-status available';
            } else if (config.METHOD === 'local' && isLocalModelLoaded) {
                micStatus.textContent = 'Available (Local)';
                micStatus.className = 'mic-status available';
            } else {
                micStatus.textContent = 'Unavailable';
                micStatus.className = 'mic-status error';
            }
        }
    }
    
    // Register event handlers
    function on(event, callback) {
        if (!eventHandlers[event]) {
            eventHandlers[event] = [];
        }
        eventHandlers[event].push(callback);
    }
    
    // Trigger events for subscribers
    function triggerEvent(event, data) {
        if (eventHandlers[event]) {
            eventHandlers[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} event handler:`, error);
                }
            });
        }
    }
    
    // Get the current status of the speech recognition system
    function getStatus() {
        return {
            method: config.METHOD,
            isListening,
            isWebSpeechAvailable: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            isLocalModelLoaded
        };
    }
    
    // Auto-initialize on load if element with id="speech-method" exists
    document.addEventListener('DOMContentLoaded', function() {
        const methodSelect = document.getElementById('speech-method');
        if (methodSelect) {
            const method = methodSelect.value || 'auto';
            init(method);
            
            // Add event listener for method changes
            methodSelect.addEventListener('change', function() {
                init(methodSelect.value);
            });
        } else {
            // No method selector found, just auto-initialize
            init('auto');
        }
        
        // Set up start/stop button event listeners
        const startBtn = document.getElementById('start-speech-btn');
        const stopBtn = document.getElementById('stop-speech-btn');
        
        if (startBtn) {
            startBtn.addEventListener('click', startRecognition);
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', stopRecognition);
        }
    });
    
    // Public API
    return {
        init,
        startRecognition,
        stopRecognition,
        on,
        getStatus
    };
})();