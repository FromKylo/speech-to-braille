/**
 * Main application logic for Speech to Braille
 * Handles speech recognition and braille translation
 */

// Speech recognition state
let recognitionActive = false;

// App configuration
const CONFIG = {
    PHASES: {
        INTRODUCTION: {
            DURATION: 10000, // 10 seconds for introduction phase
            NAME: 'introduction'
        },
        RECORDING: {
            DURATION: 3000, // 3 seconds for recording phase
            NAME: 'recording'
        },
        OUTPUT: {
            DURATION: 7000, // 7 seconds for output phase
            NAME: 'output'
        }
    }
};

// Add cycle tracking variables
let cycleMode = CONFIG.PHASES.INTRODUCTION.NAME;
let cycleTimer = null;

// Initialize the application
function initApp() {
    console.log('Initializing application with updated timing configuration...');
    
    // Force-enable the start button initially to ensure it's clickable
    const startBtn = document.getElementById('start-speech-btn');
    if (startBtn) {
        startBtn.disabled = false;
        console.log('Start button initially enabled');
    }
    
    // Check if speech recognition is defined before using it
    if (typeof speechRecognition === 'undefined') {
        console.warn('Speech recognition module is not loaded yet');
        
        // Wait a bit and try again - it might still be initializing
        setTimeout(() => {
            if (typeof speechRecognition !== 'undefined') {
                console.log('Speech recognition module loaded after delay');
                setupSpeechRecognitionEvents();
                
                // Ensure button is enabled after recognition is loaded
                if (startBtn) startBtn.disabled = false;
            } else {
                console.error('Speech recognition module is not available');
                // Still keep button enabled - we'll handle errors when it's clicked
                if (startBtn) startBtn.disabled = false;
            }
        }, 1000);
    } else {
        // Setup event listeners for speech recognition events
        setupSpeechRecognitionEvents();
        
        // Make sure button is enabled
        if (startBtn) startBtn.disabled = false;
    }
    
    // Add debugging helper to check if the speech recognition module is working
    console.log('Speech recognition module status:', {
        defined: typeof speechRecognition !== 'undefined',
        supported: typeof speechRecognition !== 'undefined' && typeof speechRecognition.isSupported === 'function' ? 
                   speechRecognition.isSupported() : 'unknown'
    });
    
    // Add a final check to ensure the button is enabled after all initialization
    setTimeout(() => {
        const startBtn = document.getElementById('start-speech-btn');
        if (startBtn && startBtn.disabled) {
            console.log('Final check: re-enabling start button');
            startBtn.disabled = false;
        }
    }, 2000);
}

// Setup speech recognition event listeners
function setupSpeechRecognitionEvents() {
    if (typeof speechRecognition !== 'undefined') {
        // Set up event handlers for our speech recognition service
        speechRecognition.on('start', () => {
            console.log('Speech recognition started');
            uiController.setRecordingState(true);
            recognitionActive = true;
            
            // Add a visual indicator that the microphone is active
            const micStatus = document.getElementById('mic-status');
            if (micStatus) {
                micStatus.textContent = 'Mic: Active';
                micStatus.className = 'mic-status active';
            }
            
            // Clear any previous text when starting recognition
            uiController.clearInterimText();
            uiController.clearFinalText();
        });
        
        speechRecognition.on('end', () => {
            console.log('Speech recognition ended');
            uiController.setRecordingState(false);
            recognitionActive = false;
            
            // Update the microphone status
            const micStatus = document.getElementById('mic-status');
            if (micStatus) {
                micStatus.textContent = 'Mic: Inactive';
                micStatus.className = 'mic-status inactive';
            }
        });
        
        speechRecognition.on('result', (text) => {
            console.log('Speech recognition final result:', text);
            uiController.updateFinalText(text);
            
            // Process the new text for Braille matching
            processSpeechForBraille(text);
        });
        
        speechRecognition.on('partialresult', (text) => {
            console.log('Speech recognition partial result:', text);
            uiController.updateInterimText(text);
        });
        
        speechRecognition.on('error', (error) => {
            console.error('Speech recognition error:', error);
            uiController.setRecordingState(false);
            recognitionActive = false;
            
            // Update the microphone status to show error
            const micStatus = document.getElementById('mic-status');
            if (micStatus) {
                micStatus.textContent = 'Mic: Error';
                micStatus.className = 'mic-status error';
            }
            
            // Show error with visual feedback
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = `Speech recognition error: ${error}`;
            errorElement.style.color = '#ea4335';
            errorElement.style.margin = '10px 0';
            errorElement.style.padding = '10px';
            errorElement.style.borderRadius = '4px';
            errorElement.style.backgroundColor = '#fce8e6';
            
            const speechOutput = document.getElementById('speech-output');
            if (speechOutput) {
                speechOutput.prepend(errorElement);
                setTimeout(() => {
                    errorElement.style.opacity = '0';
                    errorElement.style.transition = 'opacity 1s';
                    setTimeout(() => errorElement.remove(), 1000);
                }, 5000);
            }
        });
    }
}

