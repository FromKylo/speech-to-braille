/**
 * Main application logic for Speech to Braille
 * Handles speech recognition and braille translation
 */

// Speech recognition state
let recognitionActive = false;

// Initialize the application
function initApp() {
    // Check if speech recognition is defined before using it
    if (typeof speechRecognition === 'undefined') {
        console.error('Speech recognition module is not loaded');
        alert('Speech recognition module is not available. Please check console for errors.');
        return;
    }
    
    // Set up DOM element references
    setupDOMReferences();
    
    // Setup event listeners
    setupEventListeners();
    
    // Add debugging helper to check if the speech recognition module is working
    console.log('Speech recognition module status:', {
        defined: typeof speechRecognition !== 'undefined',
        supported: typeof speechRecognition !== 'undefined' ? speechRecognition.isSupported() : false,
        webSpeech: typeof speechRecognition !== 'undefined' ? speechRecognition.webSpeechRecognition : false
    });
}

// Set up references to DOM elements
function setupDOMReferences() {
    // These references are now initialized in ui-controller.js
}

// Set up event listeners for buttons and select elements
function setupEventListeners() {
    if (typeof speechRecognition !== 'undefined') {
        // Set up event handlers for our speech recognition service
        speechRecognition.on('start', () => {
            console.log('Speech recognition started');
            uiController.setRecordingState(true);
        });
        
        speechRecognition.on('end', () => {
            console.log('Speech recognition ended');
            uiController.setRecordingState(false);
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
            alert(`Speech recognition error: ${error}`);
        });
    }

    // Button event listeners are set up in ui-controller.js
}

// Function to load the local model
async function loadLocalModel() {
    // Show loading bar
    uiController.showLoadingBar();
    uiController.updateLoadingProgress(0, 'Preparing to download model...');
    
    try {
        // Check if setWorkerPath method exists
        if (typeof speechRecognition.setWorkerPath === 'function') {
            // Set worker path to local Vosk bundle using method
            speechRecognition.setWorkerPath('/node_modules/vosk-browser/dist/vosk-worker.js');
        } else {
            console.warn('speechRecognition.setWorkerPath is not available - will use default worker path');
            // Continue without setting worker path - we'll rely on the default path
        }
        
        // Load local model for speech recognition
        await speechRecognition.loadLocalModel({
            progressCallback: uiController.updateLoadingProgress,
            // Provide worker URL directly in the options as fallback
            workerPath: '/node_modules/vosk-browser/dist/vosk-worker.js'
        });
        
        // Update UI
        uiController.updateModelStatus('local');
        uiController.enableStartButton();
        
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
        await speechRecognition.start(selectedMethod);
        console.log('Speech recognition start method called');
    } catch (error) {
        console.error('Failed to start recognition:', error);
        alert(`Failed to start recognition: ${error.message}`);
    }
}

// Function to stop speech recognition
function stopSpeechRecognition() {
    if (recognitionActive && speechRecognition) {
        console.log('Stopping speech recognition');
        speechRecognition.stop();
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
