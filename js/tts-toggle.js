/**
 * Text-to-Speech Toggle Functionality
 * Allows users to enable/disable speech output
 */

(function() {
    // Default state - enabled
    let ttsEnabled = true;
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initTTSToggle();
    });
    
    // Initialize TTS toggle functionality
    function initTTSToggle() {
        const ttsToggle = document.getElementById('tts-toggle');
        const ttsStatus = document.getElementById('tts-status');
        
        if (!ttsToggle) {
            console.warn('TTS toggle element not found');
            return;
        }
        
        // Load saved preference if available
        loadSavedPreference();
        
        // Set initial state based on loaded preference
        ttsToggle.checked = ttsEnabled;
        updateStatusText();
        
        // Add event listener
        ttsToggle.addEventListener('change', function() {
            ttsEnabled = ttsToggle.checked;
            updateStatusText();
            savePreference();
            
            // Announce the change
            if (ttsEnabled) {
                // If re-enabling, make a sound
                trySpeak("Text to speech enabled");
            }
        });
        
        // Override the original speak functions to check if TTS is enabled
        patchTTSFunctions();
        
        function updateStatusText() {
            if (ttsStatus) {
                ttsStatus.textContent = ttsEnabled ? 'Enabled' : 'Disabled';
            }
        }
    }
    
    // Check if speech is allowed (based on toggle)
    function isTTSAllowed() {
        return ttsEnabled;
    }
    
    // Save user preference
    function savePreference() {
        try {
            localStorage.setItem('ttsEnabled', ttsEnabled.toString());
            console.log('TTS preference saved:', ttsEnabled);
        } catch (e) {
            console.error('Failed to save TTS preference:', e);
        }
    }
    
    // Load saved preference
    function loadSavedPreference() {
        try {
            const savedPreference = localStorage.getItem('ttsEnabled');
            if (savedPreference !== null) {
                ttsEnabled = savedPreference === 'true';
                console.log('TTS preference loaded:', ttsEnabled);
            }
        } catch (e) {
            console.error('Failed to load TTS preference:', e);
        }
    }
    
    // Try to speak text only if TTS is enabled
    function trySpeak(text) {
        if (ttsEnabled && window.textToSpeech && typeof window.textToSpeech.speak === 'function') {
            window.textToSpeech.speak(text);
        }
    }
    
    // Patch the TTS functions to respect the toggle
    function patchTTSFunctions() {
        // Wait until textToSpeech is available
        if (!window.textToSpeech) {
            console.log('Waiting for textToSpeech to be available...');
            setTimeout(patchTTSFunctions, 500);
            return;
        }
        
        console.log('Patching TTS functions to respect toggle');
        
        // Save original functions
        const originalSpeak = window.textToSpeech.speak;
        const originalSpeakMatchedWord = window.textToSpeech.speakMatchedWord;
        
        // Override speak function
        window.textToSpeech.speak = function(text, callback, settings) {
            if (isTTSAllowed()) {
                return originalSpeak.call(this, text, callback, settings);
            } else {
                console.log('TTS disabled. Not speaking:', text);
                // Still call the callback
                if (callback && typeof callback === 'function') {
                    setTimeout(callback, 100);
                }
                return false;
            }
        };
        
        // Override speakMatchedWord function
        window.textToSpeech.speakMatchedWord = function(word) {
            if (isTTSAllowed()) {
                return originalSpeakMatchedWord.call(this, word);
            } else {
                console.log('TTS disabled. Not speaking matched word:', word);
                return false;
            }
        };
        
        // Add the isTTSEnabled function to the public API
        window.textToSpeech.isTTSEnabled = isTTSAllowed;
    }
    
    // Expose these functions globally
    window.ttsToggle = {
        isEnabled: isTTSAllowed,
        enable: function() {
            const toggle = document.getElementById('tts-toggle');
            if (toggle) toggle.checked = true;
            ttsEnabled = true;
            savePreference();
            const statusEl = document.getElementById('tts-status');
            if (statusEl) statusEl.textContent = 'Enabled';
        },
        disable: function() {
            const toggle = document.getElementById('tts-toggle');
            if (toggle) toggle.checked = false;
            ttsEnabled = false;
            savePreference();
            const statusEl = document.getElementById('tts-status');
            if (statusEl) statusEl.textContent = 'Disabled';
        }
    };
})();
