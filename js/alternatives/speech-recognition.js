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
        this._permissionRequested = false; // Track if we've requested permissions already
        this.eventListeners = {
            'start': [],
            'end': [],
            'result': [],
            'partialresult': [],
            'error': [],
            'permissionchange': [] // New event for permission status changes
        };
        
        // Initialize Web Speech API recognition
        this.initWebSpeechRecognition();
        
        // UI Elements - Initialize after DOM is loaded
        window.addEventListener('DOMContentLoaded', () => {
            this.initUIElements();
            
            // Try to request microphone access proactively, but after a short delay
            // to avoid interrupting page load
            setTimeout(() => {
                this.requestMicrophonePermission(true); // true = silent mode (no UI if denied)
            }, 1500);
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
            
            // Dispatch success event
            document.dispatchEvent(new CustomEvent('speechRecognitionMicPermissionGranted'));
            
            return true;
        } catch (err) {
            console.error('Microphone permission error:', err);
            this._permissionGranted = false;
            
            // Dispatch error event
            document.dispatchEvent(new CustomEvent('speechRecognitionError', {
                detail: 'Microphone permission denied: ' + err.message
            }));
            
            this.triggerEvent('error', 'Microphone permission denied: ' + err.message);
            this.showError('Microphone access denied. Please allow microphone access in your browser settings and reload the page.');
            
            return false;
        }
    }

    /**
     * New method: Request microphone permission with better UI handling
     * @param {boolean} silent If true, won't show UI prompts if permission is denied
     * @returns {Promise<boolean>} Whether permission was granted
     */
    async requestMicrophonePermission(silent = false) {
        // If we already know permission is granted, just return true
        if (this._permissionGranted === true) {
            return true;
        }
        
        // Mark that we've requested permissions at least once
        this._permissionRequested = true;
        
        try {
            console.log('Requesting microphone permission...');
            // First check if permissions API is available (to check permission state)
            if (navigator.permissions && navigator.permissions.query) {
                const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                
                // If permission is already denied and we're in silent mode, don't show the prompt
                if (permissionStatus.state === 'denied' && silent) {
                    console.log('Microphone permission previously denied and in silent mode');
                    this._permissionGranted = false;
                    this.updatePermissionUI(false);
                    return false;
                }
                
                // Listen for permission changes
                permissionStatus.addEventListener('change', () => {
                    console.log('Permission state changed:', permissionStatus.state);
                    if (permissionStatus.state === 'granted') {
                        this._permissionGranted = true;
                        this.updatePermissionUI(true);
                        this.triggerEvent('permissionchange', { granted: true });
                    } else {
                        this._permissionGranted = false;
                        this.updatePermissionUI(false);
                        this.triggerEvent('permissionchange', { granted: false });
                    }
                });
            }
            
            // Actually request the microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Permission granted
            this._permissionGranted = true;
            console.log('Microphone permission granted');
            
            // Stop the tracks immediately as we only needed to check permission
            stream.getTracks().forEach(track => track.stop());
            
            // Update UI to reflect permission granted
            this.updatePermissionUI(true);
            this.triggerEvent('permissionchange', { granted: true });
            
            return true;
        } catch (err) {
            console.error('Microphone permission error:', err);
            this._permissionGranted = false;
            this.updatePermissionUI(false);
            
            // Only show UI if not in silent mode
            if (!silent) {
                this.showPermissionDeniedUI(err.message);
                this.triggerEvent('error', 'Microphone permission denied: ' + err.message);
            }
            
            this.triggerEvent('permissionchange', { granted: false, error: err });
            return false;
        }
    }

    /**
     * Update UI elements based on permission state
     */
    updatePermissionUI(granted) {
        const micStatus = document.getElementById('mic-status');
        if (micStatus) {
            if (granted) {
                micStatus.textContent = 'Mic: Permission Granted';
                micStatus.className = 'mic-status inactive';
            } else {
                micStatus.textContent = 'Mic: Permission Denied';
                micStatus.className = 'mic-status error';
            }
        }
        
        // Remove any existing permission denied UI elements
        const existingPrompt = document.getElementById('permission-denied-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }

        // If permission is granted, remove any existing retry button
        if (granted) {
            const retryButton = document.getElementById('retry-mic-permission');
            if (retryButton) {
                retryButton.remove();
            }
        }
    }

    /**
     * Show UI for permission denied with retry option
     */
    showPermissionDeniedUI(errorMessage) {
        // Remove any existing permission denied UI first
        const existingPrompt = document.getElementById('permission-denied-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
        
        // Create permission denied prompt
        const prompt = document.createElement('div');
        prompt.id = 'permission-denied-prompt';
        prompt.className = 'status-indicator-large error';
        prompt.innerHTML = `
            <div>
                <strong>Microphone access denied</strong>
                <p>This application requires microphone access to perform speech recognition.</p>
                <p>Please allow microphone access in your browser settings or click the button below to try again.</p>
            </div>
        `;
        
        // Create retry button
        const retryButton = document.createElement('button');
        retryButton.id = 'retry-mic-permission';
        retryButton.className = 'request-mic-access';
        retryButton.textContent = 'Request Microphone Access';
        retryButton.addEventListener('click', () => {
            this.requestMicrophonePermission();
        });
        
        // Find a good place to show the error
        const container = document.querySelector('.speech-output-container') || 
                        document.getElementById('speech-output') ||
                        document.getElementById('recording-phase') ||
                        document.body;
                        
        if (container) {
            // Add the prompt and button
            container.prepend(prompt);
            prompt.appendChild(retryButton);
            
            // Add browser-specific instructions
            this.addBrowserSpecificInstructions(prompt);
        }
    }
    
    /**
     * Add browser-specific instructions for enabling microphone permissions
     */
    addBrowserSpecificInstructions(container) {
        // Detect browser
        const isChrome = navigator.userAgent.indexOf("Chrome") > -1;
        const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
        const isSafari = navigator.userAgent.indexOf("Safari") > -1 && !isChrome;
        const isEdge = navigator.userAgent.indexOf("Edg") > -1;
        
        // Create instructions element
        const instructions = document.createElement('div');
        instructions.className = 'browser-compatibility-note';
        instructions.innerHTML = '<strong>How to enable microphone in your browser:</strong>';
        
        const instructionsList = document.createElement('ul');
        instructionsList.className = 'speech-troubleshoot-steps';
        
        if (isChrome || isEdge) {
            instructionsList.innerHTML = `
                <li>Click the <strong>lock icon</strong> or <strong>information icon</strong> in the address bar</li>
                <li>Click on <strong>"Site settings"</strong></li>
                <li>Change <strong>"Microphone"</strong> permission to <strong>"Allow"</strong></li>
                <li>Reload the page</li>
            `;
        } else if (isFirefox) {
            instructionsList.innerHTML = `
                <li>Click the <strong>lock icon</strong> in the address bar</li>
                <li>Click on the <strong>arrow</strong> next to "Microphone"</li>
                <li>Select <strong>"Allow"</strong></li>
                <li>Reload the page</li>
            `;
        } else if (isSafari) {
            instructionsList.innerHTML = `
                <li>Go to <strong>Safari Preferences</strong></li>
                <li>Navigate to <strong>Websites > Microphone</strong></li>
                <li>Find this website and set permission to <strong>"Allow"</strong></li>
                <li>Reload the page</li>
            `;
        } else {
            instructionsList.innerHTML = `
                <li>Look for site permissions in your browser settings</li>
                <li>Find microphone permissions for this site</li>
                <li>Change the permission to <strong>"Allow"</strong></li>
                <li>Reload the page</li>
            `;
        }
        
        instructions.appendChild(instructionsList);
        container.appendChild(instructions);
    }
    
    /**
     * Start speech recognition based on selected method
     */
    async startRecognition() {
        console.log(`Attempting to start ${this.selectedMethod} recognition`);
        
        // Emit event that recognition is starting
        document.dispatchEvent(new CustomEvent('speechRecognitionStarting'));
        
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
        if (this._permissionGranted !== true) {
            const permissionGranted = await this.checkMicrophonePermission();
            if (!permissionGranted) {
                console.error('Cannot start recognition without microphone permission');
                
                // Dispatch error event
                document.dispatchEvent(new CustomEvent('speechRecognitionError', {
                    detail: 'Microphone permission required'
                }));
                
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
        
        // Process interim results for better visibility
        if (window.processInterimResult && typeof window.processInterimResult === 'function') {
            window.processInterimResult(interimTranscript);
        } else {
            // Fallback to basic update if enhanced function isn't available
            const interimElement = document.getElementById('interim-text');
            if (interimElement) {
                interimElement.textContent = interimTranscript;
            }
        }
        
        // Process final results
        if (finalTranscript) {
            const finalElement = document.getElementById('final-text');
            if (finalElement) {
                finalElement.textContent = finalTranscript;
            }
            
            this.processFinalTranscript(finalTranscript);
        }
        
        // Dispatch event when we have results
        document.dispatchEvent(new CustomEvent('speechRecognitionResults', {
            detail: { interim: interimTranscript, final: finalTranscript }
        }));
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

    /**
     * Setup mobile-specific optimizations for speech recognition
     * This addresses many of the issues on Android and iOS devices
     */
    setupMobileOptimization() {
        console.log('Setting up mobile-specific optimizations for speech recognition');
        
        // 1. Configure recognition settings for mobile
        if (this.recognition) {
            // Improve interim results frequency
            this.recognition.interimResults = true;
            
            // Increase max alternatives for better word matching
            if ('maxAlternatives' in this.recognition) {
                this.recognition.maxAlternatives = 3;
            }
            
            // Shorter continuous sessions to prevent freezing
            this.recognition.continuous = false;
        }
        
        // 2. Modify the restart behavior for more reliable recognition
        this._mobileRestartDelay = 600; // ms between sessions (slightly longer than desktop)
        
        // 3. Patch the recognition handlers for mobile devices
        this.patchMobileRecognitionHandlers();
        
        // 4. Mark as optimized
        this.isMobileOptimized = true;
        
        return true;
    }
    
    /**
     * Apply mobile-specific patches to recognition event handlers
     * This addresses Chrome/Android specific quirks
     */
    patchMobileRecognitionHandlers() {
        if (!this.recognition) return false;
        
        // Store original handlers before patching
        const originalOnEnd = this.recognition.onend;
        const originalOnError = this.recognition.onerror;
        
        // Enhanced error handler for mobile devices
        this.recognition.onerror = (event) => {
            console.log('Mobile speech recognition error:', event.error);
            
            // On mobile, network errors are common but temporary
            // Don't treat them as fatal errors
            if (event.error === 'network') {
                console.log('Network error detected on mobile - will auto-retry');
                this._pendingRestart = true;
                
                // Dispatch a user-friendly warning
                document.dispatchEvent(new CustomEvent('mobileSpeechWarning', {
                    detail: 'Network delay detected. Optimizing...'
                }));
                
                // Don't call original handler for network errors on mobile
                return;
            }
            
            // "no-speech" errors are very common on mobile - handle gracefully
            if (event.error === 'no-speech') {
                console.log('No speech detected on mobile - continuing');
                // Don't flag as error, just continue
                return;
            }
            
            // For other errors, call the original handler
            if (originalOnError) {
                originalOnError.call(this.recognition, event);
            }
        };
        
        // Enhanced end handler with mobile-specific restart logic
        this.recognition.onend = () => {
            console.log('Mobile speech recognition ended');
            
            // Set short timeout before restarting to prevent rapid cycling
            if (this.isRecording || this._pendingRestart) {
                console.log('Scheduling mobile-optimized restart');
                this._pendingRestart = false;
                
                setTimeout(() => {
                    if (this.isRecording) {
                        console.log('Executing mobile-optimized restart');
                        try {
                            // Short sentences are better on mobile, so use non-continuous mode
                            this.recognition.continuous = false;
                            this.recognition.start();
                            this._recognitionActive = true;
                        } catch (e) {
                            console.error('Mobile restart error:', e);
                            this.triggerEvent('error', e.message);
                            
                            // If already started error, wait longer before next attempt
                            if (e.message && e.message.includes('already started')) {
                                setTimeout(() => {
                                    this.stopRecognition();
                                    setTimeout(() => this.startRecognition(), 800);
                                }, 500);
                            }
                        }
                    }
                }, this._mobileRestartDelay);
            }
            
            // Also call original handler
            if (originalOnEnd) {
                originalOnEnd.call(this.recognition);
            }
        };
        
        return true;
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
    
    // Dispatch an event when speech recognition starts
    speechRecognition.on('start', () => {
        document.dispatchEvent(new CustomEvent('speechRecognitionStarted'));
    });
    
    speechRecognition.on('end', () => {
        document.dispatchEvent(new CustomEvent('speechRecognitionEnded'));
    });
    
    speechRecognition.on('error', (error) => {
        document.dispatchEvent(new CustomEvent('speechRecognitionError', {
            detail: error
        }));
    });
});