// Function to load the local model
async function loadLocalModel() {
    try {
        console.log('Loading local speech recognition model...');
        
        // Show loading UI
        uiController.showLoadingBar();
        uiController.updateLoadingProgress(10, 'Initializing local model...');
        
        // Check if speech recognition module is available
        if (typeof speechRecognition === 'undefined') {
            throw new Error('Speech recognition module not available');
        }
        
        // Setup worker path (Vosk worker)
        const workerPath = 'js/vosk-worker.js';
        console.log('Setting worker path:', workerPath);
        
        uiController.updateLoadingProgress(20, 'Setting up worker...');
        
        if (typeof speechRecognition.setWorkerPath === 'function') {
            speechRecognition.setWorkerPath(workerPath);
        } else {
            console.warn('speechRecognition.setWorkerPath not available');
        }
        
        // Load local model for speech recognition with ZIP file support
        await speechRecognition.loadLocalModel({
            progressCallback: uiController.updateLoadingProgress,
            workerPath: workerPath,
            modelUrl: 'https://alphacephei.com/kaldi/models/vosk-model-small-en-us-0.15.zip'
        });
        
        // Update UI
        uiController.updateModelStatus('local');
        
        // Complete the progress bar and hide after a delay
        uiController.updateLoadingProgress(100, 'Model loaded successfully!');
        setTimeout(() => {
            uiController.hideLoadingBar();
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('Error loading local model:', error);
        uiController.updateModelStatus('none');
        
        // Show error in progress bar
        uiController.updateLoadingProgress(100, `Error: ${error.message}`);
        uiController.setProgressBarError();
        
        setTimeout(() => {
            uiController.hideLoadingBar();
            uiController.resetProgressBar();
        }, 3000);
        
        return false;
    }
}

// Function to start speech recognition
async function startSpeechRecognition() {
    console.log('startSpeechRecognition called');
    
    if (recognitionActive) {
        console.log('Already recording, ignoring start request');
        return;
    }
    
    // Clear both interim and final text when starting new session
    uiController.clearInterimText();
    uiController.clearFinalText();
    
    // Automatically select method based on connection status
    const isOnline = navigator.onLine;
    const selectedMethod = isOnline ? 'webspeech' : 'local';
    
    try {
        // Show loading indicator
        uiController.showSpeechLoadingBar();
        uiController.updateSpeechLoadingProgress(15, 'Initializing speech recognition...');
        
        console.log(`Starting speech recognition with method: ${selectedMethod} (${isOnline ? 'online' : 'offline'} mode)`);
        
        // First check if speechRecognition exists
        if (typeof speechRecognition === 'undefined') {
            throw new Error('Speech recognition module not available. Try reloading the page.');
        }
        
        // Check if recognition is initialized
        if (!speechRecognition.recognition && selectedMethod === 'webspeech') {
            console.log('Re-initializing Web Speech API...');
            uiController.updateSpeechLoadingProgress(30, 'Reinitializing speech engine...');
            speechRecognition.initWebSpeechRecognition();
        }
        
        // Explicitly check microphone permissions
        uiController.updateSpeechLoadingProgress(40, 'Checking microphone permission...');
        const permissionGranted = await speechRecognition.checkMicrophonePermission();
        
        if (!permissionGranted) {
            throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
        }
        
        // Set the selected method if supported
        if (typeof speechRecognition.setRecognitionMethod === 'function') {
            speechRecognition.setRecognitionMethod(selectedMethod);
        }
        
        // Handle offline mode with local model if needed
        if (!isOnline && selectedMethod === 'local') {
            const modelStatus = document.getElementById('model-badge');
            if (modelStatus && modelStatus.textContent !== 'Local Model') {
                console.log('Loading local model for offline use...');
                uiController.updateSpeechLoadingProgress(30, 'Loading offline speech model...');
                await loadLocalModel();
            }
        } else {
            // Web Speech API initialization
            uiController.updateSpeechLoadingProgress(50, 'Initializing Web Speech API...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UI feedback
        }
        
        // Start the actual recognition
        uiController.updateSpeechLoadingProgress(80, 'Starting recognition engine...');
        console.log('Calling speechRecognition.startRecognition()');
        
        // This is the actual call that starts speech recognition
        await speechRecognition.startRecognition();
        
        // Complete progress and hide loading bar after a delay
        uiController.updateSpeechLoadingProgress(100, 'Recognition started!');
        setTimeout(() => {
            uiController.hideSpeechLoadingBar();
        }, 1000);
    } catch (error) {
        console.error('Failed to start recognition:', error);
        uiController.hideSpeechLoadingBar();
        
        // Show a more user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = `Speech recognition error: ${error.message}`;
        errorMessage.style.color = '#ea4335';
        errorMessage.style.padding = '10px';
        errorMessage.style.margin = '10px 0';
        errorMessage.style.backgroundColor = '#fce8e6';
        errorMessage.style.borderRadius = '4px';
        
        const speechOutput = document.getElementById('speech-output');
        if (speechOutput) {
            speechOutput.prepend(errorMessage);
            setTimeout(() => {
                errorMessage.style.opacity = '0';
                errorMessage.style.transition = 'opacity 1s';
                setTimeout(() => errorMessage.remove(), 1000);
            }, 5000);
        }
        
        // Re-enable the start button in case of error
        const startBtn = document.getElementById('start-speech-btn');
        if (startBtn) startBtn.disabled = false;
    }
}

// Function to stop speech recognition
function stopSpeechRecognition() {
    if (recognitionActive && typeof speechRecognition !== 'undefined' && speechRecognition) {
        console.log('Stopping speech recognition');
        speechRecognition.stopRecognition();
    }
}

// Function to process speech results for Braille matching
function processSpeechForBraille(text) {
    if (!text || !text.trim()) {
        console.log('No text to process for Braille');
        return;
    }
    
    console.log('Processing text for Braille matching:', text);
    
    // Check if braille translator is available
    if (typeof brailleTranslator === 'undefined') {
        console.error('Braille translator not available');
        return;
    }
    
    // Get Braille translation result
    const result = brailleTranslator.translate(text);
    
    if (result && result.word) {
        console.log('Braille match found:', result);
        
        // Show the matched result in UI
        uiController.showBrailleMatch(result);
        
        // Format braille array for display
        let formattedArray;
        try {
            if (typeof brailleArrayFormatter !== 'undefined') {
                formattedArray = brailleArrayFormatter.format(result.array);
            } else {
                // Fallback formatting if formatter is not available
                formattedArray = JSON.stringify(result.array);
            }
        } catch (error) {
            console.error('Error formatting braille array:', error);
            
            // For nested arrays (contractions)
            if (Array.isArray(result.array) && Array.isArray(result.array[0])) {
                formattedArray = '{{' + result.array.map(subArray => subArray.join(',')).join('},{') + '}}';
            }
            console.log('Using fallback array formatting:', formattedArray);
        }
        
        // Update the UI with the formatted array
        uiController.updateBrailleArray(formattedArray);
        
        // Update the visual braille dot display
        if (window.brailleVisualizer) {
            brailleVisualizer.updateDisplay(result.array);
        }
        
        // Send braille data to connected ESP32 via BLE
        if (window.bleController && bleController.isConnected()) {
            console.log('Sending braille data to ESP32:', result.array);
            bleController.sendBrailleData(result.array)
                .then(success => {
                    if (success) {
                        console.log('Braille data sent successfully to ESP32');
                    } else {
                        console.warn('Failed to send braille data to ESP32');
                    }
                })
                .catch(error => {
                    console.error('Error sending braille data to ESP32:', error);
                });
        }
        
        // We're now using uiController.showBrailleMatch to handle speech
        // but let's add a fallback just in case
        if (!document.getElementById('speak-word-btn') && window.textToSpeech) {
            console.log('Using fallback speech method for:', result.word);
            try {
                setTimeout(() => window.textToSpeech.speak(result.word), 300);
            } catch (error) {
                console.error('Text-to-speech error:', error);
            }
        }
    } else {
        // No match found
        uiController.showNoMatch();
        
        // Clear the braille visualizer when no match is found
        if (window.brailleVisualizer) {
            brailleVisualizer.clearDots();
        }
    }
}

// Function to start the application phase cycle
function startAppCycle() {
    console.log('Starting application phase cycle');
    
    if (cycleTimer) {
        clearTimeout(cycleTimer);
    }
    
    // Set initial state to introduction
    cycleMode = CONFIG.PHASES.INTRODUCTION.NAME;
    updatePhaseUI();
}

// Function to update UI based on current phase
function updatePhaseUI() {
    // Check if introduction is completed
    if (cycleMode === CONFIG.PHASES.INTRODUCTION.NAME) {
        console.log('Showing INTRODUCTION phase');
        
        document.querySelectorAll('.phase-container').forEach(phase => {
            if (phase.id === 'introduction-phase') {
                phase.classList.add('phase-active');
            } else {
                phase.classList.remove('phase-active');
            }
        });
        
        // Start intro speech if available
        if (window.textToSpeech && typeof textToSpeech.speakIntroduction === 'function') {
            textToSpeech.speakIntroduction();
        }
        
        // Schedule next phase after introduction duration
        cycleTimer = setTimeout(() => {
            cycleMode = CONFIG.PHASES.RECORDING.NAME;
            updatePhaseUI();
        }, CONFIG.PHASES.INTRODUCTION.DURATION);
        
    } else if (cycleMode === CONFIG.PHASES.RECORDING.NAME) {
        console.log('Showing RECORDING phase');
        
        document.querySelectorAll('.phase-container').forEach(phase => {
            if (phase.id === 'recording-phase') {
                phase.classList.add('phase-active');
            } else {
                phase.classList.remove('phase-active');
            }
        });
        
        // Start speech recognition
        if (!recognitionActive) {
            startSpeechRecognition();
        }
        
        // Update the timer display
        const recordingTimer = document.getElementById('recording-timer');
        if (recordingTimer) {
            let secondsLeft = CONFIG.PHASES.RECORDING.DURATION / 1000;
            recordingTimer.textContent = secondsLeft;
            
            // Update timer every second
            const timerInterval = setInterval(() => {
                secondsLeft--;
                if (secondsLeft <= 0) {
                    clearInterval(timerInterval);
                } else {
                    recordingTimer.textContent = secondsLeft;
                    // Update circular progress
                    const progress = (CONFIG.PHASES.RECORDING.DURATION / 1000 - secondsLeft) / (CONFIG.PHASES.RECORDING.DURATION / 1000) * 100;
                    recordingTimer.style.background = `conic-gradient(#4285f4 ${progress}%, transparent ${progress}%)`;
                }
            }, 1000);
        }
        
        // Play recording mode sound
        if (window.textToSpeech && typeof textToSpeech.playRecordingAudio === 'function') {
            textToSpeech.playRecordingAudio();
        } else if (window.soundEffects) {
            window.soundEffects.playListeningModeSound();
        }
        
        // Schedule next phase after recording duration
        cycleTimer = setTimeout(() => {
            cycleMode = CONFIG.PHASES.OUTPUT.NAME;
            updatePhaseUI();
        }, CONFIG.PHASES.RECORDING.DURATION);
        
    } else if (cycleMode === CONFIG.PHASES.OUTPUT.NAME) {
        console.log('Showing OUTPUT phase');
        
        document.querySelectorAll('.phase-container').forEach(phase => {
            if (phase.id === 'output-phase') {
                phase.classList.add('phase-active');
            } else {
                phase.classList.remove('phase-active');
            }
        });
        
        // Stop speech recognition during output phase
        if (recognitionActive) {
            stopSpeechRecognition();
        }
        
        // Process the current text for braille output
        processFinalText();
        
        // Update the timer display
        const outputTimer = document.getElementById('output-timer');
        if (outputTimer) {
            let secondsLeft = CONFIG.PHASES.OUTPUT.DURATION / 1000;
            outputTimer.textContent = secondsLeft;
            
            // Update timer every second
            const timerInterval = setInterval(() => {
                secondsLeft--;
                if (secondsLeft <= 0) {
                    clearInterval(timerInterval);
                } else {
                    outputTimer.textContent = secondsLeft;
                    // Update circular progress
                    const progress = (CONFIG.PHASES.OUTPUT.DURATION / 1000 - secondsLeft) / (CONFIG.PHASES.OUTPUT.DURATION / 1000) * 100;
                    outputTimer.style.background = `conic-gradient(#4285f4 ${progress}%, transparent ${progress}%)`;
                }
            }, 1000);
        }
        
        // Play output mode sound
        if (window.textToSpeech && typeof textToSpeech.playOutputAudio === 'function') {
            textToSpeech.playOutputAudio();
        } else if (window.soundEffects) {
            window.soundEffects.playOutputModeSound();
        }
        
        // Schedule next phase after output duration
        cycleTimer = setTimeout(() => {
            cycleMode = CONFIG.PHASES.RECORDING.NAME;
            updatePhaseUI();
        }, CONFIG.PHASES.OUTPUT.DURATION);
    }
    
    // Update the phase indicator in troubleshooting section
    const phaseIndicator = document.getElementById('current-phase-indicator');
    if (phaseIndicator) {
        phaseIndicator.textContent = cycleMode.charAt(0).toUpperCase() + cycleMode.slice(1);
    }
    
    // Update Arduino about phase change if BLE controller is available
    if (window.bleController && window.bleController.isConnected()) {
        window.bleController.setPhase(cycleMode).then(success => {
            if (!success) {
                console.warn('Failed to update Arduino about phase change');
            }
        });
    }
}

// Process the final text to find braille matches
function processFinalText() {
    const finalTextElement = document.getElementById('final-text');
    if (finalTextElement && finalTextElement.textContent.trim()) {
        const text = finalTextElement.textContent.trim();
        
        // Process this text for braille matching
        processSpeechForBraille(text);
    }
}

// Helper function to force reload the page clearing cache
function forceReload() {
    console.log('Forcing page reload with cache clear...');
    // Add timestamp to URL to bypass cache
    window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
}

// Initialize app when loaded
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    startAppCycle();
});

// Expose public methods
window.app = {
    loadLocalModel,
    startSpeechRecognition,
    stopSpeechRecognition,
    processSpeechForBraille,
    forceReload,
    startAppCycle,
    getCurrentPhase: () => cycleMode,
    getConfig: () => CONFIG
};
