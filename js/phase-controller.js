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
    let recordingTimer, outputTimer, introTimer;
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Phase controller initializing');
        
        // Ensure config is loaded and valid
        if (!window.config || !window.config.timings) {
            console.error('Configuration not loaded or invalid! Creating default config.');
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
        
        // Ensure all timing values are valid numbers
        window.config.timings.introductionPhase = Math.max(1, parseInt(window.config.timings.introductionPhase) || 10);
        window.config.timings.listeningPhase = Math.max(1, parseInt(window.config.timings.listeningPhase) || 3);
        window.config.timings.outputPhase = Math.max(1, parseInt(window.config.timings.outputPhase) || 7);
        
        // Make config globally available for browser JavaScript (migrated from init.js)
        window.speechToBrailleConfig = window.config;
        
        // Log the actual values being used
        console.log('PHASE CONTROLLER: Using timing values:', 
            'Introduction:', window.config.timings.introductionPhase + 's',
            'Listening:', window.config.timings.listeningPhase + 's',
            'Output:', window.config.timings.outputPhase + 's'
        );
        
        // Get DOM elements
        initializeElements();
        
        // Update CSS variables based on config
        updateTimingCSS();
        
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
        
        // Make phase control available globally
        window.phaseControl = {
            showPhase,
            getCurrentPhase: () => currentPhase,
            updateTimingCSS: updateTimingCSS  // Expose for dynamic updates
        };
    });
    
    // Initialize phase elements
    function initializeElements() {
        introPhase = document.getElementById('introduction-phase');
        recordingPhase = document.getElementById('recording-phase');
        outputPhase = document.getElementById('output-phase');
        
        introTimer = document.getElementById('intro-timer');
        recordingTimer = document.getElementById('recording-timer');
        outputTimer = document.getElementById('output-timer');
        
        if (!introPhase || !recordingPhase || !outputPhase) {
            console.error('Phase elements not found!');
        }
        
        if (!recordingTimer || !outputTimer) {
            console.warn('Some timer elements not found!');
        }
    }
    
    // Update CSS variables based on config (enhanced with code from init.js)
    function updateTimingCSS() {
        const root = document.documentElement;
        root.style.setProperty('--intro-phase-duration', `${window.config.timings.introductionPhase}s`);
        root.style.setProperty('--listening-phase-duration', `${window.config.timings.listeningPhase}s`);
        root.style.setProperty('--output-phase-duration', `${window.config.timings.outputPhase}s`);
        console.log('Updated CSS timing variables:', 
            getComputedStyle(root).getPropertyValue('--intro-phase-duration'),
            getComputedStyle(root).getPropertyValue('--listening-phase-duration'),
            getComputedStyle(root).getPropertyValue('--output-phase-duration')
        );
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
        
        // Clear any existing timer to prevent multiple timers running
        if (phaseTimer) {
            clearInterval(phaseTimer);
            phaseTimer = null;
            console.log('Cleared existing phase timer');
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
                console.log(`Starting introduction phase timer for ${window.config.timings.introductionPhase}s`);
                startPhaseTimer(introTimer, 'recording', window.config.timings.introductionPhase);
                
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
                // Check if we found a braille match
                let matchFound = false;
                
                // Process text and check if a match was found
                matchFound = processFinalText();
                
                // Also check our secondary flag in case result is not reliable
                if (window.textToSpeech && textToSpeech.wasBrailleMatchFound) {
                    matchFound = matchFound || textToSpeech.wasBrailleMatchFound();
                }
                
                // If no match found and looping is enabled in config, stay in recording phase
                if (!matchFound && window.config && window.config.behavior && 
                    window.config.behavior.loopListeningIfNoMatch === true) {
                    console.log('No braille match found, looping back to recording phase');
                    
                    // Dispatch event to notify other components
                    const loopEvent = new CustomEvent('recordingPhaseLooping', { 
                        detail: { reason: 'noMatch' } 
                    });
                    window.dispatchEvent(loopEvent);
                    
                    // Restart recording phase
                    showPhase('recording');
                    return;
                }
                
                // If match was found or looping is disabled, continue with output phase
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
            
            // Dispatch phasechange event for timing-debug.js and other listeners
            const phaseChangeEvent = new CustomEvent('phasechange', { 
                detail: { phase: phase, timestamp: Date.now() } 
            });
            window.dispatchEvent(phaseChangeEvent);
            
        }, 10);
    }
    
    // Timer countdown function
    function startPhaseTimer(timerElement, nextPhase, duration) {
        // Make sure duration is a number and at least 1 second
        duration = Math.max(1, parseInt(duration) || 5);
        
        if (phaseTimer) {
            clearInterval(phaseTimer);
            console.log('Cleared existing timer');
        }
        
        if (!timerElement) {
            console.error('Timer element not found for phase: ' + nextPhase);
            // Set a fallback timeout even if the timer element isn't found
            console.log(`Setting fallback timeout for ${duration} seconds`);
            phaseTimer = setTimeout(() => {
                showPhase(nextPhase);
            }, duration * 1000);
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
                console.log(`Timer complete after ${duration}s, transitioning to ${nextPhase}`);
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
                // Reset match status before processing
                if (window.textToSpeech && textToSpeech.resetBrailleMatchStatus) {
                    textToSpeech.resetBrailleMatchStatus();
                }
                
                // Process the speech for braille matching
                const result = app.processSpeechForBraille(text);
                
                // Give time for the match processing to complete
                setTimeout(() => {
                    // If we're in output phase and a match was found, speak it
                    if (currentPhase === 'output' && window.textToSpeech && 
                        textToSpeech.wasBrailleMatchFound && textToSpeech.wasBrailleMatchFound()) {
                        
                        // Find the matched word from the UI
                        const matchedWordElement = document.getElementById('matched-word');
                        if (matchedWordElement && matchedWordElement.textContent) {
                            console.log('Speaking matched word in output phase:', matchedWordElement.textContent);
                            window.textToSpeech.speakMatchedWord(matchedWordElement.textContent);
                        }
                    }
                }, 500);
                
                // Return true if match was found
                return result !== null && result !== undefined;
            }
        }
        return false;
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
        
        // Track last phase change time
        let lastPhaseChange = Date.now();
        let phaseStartTimes = {};
        
        // Listen for phase changes
        window.addEventListener('phasechange', function(e) {
            const now = Date.now();
            const phase = e.detail.phase;
            const duration = (now - lastPhaseChange) / 1000;
            lastPhaseChange = now;
            phaseStartTimes[phase] = now;
            
            console.log(`[DEBUG] Phase changed to ${phase} after ${duration.toFixed(1)}s`);
        });
        
        // Log phase changes
        setInterval(() => {
            const phase = document.querySelector('.phase-container.phase-active');
            const phaseId = phase ? phase.id : 'unknown';
            const currentPhaseName = phaseId.replace('-phase', '');
            
            // Calculate elapsed time in current phase
            let elapsedTime = 0;
            if (phaseStartTimes[currentPhaseName]) {
                elapsedTime = (Date.now() - phaseStartTimes[currentPhaseName]) / 1000;
            }
            
            // Get expected duration for current phase
            let expectedDuration = 5;
            if (window.config && window.config.timings) {
                if (currentPhaseName === 'introduction') {
                    expectedDuration = window.config.timings.introductionPhase;
                } else if (currentPhaseName === 'recording') {
                    expectedDuration = window.config.timings.listeningPhase;
                } else if (currentPhaseName === 'output') {
                    expectedDuration = window.config.timings.outputPhase;
                }
            }
            
            // Format debug output
            debugEl.innerHTML = `Current phase: <span style="color:#4285f4">${phaseId}</span><br>` +
                                `Time elapsed: <span style="color:#fbbc05">${elapsedTime.toFixed(1)}s</span> / ${expectedDuration}s<br>` +
                                `hasMovedPastIntro: ${window.hasMovedPastIntro}<br>` +
                                `Timings: ${window.config.timings.introductionPhase}s/${window.config.timings.listeningPhase}s/${window.config.timings.outputPhase}s`;
        }, 500);
    });
})();
