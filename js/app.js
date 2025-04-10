/**
 * Main application logic for Speech to Braille
 * Handles speech recognition and braille translation
 */

// Speech recognition state
let recognitionActive = false;

// Add cycle tracking variables
let cycleMode = 'listening'; // 'listening' or 'output'
let cycleTimer = null;
const CYCLE_DURATION = 5000; // 5 seconds for each phase

// Initialize the application
function initApp() {
    console.log('Initializing application...');
    
    // Speak welcome message if text-to-speech is available
    if (window.textToSpeech && typeof textToSpeech.speakWelcome === 'function') {
        textToSpeech.speakWelcome();
    }
    
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
        });
        
        speechRecognition.on('end', () => {
            console.log('Speech recognition ended');
            uiController.setRecordingState(false);
            recognitionActive = false;
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
            
            // Show error but don't block with alert
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
    // Show loading bar
    uiController.showLoadingBar();
    uiController.updateLoadingProgress(0, 'Preparing to download model...');
    
    try {
        // First, try to use the local worker in /js directory
        const localWorkerPath = '/js/vosk-worker.js';
        let workerPath;
        
        try {
            // Check if our custom worker exists
            const response = await fetch(localWorkerPath, { method: 'HEAD' });
            if (response.ok) {
                workerPath = localWorkerPath;
                console.log('Using local worker at:', workerPath);
            } else {
                workerPath = '/node_modules/vosk-browser/dist/vosk-worker.js';
                console.log('Local worker not found, using node_modules worker');
            }
        } catch (e) {
            workerPath = '/node_modules/vosk-browser/dist/vosk-worker.js';
            console.log('Error checking worker path, using fallback:', e);
        }
        
        // Set worker path if method exists
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
        }, 5000);
        
        alert('Failed to load the speech recognition model. Please try the Web Speech API option instead.');
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
    
    // Clear previous text when starting new session
    uiController.clearInterimText();
    
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
            throw new Error('Speech recognition module not available');
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
        speechRecognition.startRecognition();
        
        // Complete progress and hide loading bar after a delay
        uiController.updateSpeechLoadingProgress(100, 'Recognition started!');
        setTimeout(() => {
            uiController.hideSpeechLoadingBar();
        }, 1000);
    } catch (error) {
        console.error('Failed to start recognition:', error);
        uiController.hideSpeechLoadingBar();
        alert(`Failed to start recognition: ${error.message}. Please try again or check if your browser supports speech recognition.`);
        
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
    if (!brailleTranslator.isDatabaseLoaded()) {
        console.warn('Braille database not loaded yet');
        return;
    }
    
    const result = brailleTranslator.processText(text);
    
    if (result) {
        // We found a match!
        uiController.showBrailleMatch(result);
        
        // Debug the raw array content to verify what we're receiving
        console.log('Raw braille array for ' + result.word + ':', result.array);
        
        // Format and display the braille array
        let formattedArray;
        
        if (typeof formatBrailleArrayForDisplay === 'function') {
            // Check if the utility function from imported module is available
            formattedArray = formatBrailleArrayForDisplay(result.array);
            console.log('Using utility formatBrailleArrayForDisplay function:', formattedArray);
        } else {
            // Fallback to our own implementation
            formattedArray = '{' + (Array.isArray(result.array) ? result.array.join(',') : '') + '}';
            
            // For nested arrays (contractions)
            if (Array.isArray(result.array) && Array.isArray(result.array[0])) {
                formattedArray = '{{' + result.array.map(subArray => subArray.join(',')).join('},{') + '}}';
            }
            console.log('Using fallback array formatting:', formattedArray);
        }
        
        // Update the UI with the formatted array
        uiController.updateBrailleArray(formattedArray);
        
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
    }
}

// Function to start the listening/output cycle
function startListeningCycle() {
    console.log('Starting listening/output cycle');
    
    if (cycleTimer) {
        clearInterval(cycleTimer);
    }
    
    // Set initial state to listening
    cycleMode = 'listening';
    updateCycleUI();
    
    // Start the cycle timer
    cycleTimer = setInterval(() => {
        // Toggle between listening and output modes
        cycleMode = cycleMode === 'listening' ? 'output' : 'listening';
        console.log(`Cycle timer triggered - switching to ${cycleMode} mode`);
        updateCycleUI();
    }, CYCLE_DURATION);
    
    console.log(`Cycle timer set with interval of ${CYCLE_DURATION}ms`);
}

