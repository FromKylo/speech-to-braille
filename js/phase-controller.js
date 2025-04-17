/**
 * Phase Controller
 * Manages application phase transitions and timing
 */

(function() {
    // Variables for phase control
    let currentPhase = 'introduction';
    let phaseTimer = null;
    
    // Phase elements
    let introPhase, recordingPhase, outputPhase;
    
    // Timer elements
    let recordingTimer, outputTimer;
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Phase controller initializing');
        
        // Ensure config is loaded
        if (!window.config) {
            console.error('Configuration not loaded! Creating default config.');
            window.config = {
                timings: {
                    introductionPhase: 10,
                    listeningPhase: 3,
                    outputPhase: 7
                },
                behavior: {
                    loopListeningIfNoMatch: true
                }
            };
        }
        
        // Log the actual values being used
        console.log('PHASE CONTROLLER: Using timing values:', 
            'Introduction:', window.config.timings.introductionPhase + 's',
            'Listening:', window.config.timings.listeningPhase + 's',
            'Output:', window.config.timings.outputPhase + 's'
        );
        
        // Get DOM elements
        initializeElements();
        
        // Update UI elements with config values
        updateTimingDisplay();
        
        // Flag to track if we've processed the introduction event
        window.hasMovedPastIntro = false;
        
        // Listen for introduction completion
        window.addEventListener('introCompleted', function(e) {
            console.log('Caught introCompleted event, transitioning to recording phase');
            if (currentPhase === 'introduction') {
                window.hasMovedPastIntro = true;
                showPhase('recording');
            }
        });
        
        // Override app's cycle mechanism to use our new phase system
        if (window.app) {
            window.app.startListeningCycle = function() {
                console.log('startListeningCycle called, current phase:', currentPhase);
                // Only transition if we're in the introduction phase
                if (currentPhase === 'introduction') {
                    window.hasMovedPastIntro = true;
                    showPhase('recording');
                }
            };
        }
        
        // Start with introduction phase
        showPhase('introduction');
        
        // Fallback timer for the entire introduction phase
        setTimeout(() => {
            if (currentPhase === 'introduction') {
                console.log(`Global fallback timer triggered after ${window.config.timings.introductionPhase}s - forcing transition to recording phase`);
                window.hasMovedPastIntro = true;
                showPhase('recording');
            }
        }, window.config.timings.introductionPhase * 1000);
        
        // Make phase control available globally
        window.phaseControl = {
            showPhase,
            getCurrentPhase: () => currentPhase
        };
    });
    
    // Initialize phase elements
    function initializeElements() {
        introPhase = document.getElementById('introduction-phase');
        recordingPhase = document.getElementById('recording-phase');
        outputPhase = document.getElementById('output-phase');
        
        recordingTimer = document.getElementById('recording-timer');
        outputTimer = document.getElementById('output-timer');
        
        if (!introPhase || !recordingPhase || !outputPhase) {
            console.error('Phase elements not found!');
        }
        
        if (!recordingTimer || !outputTimer) {
            console.error('Timer elements not found!');
        }
    }
    
    // Update UI elements with timing values
    function updateTimingDisplay() {
        const introTimeElement = document.getElementById('intro-time');
        const listenTimeElement = document.getElementById('listen-time');
        const outputTimeElement = document.getElementById('output-time');
        
        if (introTimeElement) introTimeElement.textContent = window.config.timings.introductionPhase;
        if (listenTimeElement) listenTimeElement.textContent = window.config.timings.listeningPhase;
        if (outputTimeElement) outputTimeElement.textContent = window.config.timings.outputPhase;
        
        // Update phase indicators with correct timing
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) {
            recordingIndicator.textContent = `● Recording (${window.config.timings.listeningPhase}s)`;
        }
        
        const outputIndicator = document.getElementById('output-indicator');
        if (outputIndicator) {
            outputIndicator.textContent = `◉ Output (${window.config.timings.outputPhase}s)`;
        }
    }
    
    // Update recognition status in troubleshooting
    function updateRecognitionStatus(isActive) {
        const statusElement = document.getElementById('recognition-active-status');
        if (statusElement) {
            statusElement.textContent = isActive ? 'Yes' : 'No';
            statusElement.style.color = isActive ? '#34a853' : '#ea4335';
        }
    }
    
    // Phase transition functions
    function showPhase(phase) {
        console.log(`Transitioning to phase: ${phase} at ${new Date().toLocaleTimeString()}`);
        
        // If we're trying to transition from introduction to any other phase
        if (currentPhase === 'introduction' && phase !== 'introduction') {
            window.hasMovedPastIntro = true;
        }
        
        // Update troubleshooting info
        const phaseIndicator = document.getElementById('current-phase-indicator');
        if (phaseIndicator) {
            phaseIndicator.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
        }
        
        // Update Arduino about phase change if BLE controller is available
        if (window.bleController && window.bleController.isConnected()) {
            console.log(`Notifying Arduino of phase change: ${phase}`);
            window.bleController.setPhase(phase).then(success => {
                if (!success) {
                    console.warn('Failed to update Arduino about phase change');
                }
            });
        }
        
        // Hide all phases
        introPhase.classList.remove('phase-active');
        recordingPhase.classList.remove('phase-active');
        outputPhase.classList.remove('phase-active');
        
        // Add a small timeout to force a reflow before showing the next phase
        setTimeout(() => {
            // Show the selected phase
            if (phase === 'introduction') {
                introPhase.classList.add('phase-active');
                
                console.log(`Setting introduction timeout for ${window.config.timings.introductionPhase}s`);
                // Use config value for introduction timer
                setTimeout(() => {
                    if (currentPhase === 'introduction' && !window.hasMovedPastIntro) {
                        console.log('Automatic timeout from introduction phase');
                        window.hasMovedPastIntro = true;
                        showPhase('recording');
                    }
                }, window.config.timings.introductionPhase * 1000);
                
            } else if (phase === 'recording') {
                recordingPhase.classList.add('phase-active');
                console.log(`Starting recording phase timer for ${window.config.timings.listeningPhase}s`);
                startPhaseTimer(recordingTimer, 'output', window.config.timings.listeningPhase);
                
                // Clear any previous text to ensure we only show current sentence
                const finalTextElement = document.getElementById('final-text');
                if (finalTextElement) finalTextElement.textContent = '';
                const interimTextElement = document.getElementById('interim-text');
                if (interimTextElement) interimTextElement.textContent = '';
                
                // Play recording sound
                if (window.textToSpeech && textToSpeech.playRecordingAudio) {
                    textToSpeech.playRecordingAudio();
                } else if (window.soundEffects) {
                    window.soundEffects.playListeningModeSound();
                }
                
                // Start speech recognition - add a small delay to ensure UI is ready
                setTimeout(() => {
                    if (window.app && app.startSpeechRecognition) {
                        console.log('Starting speech recognition for recording phase');
                        app.startSpeechRecognition();
                        updateRecognitionStatus(true);
                    }
                }, 300);
                
            } else if (phase === 'output') {
                outputPhase.classList.add('phase-active');
                console.log(`Starting output phase timer for ${window.config.timings.outputPhase}s`);
                startPhaseTimer(outputTimer, 'recording', window.config.timings.outputPhase);
                
                // Play output sound
                if (window.textToSpeech && textToSpeech.playOutputAudio) {
                    textToSpeech.playOutputAudio();
                } else if (window.soundEffects) {
                    window.soundEffects.playOutputModeSound();
                }
                
                // Pause speech recognition
                if (window.app && app.stopSpeechRecognition) {
                    app.stopSpeechRecognition();
                    updateRecognitionStatus(false);
                }
                
                // Process the current text for braille output
                processFinalText();
            }
            
            currentPhase = phase;
        }, 10);
    }
    
    // Timer countdown function
    function startPhaseTimer(timerElement, nextPhase, duration) {
        if (phaseTimer) clearInterval(phaseTimer);
        
        if (!timerElement) {
            console.error('Timer element not found');
            return;
        }
        
        console.log(`Starting phase timer with duration: ${duration}s`);
        
        let timeLeft = duration;
        timerElement.textContent = timeLeft;
        
        // Update the timer appearance
        timerElement.style.background = `conic-gradient(#4285f4 0%, transparent 0%)`;
        
        phaseTimer = setInterval(() => {
            timeLeft -= 1;
            
            // Update the timer
            if (timerElement) {
                timerElement.textContent = timeLeft;
                
                // Update the background conic gradient to show progress
                const progress = (1 - timeLeft/duration) * 100;
                timerElement.style.background = `conic-gradient(#4285f4 ${progress}%, transparent ${progress}%)`;
            }
            
            // If timer is done, move to next phase
            if (timeLeft <= 0) {
                clearInterval(phaseTimer);
                showPhase(nextPhase);
            }
        }, 1000);
    }
    
    // Process the final text to find braille matches
    function processFinalText() {
        const finalTextElement = document.getElementById('final-text');
        if (finalTextElement && finalTextElement.textContent.trim()) {
            const text = finalTextElement.textContent.trim();
            // If braille translator is available, process the text
            if (window.app && app.processSpeechForBraille) {
                app.processSpeechForBraille(text);
            }
        }
    }
})();

// Add debug helper for phase transitions
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const debugEl = document.createElement('div');
        debugEl.style.position = 'fixed';
        debugEl.style.bottom = '5px';
        debugEl.style.right = '5px';
        debugEl.style.background = 'rgba(0,0,0,0.7)';
        debugEl.style.color = 'white';
        debugEl.style.padding = '5px';
        debugEl.style.fontSize = '10px';
        debugEl.style.fontFamily = 'monospace';
        debugEl.style.zIndex = '9999';
        debugEl.id = 'phase-debug-helper';
        document.body.appendChild(debugEl);
        
        // Log phase changes
        setInterval(() => {
            const phase = document.querySelector('.phase-container.phase-active');
            const phaseId = phase ? phase.id : 'unknown';
            debugEl.innerHTML = `Current visible phase: ${phaseId}<br>hasMovedPastIntro: ${window.hasMovedPastIntro}`;
        }, 2000);
    });
})();
