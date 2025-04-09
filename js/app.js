/**
 * Main application logic for Speech to Braille
 * Handles speech recognition and braille translation
 */

// Speech recognition state
let recognitionActive = false;

// Initialize the application
function initApp() {
    // Speak welcome message if text-to-speech is available
    if (window.textToSpeech && typeof textToSpeech.speakWelcome === 'function') {
        textToSpeech.speakWelcome();
    }
    
    // Check if speech recognition is defined before using it
    if (typeof speechRecognition === 'undefined') {
        console.error('Speech recognition module is not loaded');
        
        // Wait a bit and try again - it might still be initializing
        setTimeout(() => {
            if (typeof speechRecognition !== 'undefined') {
                console.log('Speech recognition module loaded after delay');
                setupSpeechRecognitionEvents();
            } else {
                alert('Speech recognition module is not available. Please check console for errors.');
            }
        }, 1000);
        return;
    }
    
    // Setup event listeners for speech recognition events
    setupSpeechRecognitionEvents();
    
    // Add debugging helper to check if the speech recognition module is working
    console.log('Speech recognition module status:', {
        defined: typeof speechRecognition !== 'undefined',
        supported: typeof speechRecognition !== 'undefined' ? speechRecognition.isSupported() : false
    });
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
    if (recognitionActive) return;
    
    // Clear previous text when starting new session
    uiController.clearInterimText();
    
    const selectedMethod = uiController.getSpeechMethod();
    
    try {
        console.log(`Starting speech recognition with method: ${selectedMethod}`);
        if (typeof speechRecognition !== 'undefined' && speechRecognition) {
            console.log('Speech recognition object exists, starting...');
            speechRecognition.startRecognition();
        } else {
            throw new Error('Speech recognition module not initialized');
        }
    } catch (error) {
        console.error('Failed to start recognition:', error);
        alert(`Failed to start recognition: ${error.message}`);
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
        
        if (typeof formatBrailleArrayForDisplay === 'function' && typeof window.formatBrailleArrayForDisplay !== 'function') {
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
    } else {
        // No match found
        uiController.showNoMatch();
    }
}

// Helper function to force reload the page clearing cache
function forceReload() {
    console.log('Forcing page reload with cache clear...');
    // Add timestamp to URL to bypass cache
    window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
}

// Initialize app when loaded
document.addEventListener('DOMContentLoaded', initApp);

// Expose public methods
window.app = {
    loadLocalModel,
    startSpeechRecognition,
    stopSpeechRecognition,
    processSpeechForBraille,
    forceReload
};
