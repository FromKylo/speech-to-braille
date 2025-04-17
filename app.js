document.addEventListener('DOMContentLoaded', initializeApp);

// Global variables
let recognition;
let isRecognizing = false;
const translator = window.brailleTranslator || { 
    textToBraille: text => {
        showError('Braille translator not loaded properly');
        return text;
    }
};

// Initialize the application
function initializeApp() {
    // Check for SpeechRecognition support
    if (!checkSpeechRecognitionSupport()) {
        showError('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.');
        disableControls();
        return;
    }
    
    // Initialize speech recognition
    setupSpeechRecognition();
    
    // Set up event listeners
    document.getElementById('startButton').addEventListener('click', startRecognition);
    document.getElementById('stopButton').addEventListener('click', stopRecognition);
    document.getElementById('resetButton').addEventListener('click', resetOutputs);
    
    updateStatus('Ready');
}

// Check if speech recognition is supported
function checkSpeechRecognitionSupport() {
    return 'SpeechRecognition' in window || 
           'webkitSpeechRecognition' in window || 
           'mozSpeechRecognition' in window ||
           'msSpeechRecognition' in window;
}

// Set up speech recognition
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition ||
                             window.mozSpeechRecognition || window.msSpeechRecognition;
    
    if (!SpeechRecognition) return;
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        isRecognizing = true;
        updateStatus('Listening...');
        toggleButtons(true);
    };
    
    recognition.onresult = handleRecognitionResult;
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showError(`Recognition error: ${event.error}`);
        if (isRecognizing) stopRecognition();
    };
    
    recognition.onend = () => {
        isRecognizing = false;
        updateStatus('Recognition stopped');
        toggleButtons(false);
    };
}

// Handle speech recognition results
function handleRecognitionResult(event) {
    try {
        const speechOutput = document.getElementById('speechOutput');
        const brailleOutput = document.getElementById('brailleOutput');
        
        if (!speechOutput || !brailleOutput) {
            throw new Error('Output elements not found');
        }
        
        let transcript = '';
        
        // Get the final transcript
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        // Update speech output
        if (transcript.trim()) {
            speechOutput.textContent = transcript;
            
            // Convert to braille and update braille output
            try {
                const brailleText = translator.textToBraille(transcript);
                brailleOutput.textContent = brailleText;
            } catch (error) {
                console.error('Braille translation error:', error);
                showError('Failed to convert text to Braille');
            }
        }
    } catch (error) {
        console.error('Error handling recognition result:', error);
        showError('Error processing speech recognition results');
    }
}

// Start speech recognition
function startRecognition() {
    if (isRecognizing) return;
    
    hideError();
    
    try {
        recognition.start();
    } catch (error) {
        console.error('Error starting recognition:', error);
        showError('Could not start speech recognition');
    }
}

// Stop speech recognition
function stopRecognition() {
    if (!isRecognizing) return;
    
    try {
        recognition.stop();
    } catch (error) {
        console.error('Error stopping recognition:', error);
        isRecognizing = false;
        toggleButtons(false);
    }
}

// Reset outputs
function resetOutputs() {
    document.getElementById('speechOutput').textContent = '';
    document.getElementById('brailleOutput').textContent = '';
    hideError();
    updateStatus('Ready');
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.hidden = false;
    }
}

// Hide error message
function hideError() {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.hidden = true;
    }
}

// Update status indicator
function updateStatus(message) {
    const statusElement = document.getElementById('statusIndicator');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Toggle button states
function toggleButtons(isListening) {
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    
    if (startButton) startButton.disabled = isListening;
    if (stopButton) stopButton.disabled = !isListening;
}

// Disable all controls when speech recognition is not supported
function disableControls() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = true;
    });
    updateStatus('Speech recognition not available');
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (isRecognizing && recognition) {
        recognition.stop();
    }
});