// Function to update UI based on cycle mode
function updateCycleUI() {
    // Show the appropriate section based on the current mode
    if (window.textToSpeech && !textToSpeech.introCompleted) {
        console.log('Introduction not completed yet, showing intro section');
        document.querySelectorAll('.app-section').forEach(section => {
            if (section.id === 'introduction-section') {
                section.classList.add('active');
                section.classList.remove('hidden');
            } else {
                section.classList.remove('active');
                section.classList.add('hidden');
            }
        });
        return;
    }
    
    // Now handle the actual modes after intro is complete
    if (cycleMode === 'listening') {
        console.log('Switching to LISTENING mode');
        
        // Show listening section, hide others
        document.querySelectorAll('.app-section').forEach(section => {
            if (section.id === 'listening-section') {
                section.classList.add('active');
                section.classList.remove('hidden');
                section.classList.add('phase-transition');
                setTimeout(() => section.classList.remove('phase-transition'), 700);
            } else if (section.id === 'troubleshooting-section') {
                // Always show troubleshooting
                section.classList.add('active');
                section.classList.remove('hidden');
            } else {
                section.classList.remove('active');
                section.classList.add('hidden');
            }
        });
        
        // Enable speech recognition
        if (!recognitionActive && typeof speechRecognition !== 'undefined') {
            speechRecognition.startRecognition();
        }
        
        // Play listening mode sound
        if (window.soundEffects) {
            window.soundEffects.playListeningModeSound();
        }
        
        // Update UI to show we're in listening mode
        if (typeof uiController !== 'undefined' && typeof uiController.setCycleMode === 'function') {
            uiController.setCycleMode('listening');
        } else {
            console.error('uiController or setCycleMode function not available');
            
            // Fallback direct DOM manipulation
            const cycleModeStatus = document.getElementById('cycle-mode-status');
            const cycleModeIndicator = document.getElementById('cycle-mode-indicator');
            
            if (cycleModeStatus) {
                cycleModeStatus.className = 'always-on';
                cycleModeStatus.textContent = '● Listening Mode (5s)';
            }
            
            if (cycleModeIndicator) {
                cycleModeIndicator.textContent = 'Now listening for your speech...';
            }
        }
        
        // Clear any previous interim text
        if (typeof uiController !== 'undefined') {
            uiController.clearInterimText();
        }
    } else {
        console.log('Switching to OUTPUT mode');
        
        // Show output section, hide others
        document.querySelectorAll('.app-section').forEach(section => {
            if (section.id === 'output-section') {
                section.classList.add('active');
                section.classList.remove('hidden');
                section.classList.add('phase-transition');
                setTimeout(() => section.classList.remove('phase-transition'), 700);
            } else if (section.id === 'troubleshooting-section') {
                // Always show troubleshooting
                section.classList.add('active');
                section.classList.remove('hidden');
            } else {
                section.classList.remove('active');
                section.classList.add('hidden');
            }
        });
        
        // Temporarily pause recognition
        if (recognitionActive && typeof speechRecognition !== 'undefined') {
            speechRecognition.pauseRecognition();
        }
        
        // Play output mode sound
        if (window.soundEffects) {
            window.soundEffects.playOutputModeSound();
        }
        
        // Update UI to show we're in output mode
        if (typeof uiController !== 'undefined' && typeof uiController.setCycleMode === 'function') {
            uiController.setCycleMode('output');
        } else {
            console.error('uiController or setCycleMode function not available');
            
            // Fallback direct DOM manipulation
            const cycleModeStatus = document.getElementById('cycle-mode-status');
            const cycleModeIndicator = document.getElementById('cycle-mode-indicator');
            
            if (cycleModeStatus) {
                cycleModeStatus.className = 'output-mode';
                cycleModeStatus.textContent = '◉ Output Mode (5s)';
            }
            
            if (cycleModeIndicator) {
                cycleModeIndicator.textContent = 'Displaying Braille output...';
            }
        }
        
        // Process the most recent recognized text
        const finalTextElement = document.getElementById('final-text');
        if (finalTextElement && finalTextElement.textContent.trim()) {
            // Get the most recent sentence or fragment
            const text = finalTextElement.textContent.trim();
            const sentences = text.split(/[.!?]+/);
            const lastSentence = sentences[sentences.length - 1].trim();
            
            if (lastSentence) {
                // Process this text for braille matching
                processSpeechForBraille(lastSentence);
            }
        }
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
    
    // Start the listening/output cycle after a delay - now handled by speakWelcome
    // This is now controlled by the text-to-speech.js once the welcome message is done
});

// Expose public methods
window.app = {
    loadLocalModel,
    startSpeechRecognition,
    stopSpeechRecognition,
    processSpeechForBraille,
    forceReload,
    startListeningCycle,
    getCurrentCycleMode: () => cycleMode
};
