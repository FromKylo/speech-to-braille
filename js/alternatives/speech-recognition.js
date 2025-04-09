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
                this.triggerEvent('start');
                this.updateUIState(true);
            };
            
            this.recognition.onresult = (event) => {
                this.handleSpeechResult(event);
            };
            
            this.recognition.onend = () => {
                console.log('Web Speech recognition ended');
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
            return;
        }
        
        if (this.selectedMethod === 'webspeech') {
            if (this.recognition) {
                try {
                    console.log('Starting Web Speech API recognition');
                    this.recognition.start();
                    // Note: onstart event will set isRecording and update UI
                } catch (e) {
                    console.error('Error starting Web Speech API:', e);
                    this.updateUIState(false);
                    this.triggerEvent('error', e.message);
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
                console.log('Web Speech API recognition stopped');
            } catch (e) {
                console.error('Error stopping Web Speech API:', e);
                this.triggerEvent('error', e.message);
            }
        } else if (this.selectedMethod === 'local') {
            // Stop local recognition
            console.log('Local recognition would stop here');
            this.updateUIState(false);
            this.triggerEvent('end');
        }
    }
    
    /**
     * Check if speech recognition is supported
     */
    isSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
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
});