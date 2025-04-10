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
    
    // Initialize once the DOM is ready
    document.addEventListener('DOMContentLoaded', initSpeech);
})();
