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

// Add these variables at the top of your app.js module scope
let lastProcessedInterimText = '';
let interimProcessingTimeout = null;

// Initialize the application
function initApp() {
    console.log('Initializing application...');
    
    // Check microphone status after page loads
    setTimeout(checkMicrophoneStatus, 1500);
    
    // No need to call speakWelcome here - we'll auto-start speakIntroduction from text-to-speech.js
    
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
            
            // Process interim results if enabled in config
            if (window.config?.behavior?.processInterimResults) {
                // Cancel any pending timeout to avoid processing the same text multiple times
                if (interimProcessingTimeout) {
                    clearTimeout(interimProcessingTimeout);
                }
                
                // Only process if text is different from last processed text
                if (text !== lastProcessedInterimText && text.trim().length > 0) {
                    // Set a timeout to give recognition time to stabilize
                    interimProcessingTimeout = setTimeout(() => {
                        // Process the interim text
                        processInterimSpeechForBraille(text);
                        // Remember what we processed to avoid duplicates
                        lastProcessedInterimText = text;
                    }, window.config?.behavior?.interimResultDelay || 600);
                }
            }
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

    const speechStatusIndicator = document.getElementById('speech-status-indicator');
    if (speechStatusIndicator) {
        speechStatusIndicator.className = 'status-indicator-large warning';
        speechStatusIndicator.textContent = 'Initializing speech recognition...';
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
        
        // Explicitly check microphone permissions with better user feedback
        uiController.updateSpeechLoadingProgress(40, 'Requesting microphone permission...');
        
        const permissionGranted = await speechRecognition.checkMicrophonePermission();
        
        if (!permissionGranted) {
            throw new Error('Microphone permission required. Please allow microphone access and try again.');
        }
        
        // Update the status indicator
        if (speechStatusIndicator) {
            speechStatusIndicator.className = 'status-indicator-large warning';
            speechStatusIndicator.textContent = 'Starting speech recognition engine...';
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
        
        // Update the status indicator
        if (speechStatusIndicator) {
            speechStatusIndicator.className = 'status-indicator-large error';
            speechStatusIndicator.textContent = `Speech recognition error: ${error.message}`;
        }
        
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
        
        // If the error is related to microphone permissions, show the retry button
        if (error.message.includes('microphone') || error.message.includes('permission')) {
            // Add a retry button to request permissions
            const retryButton = document.createElement('button');
            retryButton.className = 'request-mic-access';
            retryButton.textContent = 'Grant Microphone Access';
            retryButton.addEventListener('click', () => {
                speechRecognition.checkMicrophonePermission();
            });
            
            if (speechOutput) {
                speechOutput.appendChild(retryButton);
            }
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
    if (!brailleTranslator || !brailleTranslator.isDatabaseLoaded()) {
        console.warn('Braille database not loaded yet');
        return null;
    }
    
    if (!text || typeof text !== 'string' || !text.trim()) {
        console.warn('Empty or invalid text provided to braille processor');
        return null;
    }
    
    console.log(`Processing speech for braille matching: "${text}"`);
    
    // Clean the text before processing (remove punctuation, etc.)
    const cleanedText = text.trim().replace(/[^\w\s']|_/g, "").toLowerCase();
    console.log(`Cleaned text for processing: "${cleanedText}"`);
    
    // Try to process the full text first
    let result = brailleTranslator.processText(cleanedText);
    
    // If no match found with the full text, try individual words
    if (!result && cleanedText.includes(' ')) {
        console.log('No match found for full text, trying individual words');
        const words = cleanedText.split(/\s+/);
        
        // Try each word individually, starting with the longest ones
        // as they're more likely to be meaningful content words
        const sortedWords = [...words].sort((a, b) => b.length - a.length);
        
        for (const word of sortedWords) {
            // Skip very short words as they're often articles, prepositions, etc.
            if (word.length < 2) continue;
            
            console.log(`Trying individual word: "${word}"`);
            result = brailleTranslator.processText(word);
            
            if (result) {
                console.log(`Found match for word: "${word}"`, result);
                break;
            }
        }
    }
    
    if (result) {
        // We found a match!
        console.log('Found braille match for:', result.word);
        
        // Format and display the braille array
        let formattedArray;
        
        if (typeof window.formatBrailleArrayForDisplay === 'function') {
            // Check if the utility function from imported module is available
            formattedArray = window.formatBrailleArrayForDisplay(result.array);
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
        
        // Update UI with matched result and array
        uiController.updateBrailleArray(formattedArray);
        uiController.showBrailleMatch(result);
        
        // Dispatch event that a match was found
        const matchEvent = new CustomEvent('brailleMatchFound', { 
            detail: { word: result.word } 
        });
        document.dispatchEvent(matchEvent);
        
        // Update the visual braille dot display with retry mechanism
        let visualizerRetries = 0;
        const updateVisualizer = () => {
            if (window.brailleVisualizer) {
                console.log('Updating braille visualizer with array:', result.array);
                try {
                    window.brailleVisualizer.updateDisplay(result.array);
                } catch (error) {
                    console.error('Error updating visualizer:', error);
                    if (visualizerRetries < 3) {
                        visualizerRetries++;
                        setTimeout(updateVisualizer, 200);
                    }
                }
            } else {
                console.warn('Braille visualizer not available');
                if (visualizerRetries < 3) {
                    visualizerRetries++;
                    setTimeout(updateVisualizer, 200);
                }
            }
        };
        
        // Start visualizer update with short delay
        setTimeout(updateVisualizer, 100);
        
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
        
        // Add speech handling with retry mechanism
        if (window.textToSpeech) {
            console.log('Using speech feedback for matched word:', result.word);
            try {
                setTimeout(() => {
                    if (window.textToSpeech.speakMatchedWord) {
                        window.textToSpeech.speakMatchedWord(result.word);
                    } else {
                        window.textToSpeech.speak(result.word);
                    }
                }, 300);
            } catch (error) {
                console.error('Text-to-speech error:', error);
            }
        }
        
        return result; // Return the result object to indicate a match
    } else {
        // No match found
        console.log('No braille match found for text:', text);
        uiController.showNoMatch();
        
        // Dispatch event that no match was found
        const noMatchEvent = new CustomEvent('brailleNoMatchFound');
        document.dispatchEvent(noMatchEvent);
        
        // Clear the braille visualizer when no match is found
        if (window.brailleVisualizer) {
            brailleVisualizer.clearDots();
        }
        
        // Send empty array to ESP32 to reset all dots when no match is found
        if (window.bleController && bleController.isConnected()) {
            console.log('No match found - sending empty array to reset ESP32 dots');
            bleController.sendBrailleData([]);
        }
        
        return null; // Return null to indicate no match
    }
}

// Add this new function to process interim speech results
function processInterimSpeechForBraille(text) {
    if (!brailleTranslator.isDatabaseLoaded()) {
        console.warn('Braille database not loaded yet');
        return null;
    }
    
    // Split the text into words
    const words = text.trim().split(/\s+/);
    
    // Get the last word as it's most likely what the user is currently saying
    const lastWord = words[words.length - 1];
    
    // Only process words that meet minimum length requirements
    const minLength = window.config?.behavior?.minimumInterimWordLength || 2;
    if (lastWord && lastWord.length >= minLength) {
        console.log('Processing interim word:', lastWord);
        
        // Use the existing processSpeechForBraille function with just the last word
        const result = processSpeechForBraille(lastWord);
        
        if (result) {
            console.log('Found interim match for:', lastWord);
            // Visual indicator that we're using an interim result
            const interimIndicator = document.createElement('div');
            interimIndicator.textContent = '🔍 Interim match';
            interimIndicator.style.color = '#4285f4';
            interimIndicator.style.fontSize = '0.8rem';
            interimIndicator.style.margin = '5px 0';
            
            const matchedWord = document.getElementById('matched-word');
            if (matchedWord && matchedWord.parentNode) {
                const existingIndicator = matchedWord.parentNode.querySelector('.interim-indicator');
                if (existingIndicator) {
                    existingIndicator.remove();
                }
                interimIndicator.className = 'interim-indicator';
                matchedWord.parentNode.insertBefore(interimIndicator, matchedWord.nextSibling);
            }
        }
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
    
    // Calculate duration based on current mode and config
    const getCurrentDuration = () => {
        return (cycleMode === 'listening' ? 
            (window.config ? window.config.timings.listeningPhase : 3) : 
            (window.config ? window.config.timings.outputPhase : 7)) * 1000;
    };
    
    // Start the cycle timer with dynamic duration
    const setupNextCycle = () => {
        const duration = getCurrentDuration();
        console.log(`Setting up ${cycleMode} cycle for ${duration}ms`);
        
        cycleTimer = setTimeout(() => {
            // Toggle between listening and output modes
            cycleMode = cycleMode === 'listening' ? 'output' : 'listening';
            console.log(`Cycle timer triggered - switching to ${cycleMode} mode`);
            updateCycleUI();
            setupNextCycle(); // Setup next cycle with new duration
        }, duration);
    };
    
    setupNextCycle();
}

// Function to update UI based on cycle mode
function updateCycleUI() {
    // Check if introduction is completed
    if (window.textToSpeech && typeof textToSpeech.introCompleted === 'function' && !textToSpeech.introCompleted()) {
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
        if (window.textToSpeech && typeof textToSpeech.playRecordingAudio === 'function') {
            textToSpeech.playRecordingAudio();
        } else if (window.soundEffects) {
            window.soundEffects.playListeningModeSound();
        }
        
        // Update recording indicator state
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) {
            recordingIndicator.classList.remove('recording-off');
            recordingIndicator.classList.add('recording-on');
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
        if (window.textToSpeech && typeof textToSpeech.playOutputAudio === 'function') {
            textToSpeech.playOutputAudio();
        } else if (window.soundEffects) {
            window.soundEffects.playOutputModeSound();
        }
        
        // Ensure output indicator is visible and blinking
        const outputIndicator = document.getElementById('output-indicator');
        if (outputIndicator) {
            outputIndicator.classList.remove('hidden');
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

// Add a new function to proactively check microphone permission status
function checkMicrophoneStatus() {
    if (typeof speechRecognition !== 'undefined' && 
        typeof speechRecognition.requestMicrophonePermission === 'function') {
        // Check but don't show UI if denied (silent mode)
        speechRecognition.requestMicrophonePermission(true);
    }
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
    pauseSpeechRecognition,
    processSpeechForBraille,
    processInterimSpeechForBraille,
    forceReload,
    startListeningCycle,
    getCurrentCycleMode: () => cycleMode
};

// Replace timing functions with calls to phase controller
function startIntroductionPhase() {
  console.log('Deferring to phase controller for introduction phase');
  if (window.phaseControl) {
    window.phaseControl.showPhase('introduction');
  }
}

function startListeningPhase() {
  console.log('Deferring to phase controller for listening phase');
  if (window.phaseControl) {
    window.phaseControl.showPhase('recording');
  }
}

function startOutputPhase() {
  console.log('Deferring to phase controller for output phase');
  if (window.phaseControl) {
    window.phaseControl.showPhase('output');
  }
}

// Modify your section transition function or event handlers to speak introduction automatically
function showIntroductionSection() {
    // Speak introduction automatically
    if (window.speakIntroduction) {
        window.speakIntroduction();
    }
    // Defer to phase controller
    if (window.phaseControl) {
        window.phaseControl.showPhase('introduction');
    }
}

// Modify your word matching function to automatically speak matched words
function handleWordMatch(matchedWord) {
    // Your existing code to handle matched word
    // ...
    const matchedWordElement = document.getElementById('matched-word');
    if (matchedWordElement) {
        matchedWordElement.textContent = matchedWord;
    }
    // Automatically speak the matched word
    if (window.speakMatchedWord) {
        window.speakMatchedWord(matchedWord);
    }
}

// Add this to the app module

// Function to temporarily pause speech recognition without fully stopping
function pauseSpeechRecognition() {
    console.log('Pausing speech recognition');
    if (recognitionActive && typeof speechRecognition !== 'undefined') {
        if (typeof speechRecognition.pauseRecognition === 'function') {
            speechRecognition.pauseRecognition();
        } else {
            // If no pause method, just stop it
            stopSpeechRecognition();
        }
    }
}

// Expand the app.js public API to include the new method
window.app = {
    loadLocalModel,
    startSpeechRecognition,
    stopSpeechRecognition,
    pauseSpeechRecognition,
    processSpeechForBraille,
    processInterimSpeechForBraille,
    forceReload,
    startListeningCycle,
    getCurrentCycleMode: () => cycleMode
};

// Add these event listeners to update the speech status indicator
document.addEventListener('DOMContentLoaded', function() {
    // Listen for speech recognition events
    document.addEventListener('speechRecognitionStarted', function() {
        const statusIndicator = document.getElementById('speech-status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator-large success';
            statusIndicator.textContent = 'Speech recognition is active and listening.';
        }
    });
    
    document.addEventListener('speechRecognitionError', function(event) {
        const statusIndicator = document.getElementById('speech-status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator-large error';
            statusIndicator.textContent = `Speech recognition error: ${event.detail || 'Unknown error'}`;
        }
    });
    
    document.addEventListener('speechRecognitionResults', function() {
        const statusIndicator = document.getElementById('speech-status-indicator');
        if (statusIndicator && statusIndicator.className.includes('error')) {
            statusIndicator.className = 'status-indicator-large success';
            statusIndicator.textContent = 'Speech recognition is working correctly.';
        }
    });
});
