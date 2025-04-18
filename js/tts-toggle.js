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
        // Wait until textToSpeech is available
        if (!window.textToSpeech) {
            console.log('Waiting for textToSpeech to be available...');
            setTimeout(patchTTSFunctions, 500);
            return;
        }
        
        console.log('Ensuring TTS functions are always enabled');
        
        // Save original functions in case we need them
        const originalSpeak = window.textToSpeech.speak;
        const originalSpeakMatchedWord = window.textToSpeech.speakMatchedWord;
        
        // Ensure the functions are properly called
        window.textToSpeech.speak = function(text, callback, settings) {
            return originalSpeak.call(this, text, callback, settings);
        };
        
        window.textToSpeech.speakMatchedWord = function(word) {
            return originalSpeakMatchedWord.call(this, word);
        };
        
        // Add the isTTSEnabled function to the public API (always returns true)
        window.textToSpeech.isTTSEnabled = isTTSAllowed;
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
