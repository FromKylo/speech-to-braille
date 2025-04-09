/**
 * Text to Speech Module
 * This module handles converting text to speech using the Web Speech API
 */

// Create a namespace for our text-to-speech functionality
const textToSpeech = (function() {
    // Check if browser supports speech synthesis
    const speechSynthesisAvailable = 'speechSynthesis' in window;
    
    // Current speech synthesis instance
    let currentUtterance = null;
    let speaking = false;
    
    // Event listeners
    const eventListeners = {
        'start': [],
        'end': [],
        'error': []
    };
    
    // Helper function to trigger events
    function triggerEvent(eventName, data) {
        if (eventListeners[eventName]) {
            for (const callback of eventListeners[eventName]) {
                callback(data);
            }
        }
    }
    
    // Public API
    return {
        // Check if speech synthesis is supported
        isSupported: function() {
            return speechSynthesisAvailable;
        },
        
        // Speak the provided text
        speak: function(text, options = {}) {
            if (!speechSynthesisAvailable) {
                console.error('Speech synthesis not supported in this browser');
                triggerEvent('error', 'Speech synthesis not supported in this browser');
                return false;
            }
            
            // Cancel any ongoing speech
            this.cancel();
            
            // Create a new utterance
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set options
            if (options.voice) utterance.voice = options.voice;
            if (options.lang) utterance.lang = options.lang || 'en-US';
            if (options.pitch) utterance.pitch = options.pitch || 1;
            if (options.rate) utterance.rate = options.rate || 1;
            if (options.volume) utterance.volume = options.volume || 1;
            
            // Set up event handlers
            utterance.onstart = function() {
                speaking = true;
                triggerEvent('start', { text });
            };
            
            utterance.onend = function() {
                speaking = false;
                currentUtterance = null;
                triggerEvent('end', { text });
            };
            
            utterance.onerror = function(event) {
                speaking = false;
                console.error('Speech synthesis error:', event);
                triggerEvent('error', event);
            };
            
            // Store the current utterance
            currentUtterance = utterance;
            
            // Start speaking
            window.speechSynthesis.speak(utterance);
            
            return true;
        },
        
        // Cancel any ongoing speech
        cancel: function() {
            if (speechSynthesisAvailable) {
                window.speechSynthesis.cancel();
                speaking = false;
                currentUtterance = null;
            }
        },
        
        // Pause speech
        pause: function() {
            if (speechSynthesisAvailable) {
                window.speechSynthesis.pause();
            }
        },
        
        // Resume speech
        resume: function() {
            if (speechSynthesisAvailable) {
                window.speechSynthesis.resume();
            }
        },
        
        // Get all available voices
        getVoices: function() {
            if (!speechSynthesisAvailable) return [];
            return window.speechSynthesis.getVoices();
        },
        
        // Check if currently speaking
        isSpeaking: function() {
            return speaking;
        },
        
        // Register event listener
        on: function(eventName, callback) {
            if (eventListeners[eventName]) {
                eventListeners[eventName].push(callback);
            }
            return this;
        }
    };
})();

// Initialize the module when the script loads
console.log('Text to Speech module loaded. Supported:', textToSpeech.isSupported());

// Export the module
window.textToSpeech = textToSpeech;