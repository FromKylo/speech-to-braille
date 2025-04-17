/**
 * UI Controller for Speech to Braille App
 * Handles DOM manipulation and UI state
 */

// DOM initialization
let startSpeechBtn, stopSpeechBtn, speechMethodSelect, recordingIndicator;
let interimTextElement, finalTextElement, modelBadge;
let loadingContainer, progressBar, progressStatus;
let brailleStatus, brailleResult, matchedWordElement, brailleLanguageElement;
let brailleSymbolElement, brailleArrayElement, noMatchInfo, speakWordBtn;
let speechLoadingContainer, speechProgressBar, speechLoadingStatus;
let cycleModeStatus, cycleModeIndicator;

// Helper function to update progress bar
function updateLoadingProgress(percent, statusText) {
    if (!progressBar || !progressStatus) return;
    progressBar.style.width = `${percent}%`;
    if (statusText) {
        progressStatus.textContent = statusText;
    }
}

// Initialize DOM references
function initDOMReferences() {
    startSpeechBtn = document.getElementById('start-speech-btn');
    stopSpeechBtn = document.getElementById('stop-speech-btn');
    speechMethodSelect = document.getElementById('speech-method');
    recordingIndicator = document.getElementById('recording-indicator');
    cycleModeStatus = document.getElementById('cycle-mode-status');
    cycleModeIndicator = document.getElementById('cycle-mode-indicator');
    interimTextElement = document.getElementById('interim-text');
    finalTextElement = document.getElementById('final-text');
    modelBadge = document.getElementById('model-badge');
    loadingContainer = document.getElementById('loading-container');
    progressBar = document.getElementById('progress-bar');
    progressStatus = document.getElementById('progress-status');
    
    // Braille translation elements
    brailleStatus = document.getElementById('braille-status');
    brailleResult = document.getElementById('braille-result');
    matchedWordElement = document.getElementById('matched-word');
    brailleLanguageElement = document.getElementById('braille-language');
    brailleSymbolElement = document.getElementById('braille-symbol');
    brailleArrayElement = document.getElementById('braille-array');
    noMatchInfo = document.getElementById('no-match-info');
    speakWordBtn = document.getElementById('speak-word-btn');
    
    // Speech loading elements
    speechLoadingContainer = document.getElementById('speech-loading-container');
    speechProgressBar = document.getElementById('speech-progress-bar');
    speechLoadingStatus = document.getElementById('speech-loading-status');
    
    // Remove any old buttons that were added programmatically
    const oldButtons = document.querySelectorAll('main > button');
    oldButtons.forEach(button => {
        if (button.textContent === 'Start Speech Recognition' || 
            button.textContent === 'Load Speech Recognition Model') {
            button.remove();
        }
    });
}

// Function to show database debug info
function showDatabaseDebugInfo() {
    console.log('Showing database debug info');
    
    // Create debug info elements
    const debugInfoContainer = document.createElement('div');
    debugInfoContainer.className = 'debug-info';
    
    // Get config timing information if available
    let configInfo = "Configuration not available";
    if (window.app && app.getConfig) {
        const config = app.getConfig();
        configInfo = `
            Introduction: ${config.PHASES.INTRODUCTION.DURATION/1000}s, 
            Recording: ${config.PHASES.RECORDING.DURATION/1000}s, 
            Output: ${config.PHASES.OUTPUT.DURATION/1000}s
        `;
    }
    
    debugInfoContainer.innerHTML = `
        <h4>Debug Information</h4>
        <p>Phase Timing: ${configInfo}</p>
        <p>Browser: ${navigator.userAgent}</p>
        <p>Online: ${navigator.onLine ? 'Yes' : 'No'}</p>
        <p>Time: ${new Date().toLocaleTimeString()}</p>
    `;
    
    // Add to the braille status element
    if (brailleStatus) {
        brailleStatus.appendChild(debugInfoContainer);
    }
}

