// Improved text-to-speech with default voice and Chrome fixes

// Create a proper namespace
window.textToSpeech = {};

// Default voice settings
const defaultVoiceSettings = {
    lang: 'en-US',
    pitch: 1.0,
    rate: 1.0,
    volume: 1.0
};

// Voice cache to avoid re-fetching voices
let cachedVoice = null;
let isSpeaking = false;
let resumeTimer = null; // Timer for Chrome resume fix
let introCompleted = false; // Track if introduction has been completed

// Track if user has interacted with the page
let hasUserInteracted = false;

// Track if a braille match was found in the current cycle
let brailleMatchFound = false;

document.addEventListener('click', () => {
    hasUserInteracted = true;
});

// Chrome-specific fix: Keep the speech synthesis active
function startChromeWorkaround() {
    // Clear any existing timer
    if (resumeTimer) {
        clearInterval(resumeTimer);
    }
    
    // Set up a timer to call resume() every 10 seconds
    // This prevents Chrome from pausing speech synthesis during inactivity
    resumeTimer = setInterval(() => {
        if (window.speechSynthesis) {
            // Only resume if not speaking to avoid interruptions
            if (!isSpeaking && window.speechSynthesis.pending === false) {
                try {
                    window.speechSynthesis.resume();
                    // Only log if debug mode is enabled to reduce console spam
                    if (window.config && window.config.behavior && window.config.behavior.debugMode) {
                        console.log("Applying Chrome resume() fix");
                    }
                } catch (e) {
                    console.warn("Error applying Chrome resume fix:", e);
                }
            }
        }
    }, 10000);
    
    console.log("Chrome speech synthesis workaround enabled");
}

// Initialize speech synthesis on page load
document.addEventListener('DOMContentLoaded', () => {
    // Register for custom events to track braille matches
    document.addEventListener('brailleMatchFound', () => {
        console.log("Braille match found event received");
        brailleMatchFound = true;
    });
    
    document.addEventListener('brailleNoMatchFound', () => {
        console.log("No braille match found event received");
        brailleMatchFound = false;
    });

    // Set up user interaction detection more broadly
    ['click', 'touchstart', 'keypress'].forEach(eventType => {
        document.addEventListener(eventType, () => {
            if (!hasUserInteracted) {
                console.log("User interaction detected - speech features should now work");
                hasUserInteracted = true;
                
                // Update any UI indicators that show user needs to interact
                updateInteractionPrompts();
                
                // Try to play a silent sound to fully unlock audio
                tryUnlockAudio();
            }
        }, { once: false });
    });

    // Wait a bit to avoid conflicts with speech-init.js
    setTimeout(() => {
        initSpeechSynthesis().then(() => {
            // Auto-start introduction phase after voice is ready
            speakIntroduction();
        }).catch(err => {
            console.warn("Speech synthesis initialization failed:", err);
            // Still proceed with introduction even if speech fails
            speakIntroduction();
        });
    }, 1000);
});

