/**
 * Speech Recognition Manager
 * Handles both Web Speech API and local recognition methods
 */
class SpeechRecognitionManager {
    constructor() {
        this.isRecording = false;
        this.selectedMethod = 'webspeech'; // Default to Web Speech API
        this.recognition = null;
        this.localRecognition = null;
        this._recognitionActive = false; // Track actual recognition state
        this._pendingRestart = false;
        this._initializationAttempted = false; // Track if initialization was attempted
        this._permissionGranted = null; // Track microphone permission: null=unknown, true=granted, false=denied
        this.eventListeners = {
            'start': [],
            'end': [],
            'result': [],
            'partialresult': [],
            'error': []
        };
        
        // Initialize Web Speech API recognition
        this.initWebSpeechRecognition();
        
        // UI Elements - Initialize after DOM is loaded
        window.addEventListener('DOMContentLoaded', () => {
            this.initUIElements();
        });
    }
    
    /**
     * Initialize Web Speech API recognition
     */
    initWebSpeechRecognition() {
        // Detect Speech Recognition API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            try {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                
                // Set up event handlers with improved error handling
                this.recognition.onstart = () => {
                    console.log('Web Speech recognition started');
                    this.isRecording = true;
                    this._recognitionActive = true;
                    this.triggerEvent('start');
                    this.updateUIState(true);
                };
                
                this.recognition.onresult = (event) => {
                    this.handleSpeechResult(event);
                };
                
                this.recognition.onend = () => {
                    console.log('Web Speech recognition ended');
                    this._recognitionActive = false;
                    
                    // Only restart if we're still in recording mode and no pending restart
                    if (this.isRecording && this.selectedMethod === 'webspeech' && !this._pendingRestart) {
                        console.log('Auto-restarting Web Speech recognition');
                        try {
                            // Add a small delay before restarting to avoid rapid restart issues
                            setTimeout(() => {
                                if (this.isRecording && !this._recognitionActive) {
                                    console.log('Executing delayed restart of recognition');
                                    this.recognition.start();
                                    this._recognitionActive = true;
                                }
                            }, 300);
                        } catch (e) {
                            console.error('Error restarting recognition:', e);
                            this.isRecording = false;
                            this.updateUIState(false);
                            this.triggerEvent('error', 'Failed to restart recognition: ' + e.message);
                            this.triggerEvent('end');
                        }
                    } else {
                        if (this._pendingRestart) {
                            console.log('Handling pending restart after onend');
                            this._pendingRestart = false;
                            try {
                                setTimeout(() => {
                                    this.startRecognition();
                                }, 300);
                            } catch (e) {
                                console.error('Error handling pending restart:', e);
                                this.isRecording = false;
                                this.updateUIState(false);
                                this.triggerEvent('end');
                            }
                        } else {
                            this.isRecording = false;
                            this.updateUIState(false);
                            this.triggerEvent('end');
                        }
                    }
                };
                
                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    
                    // Handle specific error types
                    switch(event.error) {
                        case 'not-allowed':
                        case 'permission-denied':
                            this._permissionGranted = false;
                            this.triggerEvent('error', 'Microphone permission denied. Please allow microphone access.');
                            // Show a visible error to the user
                            this.showError('Microphone permission denied. Please allow microphone access and reload the page.');
                            break;
                            
                        case 'no-speech':
                            // This is common and not always an error - just log it
                            console.log('No speech detected, continuing...');
                            break;
                            
                        case 'network':
                            this.triggerEvent('error', 'Network error occurred. Check your connection.');
                            this.showError('Network issue detected. Check your internet connection.');
                            break;
                            
                        default:
                            this.triggerEvent('error', `Recognition error: ${event.error}`);
                    }
                    
                    // Don't update UI state here - let onend handle it
                };
                