// Function to update model status indicator  
function updateModelStatus(model) {
    if (!modelBadge) return;
    
    switch (model) {
        case 'webspeech':
            modelBadge.textContent = 'Web Speech API';
            modelBadge.className = 'model-badge web';
            break;
        case 'local':
            modelBadge.textContent = 'Local Model';
            modelBadge.className = 'model-badge local';
            break;
        case 'none':
        default:
            modelBadge.textContent = 'No Model';
            modelBadge.className = 'model-badge offline';
            break;
    }
}

// Sound indicators for mode switching
function playModeSound(mode) {
    const listeningSound = document.getElementById('listening-mode-sound');
    const outputSound = document.getElementById('output-mode-sound');
    
    // Stop any currently playing sounds
    listeningSound.pause();
    listeningSound.currentTime = 0;
    outputSound.pause();
    outputSound.currentTime = 0;
    
    // Play the appropriate sound
    if (mode === 'recording') {
        listeningSound.play().catch(err => console.log('Could not play sound:', err));
    } else if (mode === 'output') {
        outputSound.play().catch(err => console.log('Could not play sound:', err));
    }
}

// Helper function to force reload the page clearing cache
function forceReload() {
    console.log('Forcing page reload with cache clear...');
    // Add timestamp to URL to bypass cache
    window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
}

