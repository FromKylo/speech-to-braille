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
    // Check if the CSV file exists and display diagnostic information
    const debugDiv = document.createElement('div');
    debugDiv.className = 'database-debug-info';
    debugDiv.style.marginTop = '10px';
    debugDiv.style.padding = '10px';
    debugDiv.style.backgroundColor = '#f8f9fa';
    debugDiv.style.border = '1px solid #dee2e6';
    debugDiv.style.borderRadius = '4px';
    
    const debugTitle = document.createElement('h4');
    debugTitle.textContent = 'Diagnostic Information';
    debugTitle.style.margin = '0 0 10px 0';
    debugDiv.appendChild(debugTitle);
    
    // Check file availability
    fetch('/ueb-philb-braille-database.csv', { 
        method: 'HEAD',
        cache: 'no-store'
    })
    .then(response => {
        const fileInfo = document.createElement('p');
        if (response.ok) {
            fileInfo.textContent = '✅ Database file is accessible via direct path';
            fileInfo.style.color = '#155724';
        } else {
            fileInfo.textContent = '❌ Database file is not accessible via direct path';
            fileInfo.style.color = '#721c24';
        }
        debugDiv.appendChild(fileInfo);
        
        // Add server information
        const serverInfo = document.createElement('p');
        serverInfo.textContent = `Server base URL: ${window.location.origin}`;
        debugDiv.appendChild(serverInfo);
        
        // Add helpful suggestions
        const suggestions = document.createElement('ul');
        suggestions.innerHTML = `
            <li>Make sure the file "ueb-philb-braille-database.csv" exists in the root directory</li>
            <li>Check if the file permissions allow it to be read</li>
            <li>Try refreshing the page with Ctrl+F5 to clear cache</li>
            <li>Check the browser console for additional error details</li>
        `;
        debugDiv.appendChild(suggestions);
    })
    .catch(error => {
        const errorInfo = document.createElement('p');
        errorInfo.textContent = `Error checking file: ${error.message}`;
        errorInfo.style.color = '#721c24';
        debugDiv.appendChild(errorInfo);
    })
    .finally(() => {
        brailleStatus.appendChild(debugDiv);
    });
}

// Function to update model status indicator  
function updateModelStatus(model) {
    if (!modelBadge) return;
    
    modelBadge.className = 'model-badge';
    
    switch(model) {
        case 'webspeech':
            modelBadge.classList.add('web-speech');
            modelBadge.textContent = 'Web Speech API';
            break;
        case 'local':
            modelBadge.classList.add('vosk-model');
            modelBadge.textContent = 'Local Model';
            break;
        default:
            modelBadge.classList.add('no-model');
            modelBadge.textContent = 'Not Selected';
    }
}

