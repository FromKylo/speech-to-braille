/**
 * Text-to-Speech Functionality
 * TTS is always enabled in this version
 */

(function() {
    // TTS is always enabled
    const ttsEnabled = true;
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('TTS initialized - always enabled');
        patchTTSFunctions();
    });
    
    // Check if speech is allowed (always returns true)
    function isTTSAllowed() {
        // Always return true as TTS should always be enabled
        return true;
    }
    
    // Try to speak text (always enabled)
    function trySpeak(text) {
        if (window.textToSpeech && typeof window.textToSpeech.speak === 'function') {
            window.textToSpeech.speak(text);
        }
    }
    
    // Patch the TTS functions to ensure they always work
    function patchTTSFunctions() {
        // Set a maximum number of retry attempts to avoid infinite loop
        const MAX_RETRY_ATTEMPTS = 10;
        let attempts = 0;
        
        function attemptPatch() {
            attempts++;
            
            // Wait until textToSpeech is available or max attempts reached
            if (!window.textToSpeech) {
                if (attempts <= MAX_RETRY_ATTEMPTS) {
                    console.log(`Waiting for textToSpeech to be available... (Attempt ${attempts}/${MAX_RETRY_ATTEMPTS})`);
                    setTimeout(attemptPatch, 500);
                } else {
                    console.warn("TextToSpeech not available after maximum attempts. Creating fallback implementation.");
                    
                    // Create a minimal fallback implementation
                    window.textToSpeech = {
                        speak: function(text) {
                            console.log("TextToSpeech fallback - would speak:", text);
                            // Create visual feedback since audio isn't available
                            const indicator = document.createElement('div');
                            indicator.textContent = `🔊 "${text}"`;
                            indicator.style.position = 'fixed';
                            indicator.style.bottom = '20px';
                            indicator.style.left = '20px';
                            indicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
                            indicator.style.color = 'white';
                            indicator.style.padding = '10px';
                            indicator.style.borderRadius = '5px';
                            indicator.style.zIndex = '9999';
                            document.body.appendChild(indicator);
                            setTimeout(() => indicator.remove(), 3000);
                        },
                        speakMatchedWord: function(word) {
                            this.speak(word);
                        },
                        isTTSEnabled: function() { return true; }
                    };
                }
                return;
            }
            
            console.log('TTS successfully initialized, ensuring functions are always enabled');
            
            // Save original functions in case we need them
            const originalSpeak = window.textToSpeech.speak || function(text) { console.log("Would speak:", text); };
            const originalSpeakMatchedWord = window.textToSpeech.speakMatchedWord || function(word) { originalSpeak(word); };
            
            // Ensure the functions are properly called
            window.textToSpeech.speak = function(text, callback, settings) {
                return originalSpeak.call(window.textToSpeech, text, callback, settings);
            };
            
            window.textToSpeech.speakMatchedWord = function(word) {
                return originalSpeakMatchedWord.call(window.textToSpeech, word);
            };
            
            // Add the isTTSEnabled function to the public API (always returns true)
            window.textToSpeech.isTTSEnabled = isTTSAllowed;
        }
        
        // Start the patching process
        attemptPatch();
    }
    
    // Expose these functions globally
    window.ttsToggle = {
        isEnabled: isTTSAllowed,
        enable: function() {
            // TTS is always enabled, nothing to do
        },
        disable: function() {
            // This function is kept for API compatibility, but does nothing
            console.warn('TTS cannot be disabled in this version');
        }
    };
})();

/**
 * Text-to-Speech Toggle functionality
 * ALWAYS ON as per requirements
 */

document.addEventListener('DOMContentLoaded', function() {
    // Force TTS always on
    if (window.textToSpeech) {
        console.log('Setting Text-to-Speech to always on mode');
        
        // Override any toggle functions to ensure always on
        window.textToSpeech.enable = function() {
            console.log('TTS is permanently enabled');
            
            // Make all speaking indicators visible
            const speakingIndicators = document.querySelectorAll('.speaking-indicator');
            speakingIndicators.forEach(indicator => {
                indicator.classList.remove('hidden');
            });
            
            return true;
        };
        
        window.textToSpeech.disable = function() {
            console.log('TTS cannot be disabled - always on mode');
            return false;
        };
        
        window.textToSpeech.isEnabled = function() {
            return true;
        };
        
        // Add visible indicator that TTS is always on
        const speakingIndicators = document.querySelectorAll('.speaking-indicator');
        speakingIndicators.forEach(indicator => {
            indicator.classList.remove('hidden');
        });
        
        // Force enable TTS
        if (typeof window.textToSpeech.enable === 'function') {
            window.textToSpeech.enable();
        }
        
        // Update any UI toggles to checked state
        const ttsToggles = document.querySelectorAll('[data-function="toggle-tts"]');
        if (ttsToggles) {
            ttsToggles.forEach(toggle => {
                if (toggle.type === 'checkbox') {
                    toggle.checked = true;
                    toggle.disabled = true; // Prevent user from changing
                }
            });
        }
    }
});
