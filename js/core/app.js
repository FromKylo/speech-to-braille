/**
 * Speech to Braille Application
 * 
 * Main application module that coordinates all components
 * of the speech-to-braille translator.
 */

const speechToBraille = (function() {
    // Application state
    const config = {
        PHASES: {
            INTRODUCTION: { DURATION: 10000, NAME: 'introduction' },
            RECORDING: { DURATION: 3000, NAME: 'recording' },
            OUTPUT: { DURATION: 7000, NAME: 'output' }
        },
        AUTO_CYCLE: false,
        DEBUG_MODE: false
    };
    
    // Current state tracking
    let currentPhase = 'introduction';
    let isInitialized = false;
    let lastSpeechResult = '';
    let lastBrailleResult = null;
    
    // Initialize the application
    async function init() {
        console.log('Initializing Speech to Braille application...');
        
        try {
            // Update UI for loading
            showLoadingBar();
            updateLoadingProgress(10, 'Starting initialization...');
            
            // Initialize UI controller
            if (window.uiController) {
                updateLoadingProgress(20, 'Initializing UI...');
                uiController.init();
            }
            
            // Initialize braille translator
            if (window.brailleTranslator) {
                updateLoadingProgress(40, 'Loading braille translator...');
                await brailleTranslator.init();
            }
            
            // Initialize braille visualizer
            if (window.brailleVisualizer) {
                updateLoadingProgress(60, 'Setting up braille visualizer...');
                brailleVisualizer.init();
            }
            
            // Initialize text-to-speech
            if (window.textToSpeech) {
                updateLoadingProgress(80, 'Preparing text-to-speech...');
                // Text-to-speech self-initializes
            }
            
            // Initialize BLE controller
            if (window.bleController) {
                updateLoadingProgress(85, 'Setting up BLE controller...');
                // BLE controller self-initializes
            }
            
            // Set up speech recognition events
            if (window.speechRecognition) {
                updateLoadingProgress(90, 'Setting up speech recognition...');
                setupSpeechEvents();
            }
            
            // Setup phase transitions
            setupPhaseTransitions();
            
            // Complete initialization
            updateLoadingProgress(100, 'Initialization complete');
            setTimeout(hideLoadingBar, 500);
            
            isInitialized = true;
            console.log('Speech to Braille application initialized successfully');
            
            // Start with the introduction phase
            setPhase('introduction');
            
            return true;
        } catch (error) {
            console.error('Error initializing application:', error);
            updateLoadingProgress(100, 'Error during initialization');
            if (window.uiController) {
                uiController.setProgressBarError();
            }
            return false;
        }
    }
    
    // Set up speech recognition events
    function setupSpeechEvents() {
        if (!window.speechRecognition) return;
        
        // Handle speech recognition start event
        speechRecognition.on('start', () => {
            console.log('Speech recognition started');
            if (window.uiController) {
                uiController.setRecordingState(true);
            }
        });
        
        // Handle speech recognition end event
        speechRecognition.on('end', () => {
            console.log('Speech recognition ended');
            if (window.uiController) {
                uiController.setRecordingState(false);
            }
        });
        
        // Handle final speech results
        speechRecognition.on('result', (text) => {
            console.log('Final speech result:', text);
            lastSpeechResult = text;
            if (window.uiController) {
                uiController.updateFinalText(text);
                uiController.clearInterimText();
            }
            
            // Process for Braille conversion
            processSpeechForBraille(text);
        });
        
        // Handle interim speech results
        speechRecognition.on('partialresult', (text) => {
            if (window.uiController) {
                uiController.updateInterimText(text);
            }
        });
        
        // Handle speech recognition errors
        speechRecognition.on('error', (error) => {
            console.error('Speech recognition error:', error);
            if (window.uiController) {
                uiController.updateInterimText(`Error: ${error.message || 'Unknown error'}`);
            }
        });
    }
    
    // Process speech for Braille translation
    function processSpeechForBraille(text) {
        // Ensure we have text and the braille translator is available
        if (!text || !window.brailleTranslator) {
            showNoMatch();
            return;
        }
        
        // Clean and normalize the text
        const cleanText = text.trim().toLowerCase();
        
        if (!cleanText) {
            showNoMatch();
            return;
        }
        
        console.log('Processing for Braille:', cleanText);
        
        // Split the text into words and get the last word
        // This is a simple implementation - could be improved to handle more complex cases
        const words = cleanText.split(/\s+/);
        const lastWord = words[words.length - 1].replace(/[^\w]/, '');
        
        if (!lastWord) {
            showNoMatch();
            return;
        }
        
        // Translate the word to Braille
        const result = brailleTranslator.translate(lastWord);
        
        if (result && result.array) {
            // We have a match
            showBrailleMatch(result);
            lastBrailleResult = result;
            
            // Also display in the visualizer if available
            if (window.brailleVisualizer) {
                brailleVisualizer.updateDisplay(result.array);
            }
            
            // Send to BLE device if connected
            if (window.bleController && bleController.isConnected()) {
                bleController.sendBrailleData(result.array);
            }
        } else {
            console.log('No Braille match found for:', lastWord);
            showNoMatch();
            
            // Clear visualizer
            if (window.brailleVisualizer) {
                brailleVisualizer.clearDots();
            }
        }
    }
    
    // Show Braille match in the UI
    function showBrailleMatch(result) {
        if (window.uiController) {
            uiController.showBrailleMatch(result);
        }
    }
    
    // Show no match found in the UI
    function showNoMatch() {
        if (window.uiController) {
            uiController.showNoMatch();
        }
    }
    
    // Start speech recognition
    function startSpeechRecognition() {
        if (!window.speechRecognition) {
            console.error('Speech recognition not available');
            return false;
        }
        
        console.log('Starting speech recognition...');
        speechRecognition.startRecognition();
        return true;
    }
    
    // Stop speech recognition
    function stopSpeechRecognition() {
        if (!window.speechRecognition) return false;
        
        console.log('Stopping speech recognition...');
        speechRecognition.stopRecognition();
        return true;
    }
    
    // Set current application phase
    function setPhase(phase) {
        console.log(`Setting application phase to: ${phase}`);
        
        // Validate phase
        if (!config.PHASES[phase.toUpperCase()]) {
            console.error(`Invalid phase: ${phase}`);
            return false;
        }
        
        currentPhase = phase.toLowerCase();
        
        // Update UI based on phase
        updatePhaseUI(currentPhase);
        
        // Perform phase-specific actions
        switch(currentPhase) {
            case 'introduction':
                handleIntroductionPhase();
                break;
                
            case 'recording':
                handleRecordingPhase();
                break;
                
            case 'output':
                handleOutputPhase();
                break;
        }
        
        // Update BLE device if connected
        if (window.bleController && bleController.isConnected()) {
            bleController.setPhase(currentPhase);
        }
        
        return true;
    }
    
    // Handle the introduction phase
    function handleIntroductionPhase() {
        // Stop any speech recognition if active
        stopSpeechRecognition();
        
        // Reset UI elements
        if (window.uiController) {
            uiController.clearInterimText();
            uiController.clearFinalText();
        }
        
        // Speak introduction if text-to-speech is available
        if (window.textToSpeech) {
            setTimeout(() => {
                textToSpeech.speakIntroduction();
            }, 1000);
        } else {
            // No TTS, just transition after a delay
            setTimeout(() => {
                setPhase('recording');
            }, 5000);
        }
    }
    
    // Handle the recording phase
    function handleRecordingPhase() {
        // Start speech recognition
        startSpeechRecognition();
        
        // Set up automatic transition to output phase
        setTimeout(() => {
            if (currentPhase === 'recording') {
                setPhase('output');
            }
        }, config.PHASES.RECORDING.DURATION);
        
        // Update UI for cycle mode
        if (window.uiController) {
            uiController.updateCycleModeUI('recording');
        }
    }
    
    // Handle the output phase
    function handleOutputPhase() {
        // Stop speech recognition
        stopSpeechRecognition();
        
        // If we have a last result, process it
        if (lastSpeechResult) {
            processSpeechForBraille(lastSpeechResult);
        }
        
        // Set up automatic transition back to recording if cycling is enabled
        if (config.AUTO_CYCLE) {
            setTimeout(() => {
                if (currentPhase === 'output') {
                    setPhase('recording');
                }
            }, config.PHASES.OUTPUT.DURATION);
        }
        
        // Update UI for cycle mode
        if (window.uiController) {
            uiController.updateCycleModeUI('output');
        }
    }
    
    // Update UI for the current phase
    function updatePhaseUI(phase) {
        // Use window.phaseControl if available (from the inline script in index.html)
        if (window.phaseControl && window.phaseControl.showPhase) {
            window.phaseControl.showPhase(phase);
        } else {
            // Fallback - manually update UI
            const phaseElements = document.querySelectorAll('.phase-container');
            phaseElements.forEach(el => {
                el.classList.remove('phase-active');
                
                if (el.id === `${phase}-phase`) {
                    el.classList.add('phase-active');
                }
            });
        }
        
        // Update UI elements to show current phase
        if (window.uiController) {
            uiController.updateCycleModeUI(phase);
        }
    }
    
    // Show loading bar in UI
    function showLoadingBar() {
        if (window.uiController) {
            uiController.showLoadingBar();
        }
    }
    
    // Hide loading bar in UI
    function hideLoadingBar() {
        if (window.uiController) {
            uiController.hideLoadingBar();
        }
    }
    
    // Update loading progress
    function updateLoadingProgress(percent, message) {
        if (window.uiController) {
            uiController.updateLoadingProgress(percent, message);
        }
        console.log(`Loading ${percent}%: ${message}`);
    }
    
    // Start the listening cycle (deprecated, using phase system now)
    function startListeningCycle() {
        setPhase('recording');
    }
    
    // Get application configuration
    function getConfig() {
        return config;
    }
    
    // Get current application state
    function getState() {
        return {
            phase: currentPhase,
            isInitialized,
            lastSpeechResult,
            hasLastBrailleResult: !!lastBrailleResult
        };
    }
    
    // Set up transitions between phases
    function setupPhaseTransitions() {
        // Listen for introduction completion
        window.addEventListener('introCompleted', function() {
            if (currentPhase === 'introduction') {
                setPhase('recording');
            }
        });
        
        // Add global phase control for compatibility
        window.speechToBraille = {
            setPhase,
            startSpeechRecognition,
            stopSpeechRecognition,
            processSpeechForBraille
        };
    }
    
    // Initialize on load
    window.addEventListener('DOMContentLoaded', init);
    
    // Public API
    return {
        init,
        startSpeechRecognition,
        stopSpeechRecognition,
        processSpeechForBraille,
        setPhase,
        getConfig,
        getState,
        startListeningCycle
    };
})();