// Try to unlock audio by playing a silent sound
function tryUnlockAudio() {
    try {
        // Create a short, silent audio element
        const silentAudio = document.createElement('audio');
        silentAudio.setAttribute('src', 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        silentAudio.setAttribute('playsinline', 'true');
        silentAudio.volume = 0.01;
        silentAudio.play().then(() => {
            console.log("Audio unlocked successfully");
            
            // Now try to preload the actual sound effects
            const recordingSound = document.getElementById('listening-mode-sound');
            const outputSound = document.getElementById('output-mode-sound');
            
            if (recordingSound) recordingSound.load();
            if (outputSound) outputSound.load();
            
        }).catch(e => console.warn("Silent audio unlock failed:", e));
    } catch (e) {
        console.warn("Error attempting to unlock audio:", e);
    }
}

// Update all interaction prompts in the UI
function updateInteractionPrompts() {
    // Find all interaction prompts
    const interactionPrompts = document.querySelectorAll('.interaction-prompt, #interaction-prompt');
    interactionPrompts.forEach(prompt => {
        if (prompt) {
            prompt.style.opacity = '0';
            prompt.style.transition = 'opacity 1s';
            setTimeout(() => {
                if (prompt.parentNode) {
                    prompt.parentNode.removeChild(prompt);
                }
            }, 1000);
        }
    });
}

// Initialize and set up the default voice
async function initSpeechSynthesis() {
    console.log("Initializing speech synthesis with Chrome fixes");
    
    // Start Chrome workaround immediately
    startChromeWorkaround();
    
    if (window.speechSynthesis) {
        // Wait for voices to be loaded if needed
        if (window.speechSynthesis.getVoices().length === 0) {
            return new Promise(resolve => {
                window.speechSynthesis.onvoiceschanged = () => {
                    const voices = window.speechSynthesis.getVoices();
                    // Try to find a good English voice
                    cachedVoice = voices.find(voice => 
                        voice.lang.includes('en-US') && voice.default) || 
                        voices.find(voice => voice.lang.includes('en')) || 
                        voices[0];
                    console.log("Voices loaded, selected:", cachedVoice?.name);
                    resolve();
                };
            });
        } else {
            const voices = window.speechSynthesis.getVoices();
            cachedVoice = voices.find(voice => 
                voice.lang.includes('en-US') && voice.default) || 
                voices.find(voice => voice.lang.includes('en')) || 
                voices[0];
            console.log("Voices already loaded, selected:", cachedVoice?.name);
        }
    } else {
        console.warn("Speech synthesis not supported in this browser");
    }
}

// Wrapper function to handle speech synthesis in a future-proof way
function synthesizeSpeech(utterance) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject(new Error("Speech synthesis not supported"));
            return;
        }
        
        // Handle utterance completion
        utterance.onend = () => {
            resolve();
        };
        
        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            
            // Special handling for not-allowed error (requires user activation)
            if (event.error === 'not-allowed') {
                console.warn("Speech synthesis requires user activation. Using fallback approach.");
                // Try fallback approach
                useFallbackSpeech(utterance.text, resolve);
            } else {
                reject(new Error("Speech synthesis error: " + event.error));
            }
        };
        
        try {
            // Check if we need user interaction first
            const needsUserInteraction = !hasUserInteracted && 
                (navigator.userAgent.indexOf("Chrome") > -1 || navigator.userAgent.indexOf("Edge") > -1);
                
            if (needsUserInteraction) {
                console.warn("Speech synthesis may require user interaction. Using fallback approach.");
                useFallbackSpeech(utterance.text, resolve);
                return;
            }
            
            // Using the potentially deprecated method, but wrapped for future replacement
            window.speechSynthesis.speak(utterance);
            
            // Check if speech actually started within a timeout
            setTimeout(() => {
                if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
                    console.warn("Speech synthesis failed to start, trying alternative approach");
                    // Cancel any pending speech
                    window.speechSynthesis.cancel();
                    
                    // Use fallback approach
                    useFallbackSpeech(utterance.text, resolve);
                }
            }, 500);
        } catch (error) {
            console.error("Failed to start speech synthesis:", error);
            // Use fallback approach
            useFallbackSpeech(utterance.text, resolve);
        }
    });
}

