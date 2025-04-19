/**
 * Phase Controller
 * Manages application phase transitions and timing
 * Modified to improve output phase detection
 */

(function() {
    // Variables for phase control
    let currentPhase = 'introduction';
    let phaseTimer = null;
    let microphoneSuspended = false;
    
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
            updateTimingCSS: updateTimingCSS,  // Expose for dynamic updates
            suspendMicrophone,
            resumeMicrophone
        };

        // Add event listeners for text-to-speech events to prevent mic feedback
        document.addEventListener('tts-speaking-started', function() {
            console.log('TTS speaking started - suspending microphone');
            suspendMicrophone();
        });
        
        document.addEventListener('tts-speaking-ended', function() {
            console.log('TTS speaking ended - resuming microphone if in recording phase');
            if (currentPhase === 'recording') {
                resumeMicrophone();
            }
        });
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
                        
                        // Make sure microphone is active (unless TTS is speaking)
                        if (!isTTSSpeaking()) {
                            resumeMicrophone();
                        }
                    }
                }, 300);
                
            } else if (phase === 'output') {
                // Check if we found a braille match
                let matchFound = false;
                
                // Process text and check if a match was found
                console.log('Processing final text for braille match in output phase');
                matchFound = processFinalText();
                console.log('Initial match found result:', matchFound);
                
                // Also check our secondary flag in case result is not reliable
                if (window.textToSpeech && textToSpeech.wasBrailleMatchFound) {
                    const textToSpeechMatchFound = textToSpeech.wasBrailleMatchFound();
                    console.log('Text-to-speech match found flag:', textToSpeechMatchFound);
                    matchFound = matchFound || textToSpeechMatchFound;
                }
                
                // Debug the content of the final text
                const finalTextElement = document.getElementById('final-text');
                if (finalTextElement) {
                    console.log('Final text content for matching:', 
                        finalTextElement.textContent);
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
                
                // Keep microphone active in output phase as requested
                // This replaces the suspendMicrophone call
                console.log('Keeping microphone active during output phase');
                
                // Play output sound
                if (window.textToSpeech && textToSpeech.playOutputAudio) {
                    textToSpeech.playOutputAudio();
                } else if (window.soundEffects) {
                    window.soundEffects.playOutputModeSound();
                }
                
                // Don't pause speech recognition, just keep listening
                console.log('Keeping speech recognition active during output phase');
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
        if (!timerElement) return;

        // If this is the recording timer and timer is disabled, hide it
        const isListeningPhase = nextPhase === 'output'; // Timer for listening phase leads to output
        const showListeningTimer = window.config?.behavior?.showListeningPhaseTimer !== false;
        
        if (isListeningPhase && !showListeningTimer) {
            timerElement.style.display = 'none'; // Hide the timer element
            
            // Still set up the timer functionality without visual display
            let timeLeft = duration;
            phaseTimer = setInterval(() => {
                timeLeft -= 1;
                
                if (timeLeft <= 0) {
                    clearInterval(phaseTimer);
                    phaseTimer = null;
                    showPhase(nextPhase);
                }
            }, 1000);
            
            return;
        }

        // Reset timer display for other phases or if listening timer is enabled
        if (isListeningPhase && showListeningTimer) {
            timerElement.style.display = 'flex';
        } else if (!isListeningPhase) {
            timerElement.style.display = 'flex';
        }
        
        // Continue with existing timer functionality
        let timeLeft = duration;
        timerElement.textContent = timeLeft;
        timerElement.style.background = `conic-gradient(#4285f4 0%, transparent 0%)`;
        
        phaseTimer = setInterval(() => {
            timeLeft -= 1;
            timerElement.textContent = timeLeft;
            
            // Update visual timer indicator
            const progressDegrees = (1 - timeLeft / duration) * 360;
            timerElement.style.background = `conic-gradient(#4285f4 ${progressDegrees}deg, transparent ${progressDegrees}deg)`;
            
            if (timeLeft <= 0) {
                clearInterval(phaseTimer);
                phaseTimer = null;
                showPhase(nextPhase);
            }
        }, 1000);
    }
    
    // Process the final text to find braille matches
    function processFinalText() {
        const finalTextElement = document.getElementById('final-text');
        if (finalTextElement && finalTextElement.textContent.trim()) {
            const text = finalTextElement.textContent.trim();
            console.log('Processing final text for braille matches:', text);
            
            // If braille translator is available, process the text
            if (window.app && app.processSpeechForBraille) {
                // Reset match status before processing
                if (window.textToSpeech && textToSpeech.resetBrailleMatchStatus) {
                    textToSpeech.resetBrailleMatchStatus();
                }
                
                // Process the speech for braille matching - use direct function call
                // Instead of just checking the return value, use it to update UI directly
                try {
                    console.log('Calling processSpeechForBraille with text:', text);
                    const result = app.processSpeechForBraille(text);
                    
                    // Log detailed result for debugging
                    console.log('Braille match result:', result);
                    
                    // Give time for the match processing to complete
                    setTimeout(() => {
                        // Check if we got a result
                        if (!result) {
                            console.warn('No braille match found for:', text);
                            // Try processing individual words as fallback
                            const words = text.trim().split(/\s+/);
                            console.log('Trying individual words:', words);
                            
                            // Try each word individually
                            for (const word of words) {
                                if (word.length < 2) continue; // Skip very short words
                                console.log('Trying individual word:', word);
                                const wordResult = app.processSpeechForBraille(word);
                                if (wordResult) {
                                    console.log('Found match for individual word:', word);
                                    break; // Stop after finding first match
                                }
                            }
                        }
                        
                        // Always check for match and speak it automatically
                        // This ensures TTS is triggered without requiring manual interaction
                        speakMatchedWordIfAvailable();
                    }, 500);
                    
                    // Also ensure braille visualizer is updated
                    if (result && window.brailleVisualizer) {
                        console.log('Updating visualizer from phase controller with:', result.array);
                        window.brailleVisualizer.updateDisplay(result.array);
                    }
                    
                    // Return true if match was found
                    return result !== null && result !== undefined;
                } catch (err) {
                    console.error('Error processing speech for braille:', err);
                    return false;
                }
            }
        }
        return false;
    }

    // New function to automatically find and speak matched words
    function speakMatchedWordIfAvailable() {
        // Always try to find and speak the matched word
        const matchedWordElement = document.getElementById('matched-word');
        if (matchedWordElement && matchedWordElement.textContent &&
            matchedWordElement.textContent !== 'Loading...' &&
            matchedWordElement.textContent !== 'None') {
            
            console.log('Auto-speaking matched word:', matchedWordElement.textContent);
            
            // Use enhanced speaking method with retry (first try specific method, then fallback)
            if (window.textToSpeech && window.textToSpeech.speakMatchedWord) {
                window.textToSpeech.speakMatchedWord(matchedWordElement.textContent);
            } else if (window.textToSpeech && window.textToSpeech.speak) {
                window.textToSpeech.speak(matchedWordElement.textContent);
            } else {
                console.warn('Text-to-speech not available for matched word');
            }
            
            // Also make sure the speaking indicator is visible
            const speakingIndicator = document.getElementById('speaking-indicator');
            if (speakingIndicator) {
                speakingIndicator.classList.remove('hidden');
                // Ensure it's hidden after a reasonable time if TTS fails
                setTimeout(() => {
                    speakingIndicator.classList.add('hidden');
                }, 5000);
            }
            
            // Return success
            return true;
        }
        return false;
    }

    // New function to suspend microphone to prevent feedback
    function suspendMicrophone() {
        if (microphoneSuspended) return;
        microphoneSuspended = true;
        
        // Log the action for debugging
        console.log('Suspending microphone to prevent feedback');
        
        // Pause speech recognition if active
        if (window.speechRecognition && typeof speechRecognition.pauseRecognition === 'function') {
            speechRecognition.pauseRecognition();
            console.log('Speech recognition paused via pauseRecognition()');
        } else if (window.app && typeof app.stopSpeechRecognition === 'function') {
            app.stopSpeechRecognition();
            console.log('Speech recognition stopped via stopSpeechRecognition()');
        }
        
        // Update UI to show microphone is muted
        const micStatus = document.getElementById('mic-status');
        if (micStatus) {
            micStatus.textContent = 'Mic: Muted';
            micStatus.className = 'mic-status muted';
        }
    }
    
    // New function to resume microphone after TTS is complete
    function resumeMicrophone() {
        if (!microphoneSuspended) return;
        microphoneSuspended = false;
        
        // Only resume microphone if we're in recording phase
        if (currentPhase !== 'recording') {
            console.log('Not resuming microphone because current phase is', currentPhase);
            return;
        }
        
        console.log('Resuming microphone after TTS completion');
        
        // Restart speech recognition
        if (window.app && typeof app.startSpeechRecognition === 'function') {
            app.startSpeechRecognition();
            console.log('Speech recognition restarted');
        }
        
        // Update UI to show microphone is active
        const micStatus = document.getElementById('mic-status');
        if (micStatus) {
            micStatus.textContent = 'Mic: Active';
            micStatus.className = 'mic-status active';
        }
    }
    
    // Helper to check if TTS is currently speaking
    function isTTSSpeaking() {
        return window.textToSpeech && 
               typeof textToSpeech.isSpeaking === 'function' && 
               textToSpeech.isSpeaking();
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
