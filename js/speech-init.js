/**
 * Speech initialization helper
 * Simplified for Chrome/Android only
 */
(function() {
    // Simple initialization for Chrome
    function initSpeech() {
        if ('speechSynthesis' in window) {
            console.log('Initializing speech synthesis for Chrome');
            
            // Create a silent utterance to initialize the speech engine
            const silence = new SpeechSynthesisUtterance('');
            silence.volume = 0;
            window.speechSynthesis.speak(silence);
            
            // Cancel immediately - Chrome handles this well
            window.speechSynthesis.cancel();
        }
    }
    
    // Preload audio files for mode switching sounds
    function preloadAudioAssets() {
        const listeningSound = document.getElementById('listening-mode-sound');
        const outputSound = document.getElementById('output-mode-sound');
        
        if (listeningSound) {
            listeningSound.load();
            console.log('Preloaded listening mode sound');
        }
        
        if (outputSound) {
            outputSound.load();
            console.log('Preloaded output mode sound');
        }
    }
    
    // Initialize once the DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initSpeech();
        preloadAudioAssets();
        
        // Add sound-effects.js script to the document
        if (!document.querySelector('script[src*="sound-effects.js"]')) {
            const script = document.createElement('script');
            script.src = 'js/sound-effects.js';
            document.body.appendChild(script);
            console.log('Sound effects script loaded dynamically');
        }
    });
})();