// Fallback function to use when speech synthesis fails
function useFallbackSpeech(text, callback) {
    console.log("Using fallback speech approach for:", text);
    
    // For demos where actual speech isn't critical, we can proceed without speech
    // Log the text that would have been spoken
    console.log("Would have spoken:", text);
    
    // Add visual indication that speech would occur here
    const speechIndicator = document.getElementById('speech-text-display');
    if (speechIndicator) {
        speechIndicator.textContent = text;
        setTimeout(() => {
            speechIndicator.textContent = '';
        }, 3000);
    } else {
        // Create a temporary element to show the text
        const tempIndicator = document.createElement('div');
        tempIndicator.id = 'temp-speech-indicator';
        tempIndicator.style.position = 'fixed';
        tempIndicator.style.bottom = '10px';
        tempIndicator.style.left = '10px';
        tempIndicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
        tempIndicator.style.color = 'white';
        tempIndicator.style.padding = '8px 12px';
        tempIndicator.style.borderRadius = '4px';
        tempIndicator.style.zIndex = '9999';
        tempIndicator.style.maxWidth = '80%';
        tempIndicator.textContent = `🔊 ${text}`;
        document.body.appendChild(tempIndicator);
        
        setTimeout(() => {
            if (tempIndicator.parentNode) {
                tempIndicator.parentNode.removeChild(tempIndicator);
            }
        }, 3000);
    }
    
    // Continue the flow by resolving the promise
    setTimeout(() => {
        if (callback) callback();
    }, 500);
}

// Function to speak text with the selected voice
function speakText(text, callback) {
    if (!window.speechSynthesis) {
        console.warn("Speech synthesis not available");
        if (callback) callback();
        return;
    }
    
    // Stop any current speech
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = defaultVoiceSettings.lang;
    utterance.pitch = defaultVoiceSettings.pitch;
    utterance.rate = defaultVoiceSettings.rate;
    utterance.volume = defaultVoiceSettings.volume;
    
    // Set the default voice if available
    if (cachedVoice) {
        utterance.voice = cachedVoice;
    }
    
    // Set up speaking indicator
    const speakingIndicator = document.getElementById('speaking-indicator');
    if (speakingIndicator) {
        speakingIndicator.classList.remove('hidden');
    }
    isSpeaking = true;
    
    // Use our wrapper function instead of directly calling speak
    synthesizeSpeech(utterance)
        .then(() => {
            isSpeaking = false;
            if (speakingIndicator) {
                speakingIndicator.classList.add('hidden');
            }
            if (callback && typeof callback === 'function') {
                callback();
            }
        })
        .catch(error => {
            console.error('Speech synthesis failed:', error);
            isSpeaking = false;
            if (speakingIndicator) {
                speakingIndicator.classList.add('hidden');
            }
            if (callback && typeof callback === 'function') {
                callback();
            }
        });
}

// Stop any ongoing speech
function stopSpeaking() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) {
            speakingIndicator.classList.add('hidden');
        }
    }
}

// Get the status of braille matching
function wasBrailleMatchFound() {
    return brailleMatchFound;
}

// Reset the braille match found flag (called at start of recording phase)
function resetBrailleMatchStatus() {
    brailleMatchFound = false;
    return brailleMatchFound;
}

// Speak the introduction text automatically
function speakIntroduction() {
    const introText = "Let's learn braille!";
    console.log("Starting introduction phase");
    
    // Update UI to show introduction phase
    const introElement = document.getElementById('intro-phrase');
    if (introElement) {
        introElement.textContent = introText;
    }
    
    // Show the speaking indicator during introduction
    const speakingIndicator = document.getElementById('intro-speaking-status');
    if (speakingIndicator) {
        speakingIndicator.classList.remove('hidden');
    }
    
    // Mark as completed immediately to avoid getting stuck
    introCompleted = true;
    
    // Always add a visual cue initially to help users understand they need to interact
    createInitialInteractionPrompt();
    
    // Try to speak the text, but with a fallback to ensure we proceed even if TTS fails
    try {
        // Play introduction audio with a timeout to ensure we don't get stuck
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TTS timeout')), 3000);
        });
        
        Promise.race([
            new Promise(resolve => {
                speakText(introText, () => {
                    console.log('Introduction completed via TTS callback');
                    finishIntroduction(speakingIndicator);
                    resolve();
                });
            }),
            timeoutPromise
        ]).catch(error => {
            console.warn('TTS timed out, proceeding anyway:', error);
            finishIntroduction(speakingIndicator);
        });
    } catch (error) {
        console.error('Error during speech intro, proceeding anyway:', error);
        finishIntroduction(speakingIndicator);
    }
    
    // Always ensure we proceed after a maximum delay
    const introTimeout = window.config && window.config.timings ? 
        window.config.timings.introductionPhase * 1000 : 10000;
    
    console.log(`Setting introduction timeout for ${introTimeout/1000}s`);
    
    setTimeout(() => {
        if (!window.hasMovedPastIntro) {
            console.log('Forcing transition from introduction after timeout');
            finishIntroduction(speakingIndicator);
        }
    }, introTimeout);
}

