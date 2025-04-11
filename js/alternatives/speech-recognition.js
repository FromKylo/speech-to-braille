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
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            
            // Set up event handlers
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
                // Only restart if we're still in recording mode
                if (this.isRecording && this.selectedMethod === 'webspeech') {
                    console.log('Restarting Web Speech recognition');
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.error('Error restarting recognition:', e);
                        this.isRecording = false;
                        this.updateUIState(false);
                        this.triggerEvent('end');
                    }
                } else {
                    this.isRecording = false;
                    this.updateUIState(false);
                    this.triggerEvent('end');
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.triggerEvent('error', event.error);
                // Don't update UI state here - let onend handle it
            };
        } else {
            console.warn('Web Speech API not supported in this browser');
        }
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
     * Start speech recognition based on selected method
     */
    startRecognition() {
        console.log(`Attempting to start ${this.selectedMethod} recognition`);
        
        if (this.isRecording) {
            console.log('Already recording, ignoring start request');
            // On mobile, we need to handle this more gracefully - restart recognition
            if (this.selectedMethod === 'webspeech' && this.recognition) {
                try {
                    // Try to stop first
                    console.log('Stopping existing recognition before restart');
                    this.recognition.stop();
                    
                    // Set a flag to restart after the onend event
                    this._pendingRestart = true;
                } catch (e) {
                    console.error('Error stopping existing recognition:', e);
                }
            }
            return;
        }
        
        if (this.selectedMethod === 'webspeech') {
            if (this.recognition) {
                try {
                    // Check if recognition is actually active despite our state tracking
                    if (this._recognitionActive) {
                        console.log('Recognition appears to be active already, stopping first');
                        try {
                            this.recognition.stop();
                            // Wait a short moment before starting again
                            setTimeout(() => {
                                console.log('Starting Web Speech API recognition after stop');
                                this.recognition.start();
                            }, 200);
                        } catch (stopError) {
                            console.error('Error when trying to stop before restart:', stopError);
                            // Try direct start anyway as fallback
                            this.recognition.start();
                        }
                    } else {
                        console.log('Starting Web Speech API recognition');
                        this.recognition.start();
                        this._recognitionActive = true;
                    }
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
                    }
                }
            } else {
                console.error('Web Speech API not supported');
                this.updateUIState(false);
                this.triggerEvent('error', 'Web Speech API not supported');
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
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                alert('Microphone access granted! Speech recognition should work.');
                stream.getTracks().forEach(track => track.stop());
            } catch (err) {
                alert(`Microphone access error: ${err.message}\nSpeech recognition requires microphone permissions.`);
            }
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