                this._initializationAttempted = true;
                console.log('Web Speech API initialized successfully');
            } catch (e) {
                console.error('Failed to initialize Web Speech API:', e);
                this._initializationAttempted = false;
                this.triggerEvent('error', 'Failed to initialize speech recognition: ' + e.message);
            }
        } else {
            console.warn('Web Speech API not supported in this browser');
            this._initializationAttempted = false;
            this.triggerEvent('error', 'Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        }
    }
    
    /**
     * Show user-visible error message
     */
    showError(message) {
        // Create an error element or use an existing one
        let errorElement = document.getElementById('speech-recognition-error');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'speech-recognition-error';
            errorElement.style.backgroundColor = '#f8d7da';
            errorElement.style.color = '#721c24';
            errorElement.style.padding = '10px';
            errorElement.style.margin = '10px 0';
            errorElement.style.borderRadius = '4px';
            errorElement.style.fontWeight = 'bold';
            
            // Find a good place to show the error
            const container = document.querySelector('.speech-output-container') || 
                            document.getElementById('speech-output') ||
                            document.body;
                            
            if (container) {
                container.prepend(errorElement);
            }
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after a while
        setTimeout(() => {
            if (errorElement) {
                errorElement.style.opacity = '0';
                errorElement.style.transition = 'opacity 1s';
                setTimeout(() => {
                    if (errorElement && errorElement.parentNode) {
                        errorElement.parentNode.removeChild(errorElement);
                    }
                }, 1000);
            }
        }, 5000);
    }

    /**
     * Initialize UI elements and event handlers
     */
    initUIElements() {
        this.startButton = document.getElementById('start-speech-btn');
        this.stopButton = document.getElementById('stop-speech-btn');
        this.methodSelector = document.getElementById('speech-method');
        this.recordingIndicator = document.getElementById('recording-indicator');
        
        if (!this.startButton || !this.stopButton || !this.methodSelector) {
            console.error('Speech recognition UI elements not found');
            return;
        }
        
        // Bind event handlers
        this.startButton.addEventListener('click', () => {
            console.log('Start button clicked');
            this.startRecognition();
        });
        
        this.stopButton.addEventListener('click', () => {
            console.log('Stop button clicked');
            this.stopRecognition();
        });
        
        this.methodSelector.addEventListener('change', (e) => {
            this.selectedMethod = e.target.value;
            console.log(`Speech method changed to: ${this.selectedMethod}`);
            // If currently recording, restart with new method
            if (this.isRecording) {
                this.stopRecognition();
                this.startRecognition();
            }
        });
        
        // Initialize UI state
        this.updateUIState(false);
    }
    
    /**
     * Register event listeners
     */
    on(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].push(callback);
        }
        return this;
    }
    
    /**
     * Trigger registered event handlers
     */
    triggerEvent(eventName, data) {
        if (this.eventListeners[eventName]) {
            for (const callback of this.eventListeners[eventName]) {
                callback(data);
            }
        }
    }
    
    /**
     * Check and request microphone permission explicitly
     */
    async checkMicrophonePermission() {
        try {
            console.log('Explicitly checking microphone permission...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Permission granted
            this._permissionGranted = true;
            console.log('Microphone permission granted');
            
            // Stop the tracks immediately as we only needed to check permission
            stream.getTracks().forEach(track => track.stop());
            
            return true;
        } catch (err) {
            console.error('Microphone permission error:', err);
            this._permissionGranted = false;
            this.triggerEvent('error', 'Microphone permission denied: ' + err.message);
            this.showError('Microphone access denied. Please allow microphone access in your browser settings and reload the page.');
            return false;
        }
    }
    
    /**
     * Start speech recognition based on selected method
     */
    async startRecognition() {
        console.log(`Attempting to start ${this.selectedMethod} recognition`);
        
        if (this.isRecording) {
            console.log('Already recording, ignoring start request');
            return;
        }
        
        // Check if initialization failed previously
        if (!this._initializationAttempted && this.selectedMethod === 'webspeech') {
            console.log('Attempting to re-initialize Web Speech API');
            this.initWebSpeechRecognition();
        }
        
        // Check microphone permission first if not already granted
        if (this._permissionGranted === null || this._permissionGranted === false) {
            const permissionGranted = await this.checkMicrophonePermission();
            if (!permissionGranted) {
                console.error('Cannot start recognition without microphone permission');
                return;
            }
        }
        
        if (this.selectedMethod === 'webspeech') {
            if (this.recognition) {
                try {
                    console.log('Starting Web Speech API recognition');
                    this.recognition.start();
                    this._recognitionActive = true;
                    // Note: onstart event will set isRecording and update UI
                } catch (e) {
                    console.error('Error starting Web Speech API:', e);
                    
                    // If we get "already started" error, update our state to match reality
                    if (e.message && e.message.includes('already started')) {
                        console.log('Recognition was already running, updating state to match');
                        this.isRecording = true;
                        this._recognitionActive = true;
                        this.updateUIState(true);
                        this.triggerEvent('start');
                    } else {
                        this.updateUIState(false);
                        this.triggerEvent('error', e.message);
                        this.showError('Failed to start speech recognition: ' + e.message);
                    }
                }
            } else {
                console.error('Web Speech API not supported or not initialized');
                this.updateUIState(false);
                this.triggerEvent('error', 'Web Speech API not supported in this browser');
                this.showError('Speech recognition is not supported in this browser. Please try using Chrome or Edge.');
            }
        } else if (this.selectedMethod === 'local') {
            // Start local recognition - Not fully implemented yet
            console.log('Local recognition would start here');
            this.triggerEvent('error', 'Local recognition not fully implemented');
            // For demo purposes, set recording state to true
            this.isRecording = true;
            this.updateUIState(true);
            this.triggerEvent('start');
        }
    }
    
    /**
     * Stop speech recognition
     */
    stopRecognition() {
        console.log(`Stopping ${this.selectedMethod} recognition`);
        this.isRecording = false; // Set this first to prevent auto-restart
        
        if (this.selectedMethod === 'webspeech' && this.recognition) {
            try {
                // This will trigger onend event
                this.recognition.stop();
                this._recognitionActive = false;
                console.log('Web Speech API recognition stopped');
                
                // Automatically restart after a short delay to maintain always-on behavior
                setTimeout(() => {
                    if (!this.isRecording && !this._pendingRestart) {
                        console.log('Auto-restarting speech recognition');
                        this.startRecognition();
                    }
                }, 1000);
            } catch (e) {
                console.error('Error stopping Web Speech API:', e);
                this._recognitionActive = false;
                this.triggerEvent('error', e.message);
            }
        } else if (this.selectedMethod === 'local') {
            // Stop local recognition
            console.log('Local recognition would stop here');
            this.updateUIState(false);
            this.triggerEvent('end');
            
            // Auto-restart local recognition as well
            setTimeout(() => {
                if (!this.isRecording) {
                    console.log('Auto-restarting local speech recognition');
                    this.startRecognition();
                }
            }, 1000);
        }
    }
    
    /**
     * Pause speech recognition without fully stopping it
     */
    pauseRecognition() {
        if (this.isRecording && this.recognition) {
            console.log('Temporarily pausing speech recognition');
            try {
                this.recognition.stop();
                // Don't update isRecording flag so we know to restart
            } catch (e) {
                console.error('Error pausing recognition:', e);
            }
        }
    }
    
    /**
     * Check if speech recognition is supported
     */
    isSupported() {
        // More reliable check - returns true even if the exact features aren't detected
        // Many browsers will still work with speech recognition even when they don't 
        // report proper support through feature detection
        return true; 
        
        // Original check was too restrictive:
        // return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }
    
    /**
     * Handle speech recognition results
     */
    handleSpeechResult(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
                console.log('Final transcript:', finalTranscript);
                // Process final transcript
                this.triggerEvent('result', finalTranscript);
            } else {
                interimTranscript += transcript;
                console.log('Interim transcript:', interimTranscript);
                // Update interim display
                this.triggerEvent('partialresult', interimTranscript);
            }
        }
        
        // Update UI with transcripts
        this.updateInterimDisplay(interimTranscript);
        if (finalTranscript) {
            this.processFinalTranscript(finalTranscript);
        }
    }
    
    /**
     * Process final transcript
     */
    processFinalTranscript(transcript) {
        // Update final text display
        const finalTextElement = document.getElementById('final-text');
        if (finalTextElement) {
            finalTextElement.textContent += transcript + ' ';
        }
        
        // Dispatch event for other components to use
        const event = new CustomEvent('speechResult', { 
            detail: { text: transcript, final: true }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Update interim display
     */
    updateInterimDisplay(transcript) {
        const interimTextElement = document.getElementById('interim-text');
        if (interimTextElement) {
            interimTextElement.textContent = transcript;
        }
    }
    
    /**
     * Update UI state based on recording status
     */
    updateUIState(isRecording) {
        console.log(`Updating UI recording state: ${isRecording}`);
        
        // Update button states
        if (this.startButton) {
            this.startButton.disabled = isRecording;
        }
        if (this.stopButton) {
            this.stopButton.disabled = !isRecording;
        }
        
        // Update recording indicator
        if (this.recordingIndicator) {
            if (isRecording) {
                this.recordingIndicator.classList.remove('recording-off');
                this.recordingIndicator.classList.add('recording-on');
            } else {
                this.recordingIndicator.classList.remove('recording-on');
                this.recordingIndicator.classList.add('recording-off');
            }
        }
    }
}

// Initialize on page load
let speechRecognition;
window.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing speech recognition manager');
    speechRecognition = new SpeechRecognitionManager();
    
    // Make it globally accessible for debugging
    window.speechRecognition = speechRecognition;
    
    // Add debug button to check microphone access
    const speechControls = document.getElementById('speech-controls');
    if (speechControls) {
        const debugButton = document.createElement('button');
        debugButton.textContent = 'Check Mic';
        debugButton.style.backgroundColor = '#7b1fa2';
        debugButton.style.marginLeft = '5px';
        debugButton.addEventListener('click', async () => {
            await speechRecognition.checkMicrophonePermission();
        });
        speechControls.appendChild(debugButton);
    }
    
    // Force enable the start button
    const startButton = document.getElementById('start-speech-btn');
    if (startButton) {
        startButton.disabled = false;
        console.log('Start button enabled from speech-recognition.js');
    }
});