// Helper function to finish introduction and transition to next phase
function finishIntroduction(speakingIndicator) {
    if (window.hasMovedPastIntro) return; // Prevent duplicate transitions
    window.hasMovedPastIntro = true;
    
    // Hide the speaking indicator
    if (speakingIndicator) {
        speakingIndicator.classList.add('hidden');
    }
    
    console.log('Dispatching introCompleted event');
    // Dispatch a custom event that the phase controller will listen for
    const event = new CustomEvent('introCompleted');
    window.dispatchEvent(event);
    
    // Direct call to phase controller if available
    if (window.phaseControl && typeof window.phaseControl.showPhase === 'function') {
        window.phaseControl.showPhase('recording');
        return; // Added return to prevent multiple transitions
    }
    
    // As a fallback, try to find the showPhase function in the window scope
    if (typeof window.showPhase === 'function') {
        window.showPhase('recording');
        return; // Added return to prevent multiple transitions
    }
    
    // As another fallback, also call the app's cycle function
    if (window.app && typeof window.app.startListeningCycle === 'function') {
        window.app.startListeningCycle();
    }
}

// Automatically speak matched word - call this function when a match is found
function speakMatchedWord(word) {
    if (!word) return;
    // Only speak the word without prefix to make it clearer
    brailleMatchFound = true; // Set the flag when a word is spoken
    speakText(word);
}

// Play recording phase audio cue
function playRecordingAudio() {
    // Reset the match found flag at the start of recording phase
    resetBrailleMatchStatus();
    
    const recordingSound = document.getElementById('listening-mode-sound');
    if (recordingSound) {
        recordingSound.play().catch(err => {
            console.error('Error playing recording sound:', err);
            // If sound fails due to no user interaction, try to create a prominent interaction prompt
            if (err.name === 'NotAllowedError' && !hasUserInteracted) {
                createPersistentInteractionPrompt();
            }
        });
    } else {
        console.warn('Recording sound element not found');
        // Try to use the sound effects module as fallback
        if (window.soundEffects && typeof window.soundEffects.playListeningModeSound === 'function') {
            try {
                window.soundEffects.playListeningModeSound();
            } catch (e) {
                console.warn('Fallback sound effect also failed:', e);
            }
        }
    }
}

// Play output phase audio cue
function playOutputAudio() {
    const outputSound = document.getElementById('output-mode-sound');
    if (outputSound) {
        outputSound.play().catch(err => {
            console.error('Error playing output sound:', err);
            // If sound fails due to no user interaction, try to create a prominent interaction prompt
            if (err.name === 'NotAllowedError' && !hasUserInteracted) {
                createPersistentInteractionPrompt();
            }
        });
    } else {
        console.warn('Output sound element not found');
        // Try to use the sound effects module as fallback
        if (window.soundEffects && typeof window.soundEffects.playOutputModeSound === 'function') {
            try {
                window.soundEffects.playOutputModeSound();
            } catch (e) {
                console.warn('Fallback sound effect also failed:', e);
            }
        }
    }
}