// UI-related methods for export
const uiController = {
    // Initialize UI
    init: function() {
        return new Promise((resolve) => {
            console.log('Initializing UI controller...');
            initDOMReferences();
            
            // Make sure the button is enabled regardless of other conditions
            const startBtn = document.getElementById('start-speech-btn');
            if (startBtn) {
                startBtn.disabled = false;
                console.log('Start button explicitly enabled');
            }
            
            this.setupEventListeners();
            this.initSpeechRecognitionUI();
            this.initBrailleTranslator();
            
            // Force enable the button again after a short delay
            // This helps with race conditions in initialization
            setTimeout(() => {
                const startBtn = document.getElementById('start-speech-btn');
                if (startBtn && startBtn.disabled) {
                    console.log('Re-enabling start button after delay');
                    startBtn.disabled = false;
                }
                resolve();
            }, 500);
        });
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        if (!startSpeechBtn || !stopSpeechBtn || !speechMethodSelect) return;
        
        // Add event listener for speech method select
        speechMethodSelect.addEventListener('change', async function(event) {
            const selectedMethod = event.target.value;
            
            if (selectedMethod === 'local') {
                // Check if model is already loaded
                if (modelBadge.textContent !== 'Local Model') {
                    // Automatically load the model
                    await window.app.loadLocalModel();
                }
            } else if (selectedMethod === 'webspeech') {
                // Switch to web speech API
                updateModelStatus('webspeech');
                startSpeechBtn.disabled = false;
            }
        });
        
        // Function to start speech recognition
        startSpeechBtn.addEventListener('click', async () => {
            window.app.startSpeechRecognition();
        });
        
        // Function to stop speech recognition
        stopSpeechBtn.addEventListener('click', () => {
            window.app.stopSpeechRecognition();
        });

        // Add functionality for speak button if it exists
        const speakWordBtn = document.getElementById('speak-word-btn');
        if (speakWordBtn) {
            speakWordBtn.addEventListener('click', () => {
                this.speakMatchedWord();
            });

            // Setup TTS event listeners if available
            if (window.textToSpeech) {
                // The TextToSpeech class doesn't have these event listeners yet,
                // but we can add them for future compatibility
                if (typeof textToSpeech.on === 'function') {
                    textToSpeech.on('start', () => {
                        if (speakWordBtn) {
                            speakWordBtn.classList.add('speaking');
                        }
                    });

                    textToSpeech.on('end', () => {
                        if (speakWordBtn) {
                            speakWordBtn.classList.remove('speaking');
                        }
                    });
                }
                
                // Use direct UI updates with the current implementation
                const speakingIndicator = document.getElementById('speaking-indicator');
                if (speakingIndicator) {
                    // Create a MutationObserver to watch for changes to the speaking indicator
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                                const isHidden = speakingIndicator.classList.contains('hidden');
                                if (speakWordBtn) {
                                    if (isHidden) {
                                        speakWordBtn.classList.remove('speaking');
                                    } else {
                                        speakWordBtn.classList.add('speaking');
                                    }
                                }
                            }
                        });
                    });
                    
                    // Start observing
                    observer.observe(speakingIndicator, { attributes: true });
                }
            }
        }
    },
    
    // Initialize speech recognition UI
    initSpeechRecognitionUI: function() {
        // Make sure start button exists and is referenced
        startSpeechBtn = document.getElementById('start-speech-btn');
        if (!startSpeechBtn) {
            console.error('Start speech button not found');
            return;
        }
        
        // Always enable the button by default - this ensures it's clickable on load
        startSpeechBtn.disabled = false;
        
        if (typeof speechRecognition !== 'undefined' && typeof speechRecognition.isSupported === 'function') {
            const isSupported = speechRecognition.isSupported();
            
            console.log('Speech recognition supported:', isSupported);
            
            if (isSupported) {
                // Online mode uses Web Speech API by default
                updateModelStatus('webspeech');
                if (modelBadge) modelBadge.textContent = 'Web Speech API (Default)';
                
                // Button is already enabled from above
                console.log('Start button enabled for speech recognition');
            } else {
                console.warn('Speech recognition is not supported by browser');
                updateModelStatus('none');
                if (modelBadge) modelBadge.textContent = 'Not Supported';
                
                // Still keep the button enabled to attempt recognition
            }
        } else {
            console.warn('Speech recognition module not initialized properly');
            // Still keep the button enabled to give it a chance to work
        }
        
        // Add listener for online/offline events to update UI
        window.addEventListener('online', () => this.updateConnectionStatus(true));
        window.addEventListener('offline', () => this.updateConnectionStatus(false));
    },

    // New method to handle connection status changes
    updateConnectionStatus: function(isOnline) {
        console.log(`Connection status changed: ${isOnline ? 'online' : 'offline'}`);
        this.initSpeechRecognitionUI(); // Re-initialize UI based on new connection status
    },
    
    // Initialize braille translator
    initBrailleTranslator: async function() {
        if (typeof brailleTranslator === 'undefined') {
            console.error('Braille translator module is not loaded');
            if (brailleStatus) {
                brailleStatus.textContent = 'Braille translator not available';
                brailleStatus.className = 'status offline';
            }
            return;
        }
        
        if (brailleStatus) {
            brailleStatus.textContent = 'Loading Braille database...';
            brailleStatus.className = 'status';
            
            // Add retry button for manual database loading
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Retry Loading Database';
            retryButton.id = 'retry-braille-db-btn';
            retryButton.style.marginTop = '10px';
            retryButton.style.display = 'none';
            brailleStatus.appendChild(document.createElement('br'));
            brailleStatus.appendChild(retryButton);
            
            // Add event listener to retry button
            retryButton.addEventListener('click', async () => {
                brailleStatus.textContent = 'Retrying database load...';
                brailleStatus.className = 'status';
                retryButton.style.display = 'none';
                brailleStatus.appendChild(document.createElement('br'));
                brailleStatus.appendChild(retryButton);
                
                try {
                    const success = await brailleTranslator.init();
                    if (success) {
                        const dbSize = brailleTranslator.getDatabaseSize();
                        brailleStatus.textContent = `Braille database loaded with ${dbSize} entries`;
                        brailleStatus.className = 'status online';
                        retryButton.style.display = 'none';
                    } else {
                        brailleStatus.textContent = 'Failed to load Braille database';
                        brailleStatus.className = 'status offline';
                        retryButton.style.display = 'inline-block';
                        showDatabaseDebugInfo();
                    }
                } catch (error) {
                    console.error('Error initializing Braille translator:', error);
                    brailleStatus.textContent = `Error loading database: ${error.message}`;
                    brailleStatus.className = 'status offline';
                    retryButton.style.display = 'inline-block';
                    showDatabaseDebugInfo();
                }
            });
            
            try {
                const success = await brailleTranslator.init();
                if (success) {
                    const dbSize = brailleTranslator.getDatabaseSize();
                    brailleStatus.textContent = `Braille database loaded with ${dbSize} entries`;
                    brailleStatus.className = 'status online';
                } else {
                    brailleStatus.textContent = 'Failed to load Braille database';
                    brailleStatus.className = 'status offline';
                    retryButton.style.display = 'inline-block';
                    showDatabaseDebugInfo();
                }
            } catch (error) {
                console.error('Error initializing Braille translator:', error);
                brailleStatus.textContent = `Error loading database: ${error.message}`;
                brailleStatus.className = 'status offline';
                retryButton.style.display = 'inline-block';
                showDatabaseDebugInfo();
            }
        }
    },
    
    // Show loading bar
    showLoadingBar: function() {
        if (loadingContainer) loadingContainer.style.display = 'block';
    },
    
    // Hide loading bar
    hideLoadingBar: function() {
        if (loadingContainer) loadingContainer.style.display = 'none';
    },
    
    // Update loading progress
    updateLoadingProgress: function(percent, statusText) {
        updateLoadingProgress(percent, statusText);
    },
    
    // Update model status
    updateModelStatus: function(model) {
        updateModelStatus(model);
    },
    
    // Set progress bar error state
    setProgressBarError: function() {
        if (progressBar) progressBar.style.backgroundColor = '#ea4335'; // Red for error
    },
    
    // Reset progress bar
    resetProgressBar: function() {
        if (progressBar) progressBar.style.backgroundColor = '#4285f4'; // Reset color
    },
    
    // Update recording state
    setRecordingState: function(isRecording) {
        console.log(`Setting recording state: ${isRecording}`);
        window.recognitionActive = isRecording;
        
        // Update button states
        if (startSpeechBtn) startSpeechBtn.disabled = isRecording;
        if (stopSpeechBtn) stopSpeechBtn.disabled = !isRecording;
        
        // Update recording indicator
        if (recordingIndicator) {
            if (isRecording) {
                recordingIndicator.className = 'recording-on';
                recordingIndicator.textContent = '● Recording';
                if (window.app && window.app.getConfig) {
                    recordingIndicator.textContent = `● Recording (${window.app.getConfig().PHASES.RECORDING.DURATION/1000}s)`;
                }
            } else {
                recordingIndicator.className = 'recording-off';
                recordingIndicator.textContent = '● Recording';
            }
        }
        
        // Update the recognition status in troubleshooting area
        const recognitionStatus = document.getElementById('recognition-active-status');
        if (recognitionStatus) {
            recognitionStatus.textContent = isRecording ? 'Yes' : 'No';
            recognitionStatus.style.color = isRecording ? '#34a853' : '#ea4335';
        }
        
        // Update last updated timestamp
        const lastUpdated = document.getElementById('last-updated');
        if (lastUpdated) {
            lastUpdated.textContent = new Date().toLocaleTimeString();
        }
        
        // Clear interim text if stopping
        if (!isRecording && interimTextElement) {
            interimTextElement.textContent = '';
        }
    },
    
    // Update text displays
    updateFinalText: function(text) {
        if (finalTextElement) finalTextElement.textContent = text; // Replace text instead of appending
    },
    
    updateInterimText: function(text) {
        if (interimTextElement) interimTextElement.textContent = text;
    },
    
    clearInterimText: function() {
        if (interimTextElement) interimTextElement.textContent = '';
    },

    clearFinalText: function() {
        if (finalTextElement) finalTextElement.textContent = '';
    },
    
    // Get speech method
    getSpeechMethod: function() {
        return speechMethodSelect ? speechMethodSelect.value : 'webspeech';
    },
    
    // Display Braille matching
    showBrailleMatch: function(result) {
        if (!noMatchInfo || !brailleResult || !matchedWordElement || 
            !brailleLanguageElement || !brailleSymbolElement) return;
        
        // Hide no match message and show braille result
        noMatchInfo.style.display = 'none';
        brailleResult.style.display = 'block';
        
        // Update UI with the result
        matchedWordElement.textContent = result.word;
        brailleLanguageElement.textContent = result.language || 'UEB';
        brailleSymbolElement.innerHTML = result.symbol || '';
        
        // Speak the matched word if in output phase
        if (window.app && 
            window.app.getCurrentPhase && 
            window.app.getCurrentPhase() === 'output' &&
            window.textToSpeech) {
            window.textToSpeech.speakMatchedWord(result.word);
        }
    },
    
    // Show no match found
    showNoMatch: function() {
        if (!noMatchInfo || !brailleResult) return;
        
        // Hide braille result and show no match message
        brailleResult.style.display = 'none';
        noMatchInfo.style.display = 'block';
        
        // Clear fields
        if (matchedWordElement) matchedWordElement.textContent = 'None';
        if (brailleLanguageElement) brailleLanguageElement.textContent = 'N/A';
        if (brailleSymbolElement) brailleSymbolElement.innerHTML = '';
        if (brailleArrayElement) brailleArrayElement.textContent = '[]';
    },
    
    // Update braille array display
    updateBrailleArray: function(formattedArray) {
        if (brailleArrayElement) brailleArrayElement.textContent = formattedArray;
    },
    
    // Show speech loading bar
    showSpeechLoadingBar: function() {
        if (speechLoadingContainer) speechLoadingContainer.style.display = 'block';
    },
    
    // Hide speech loading bar
    hideSpeechLoadingBar: function() {
        if (speechLoadingContainer) speechLoadingContainer.style.display = 'none';
    },

    // Update speech loading progress
    updateSpeechLoadingProgress: function(percent, statusText) {
        if (!speechProgressBar || !speechLoadingStatus) return;
        speechProgressBar.style.width = `${percent}%`;
        if (statusText) {
            speechLoadingStatus.textContent = statusText;
        }
    },

    // Add new method to speak the matched word
    speakMatchedWord: function() {
        // Check if we're in output mode
        if (window.app && window.app.getCurrentPhase && window.app.getCurrentPhase() !== 'output') {
            console.log('Cannot speak word - not in output mode');
            return;
        }
        
        const matchedWord = document.getElementById('matched-word');
        if (matchedWord && matchedWord.textContent && matchedWord.textContent !== 'None') {
            console.log('Speaking matched word:', matchedWord.textContent);
            if (window.textToSpeech) {
                window.textToSpeech.speak(matchedWord.textContent);
                
                // Update button state
                const speakBtn = document.getElementById('speak-word-btn');
                if (speakBtn) {
                    speakBtn.classList.add('speaking');
                    setTimeout(() => {
                        speakBtn.classList.remove('speaking');
                    }, 2000);
                }
            } else {
                console.error('Text-to-speech not available');
            }
        }
    },

    // Add new method to update UI based on phase
    setPhaseDisplay: function(phase) {
        console.log(`Setting phase display to: ${phase}`);

        // Get the phase durations from app configuration if available
        let phaseDurations = {
            introduction: 10,
            recording: 3,
            output: 7
        };
        
        if (window.app && window.app.getConfig) {
            const config = window.app.getConfig();
            phaseDurations = {
                introduction: config.PHASES.INTRODUCTION.DURATION / 1000,
                recording: config.PHASES.RECORDING.DURATION / 1000,
                output: config.PHASES.OUTPUT.DURATION / 1000
            };
        }
        
        // Update status display
        if (recordingIndicator && phase === 'recording') {
            recordingIndicator.textContent = `● Recording (${phaseDurations.recording}s)`;
        }
        
        // Update current phase indicator in troubleshooting area
        const phaseIndicator = document.getElementById('current-phase-indicator');
        if (phaseIndicator) {
            phaseIndicator.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
        }
        
        // Play appropriate sound for phase change
        playModeSound(phase);
    }
};

// Export UI controller
window.uiController = uiController;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    uiController.init();
});