// Function to update UI based on recording state
function setRecordingState(isRecording) {
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
        } else {
            recordingIndicator.className = 'recording-off';
            recordingIndicator.textContent = '● Recording';
        }
    }
    
    // Clear interim text if stopping
    if (!isRecording && interimTextElement) {
        interimTextElement.textContent = '';
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
    if (mode === 'listening') {
        listeningSound.play().catch(err => console.log('Could not play sound:', err));
    } else if (mode === 'output') {
        outputSound.play().catch(err => console.log('Could not play sound:', err));
    }
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

            // Call this function during initialization
            updateTimingCSS();
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
        // Get required DOM elements
        const noMatchInfo = document.getElementById('no-match-info');
        const brailleResult = document.getElementById('braille-result');
        const matchedWordElement = document.getElementById('matched-word');
        const brailleLanguageElement = document.getElementById('braille-language');
        const brailleSymbolElement = document.getElementById('braille-symbol');
        const brailleArrayElement = document.getElementById('braille-array');
        
        // Check if elements exist
        if (!noMatchInfo || !brailleResult || !matchedWordElement || 
            !brailleLanguageElement || !brailleSymbolElement) {
            console.error('Braille UI elements not found:', {
                noMatchInfo: !!noMatchInfo,
                brailleResult: !!brailleResult,
                matchedWordElement: !!matchedWordElement,
                brailleLanguageElement: !!brailleLanguageElement,
                brailleSymbolElement: !!brailleSymbolElement,
                brailleArrayElement: !!brailleArrayElement
            });
            return;
        }
        
        console.log('Displaying braille match in UI:', result);
        
        // Hide no match info, ensure result container is visible
        noMatchInfo.classList.add('hidden');
        brailleResult.classList.remove('hidden');
        brailleResult.style.display = 'block';
        
        // Update UI with matched word and braille symbol
        matchedWordElement.textContent = result.word || 'Unknown';
        brailleSymbolElement.textContent = result.braille || '⠿';
        
        // Display the language directly without formatting
        brailleLanguageElement.textContent = result.language || 'UEB';
        
        // Ensure all braille-related DOM elements are visible
        const brailleContainer = document.querySelector('.braille-container');
        if (brailleContainer) {
            brailleContainer.style.display = 'block';
        }
        
        // Ensure braille visualizer is updated
        setTimeout(() => {
            if (window.brailleVisualizer && result.array) {
                console.log('UI Controller: Updating braille visualizer with array:', result.array);
                window.brailleVisualizer.updateDisplay(result.array);
            } else {
                console.warn('UI Controller: Cannot update braille visualizer', {
                    visualizer: !!window.brailleVisualizer,
                    array: !!result.array
                });
            }
        }, 100);
        
        // Auto-speak the word (adding delay to ensure TTS is ready)
        setTimeout(() => {
            if (window.textToSpeech && typeof window.textToSpeech.speakMatchedWord === 'function') {
                window.textToSpeech.speakMatchedWord(result.word);
            } else if (window.textToSpeech && typeof window.textToSpeech.speak === 'function') {
                window.textToSpeech.speak(result.word);
            }
        }, 500);
    },
    
    showNoMatch: function() {
        if (!brailleResult || !noMatchInfo) return;
        brailleResult.classList.add('hidden');
        noMatchInfo.classList.remove('hidden');
    },
    
    updateBrailleArray: function(formattedArray) {
        const brailleArrayElement = document.getElementById('braille-array');
        
        if (!brailleArrayElement) {
            console.error('Braille array element not found');
            return;
        }
        
        console.log('Updating braille array display with:', formattedArray);
        brailleArrayElement.textContent = formattedArray;
        
        // Make sure the container is visible
        const container = brailleArrayElement.closest('.braille-array-container');
        if (container) {
            container.style.display = 'block';
            container.style.visibility = 'visible';
        }
        
        // Make the braille dot display visible too
        const dotDisplay = document.querySelector('.braille-dot-display');
        if (dotDisplay) {
            dotDisplay.style.display = 'block';
            dotDisplay.style.visibility = 'visible';
        }
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
        if (window.app && window.app.getCurrentCycleMode() !== 'output') {
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

    // Add new method to update UI based on cycle mode
    setCycleMode: function(mode) {
        console.log(`Setting cycle mode UI to: ${mode}`);
        
        // Get timing values from config with fallbacks
        const listeningTime = (window.config ? window.config.timings.listeningPhase : 3);
        const outputTime = (window.config ? window.config.timings.outputPhase : 7);
        
        if (cycleModeStatus) {
            if (mode === 'listening') {
                cycleModeStatus.className = 'always-on';
                cycleModeStatus.textContent = `● Listening Mode (${listeningTime}s)`;
            } else {
                cycleModeStatus.className = 'output-mode';
                cycleModeStatus.textContent = `◉ Output Mode (${outputTime}s)`;
            }
        } else {
            console.error('cycleModeStatus element not found');
        }
        
        if (cycleModeIndicator) {
            cycleModeIndicator.textContent = mode === 'listening' ? 
                'Now listening for your speech...' : 
                'Displaying Braille output...';
        } else {
            console.error('cycleModeIndicator element not found');
        }
        
        // If in output mode, make sure to speak the currently matched word
        if (mode === 'output') {
            const matchedWord = document.getElementById('matched-word');
            if (matchedWord && matchedWord.textContent && matchedWord.textContent !== 'None') {
                if (window.textToSpeech) {
                    window.textToSpeech.speak(matchedWord.textContent);
                }
            }
        }

        // Play appropriate sound for mode change
        if (typeof playModeSound === 'function') {
            playModeSound(mode);
        } else if (window.soundEffects) {
            if (mode === 'listening') {
                window.soundEffects.playListeningModeSound();
            } else {
                window.soundEffects.playOutputModeSound();
            }
        }
    }
};

// Helper function to force reload the page clearing cache
function forceReload() {
    console.log('Forcing page reload with cache clear...');
    // Add timestamp to URL to bypass cache
    window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
}

// When showing the introduction section, speak the welcome text
function showIntroductionSection() {
    // Your existing code to display the introduction section
    // ...
    
    // Automatically speak the introduction
    setTimeout(() => {
        if (window.speakText) {
            window.speakText("Welcome to the Speech to Braille converter! This application will help you learn Braille.");
        }
    }, 1000); // Short delay to ensure everything is loaded
}

// When displaying a matched word, speak it automatically
function displayMatchedWord(word, brailleSymbol, brailleArray, language) {
    // Your existing code to update the UI
    // ...
    
    // Automatically speak the matched word
    if (window.speakText) {
        window.speakText(`Matched word: ${word}`);
    }
}

// Dynamically update CSS variables for timing based on config.js
function updateTimingCSS() {
    const root = document.documentElement;
    root.style.setProperty('--intro-phase-duration', `${window.config.timings.introductionPhase}s`);
    root.style.setProperty('--listening-phase-duration', `${window.config.timings.listeningPhase}s`);
    root.style.setProperty('--output-phase-duration', `${window.config.timings.outputPhase}s`);
}

// Export UI controller
window.uiController = uiController;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    uiController.init();
});