// Create a persistent interaction prompt that stays visible until user interacts
function createPersistentInteractionPrompt() {
    // Only create if not already exists and user hasn't interacted
    if (hasUserInteracted || document.getElementById('persistent-interaction-prompt')) {
        return;
    }
    
    const prompt = document.createElement('div');
    prompt.id = 'persistent-interaction-prompt';
    prompt.className = 'interaction-prompt';
    prompt.style.position = 'fixed';
    prompt.style.top = '50%';
    prompt.style.left = '50%';
    prompt.style.transform = 'translate(-50%, -50%)';
    prompt.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    prompt.style.color = 'white';
    prompt.style.padding = '20px';
    prompt.style.borderRadius = '8px';
    prompt.style.zIndex = '99999';
    prompt.style.maxWidth = '80%';
    prompt.style.textAlign = 'center';
    prompt.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    prompt.style.animation = 'pulse-attention 2s infinite';
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse-attention {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.05); }
            100% { transform: translate(-50%, -50%) scale(1); }
        }
    `;
    document.head.appendChild(style);
    
    prompt.innerHTML = `
        <h3 style="margin-top:0;color:#ff9800;">User Interaction Required</h3>
        <p>Chrome requires user interaction before playing audio.</p>
        <p><strong>Click anywhere on the page</strong> to enable all audio features.</p>
        <button style="background:#4285f4;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;font-weight:bold;margin-top:10px;">
            Enable Audio
        </button>
    `;
    
    document.body.appendChild(prompt);
    
    // Add click handler to the prompt itself
    prompt.addEventListener('click', function() {
        hasUserInteracted = true;
        updateInteractionPrompts();
        tryUnlockAudio();
    });
}

// Create the initial interaction prompt that appears during the introduction
function createInitialInteractionPrompt() {
    const interactionPrompt = document.createElement('div');
    interactionPrompt.id = 'interaction-prompt';
    interactionPrompt.className = 'interaction-prompt';
    interactionPrompt.style.padding = '15px';
    interactionPrompt.style.margin = '15px 0';
    interactionPrompt.style.backgroundColor = '#ffecb3';
    interactionPrompt.style.border = '2px solid #ffc107';
    interactionPrompt.style.borderRadius = '4px';
    interactionPrompt.style.textAlign = 'center';
    interactionPrompt.style.color = '#333';
    interactionPrompt.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
            <span style="font-size:24px;">🔊</span>
            <div>
                <strong>Click anywhere on the page to enable audio features</strong><br>
                Chrome requires user interaction before playing audio
            </div>
        </div>
    `;
    
    const container = document.querySelector('.intro-container') || 
                       document.getElementById('introduction-phase') || 
                       document.body;
    
    if (container) {
        container.prepend(interactionPrompt);
        
        // Only hide after user interaction
        const checkInterval = setInterval(() => {
            if (hasUserInteracted && interactionPrompt.parentNode) {
                interactionPrompt.style.opacity = '0';
                interactionPrompt.style.transition = 'opacity 1s';
                setTimeout(() => {
                    if (interactionPrompt.parentNode) {
                        interactionPrompt.parentNode.removeChild(interactionPrompt);
                    }
                    clearInterval(checkInterval);
                }, 1000);
            }
        }, 1000);
    }
}

// Speak welcome message and start listening cycle - deprecated in favor of speakIntroduction
function speakWelcome() {
    if (introCompleted) {
        console.log('Introduction already completed, skipping welcome');
        return;
    }
    
    // Use the new introduction function instead
    speakIntroduction();
}

// Export functions for use in other modules
window.speakText = speakText;
window.stopSpeaking = stopSpeaking;
window.speakMatchedWord = speakMatchedWord;
window.textToSpeech = {
    speak: speakText,
    stop: stopSpeaking,
    speakMatchedWord,
    speakIntroduction,
    speakWelcome,
    playRecordingAudio,
    playOutputAudio,
    wasBrailleMatchFound,
    resetBrailleMatchStatus,
    introCompleted: () => introCompleted
};