/**
 * Text to Speech module
 * Automatically speaks matched words and provides visual feedback
 */
class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.speakingIndicator = document.getElementById('speaking-indicator');
        this.isSpeaking = false;
        this.hasSpokenWelcome = false;
    }

    /**
     * Automatically speak the provided text
     * @param {string} text - Text to be spoken
     */
    speak(text) {
        if (!text || this.isSpeaking) return;
        
        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set speaking properties
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Show speaking indicator
        this.showSpeakingIndicator();
        
        // Handle events
        utterance.onend = () => {
            this.hideSpeakingIndicator();
            this.isSpeaking = false;
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.hideSpeakingIndicator();
            this.isSpeaking = false;
        };
        
        // Start speaking
        this.isSpeaking = true;
        this.synth.speak(utterance);
    }
    
    /**
     * Speak welcome message when app opens
     */
    speakWelcome() {
        if (this.hasSpokenWelcome) return;
        
        // Set flag to prevent repeated welcome messages during a session
        this.hasSpokenWelcome = true;
        
        // Welcome message
        const welcomeMessage = "Speech to Braille Refreshable Display. Let's learn braille!";
        
        // Use setTimeout to let the page fully load first
        setTimeout(() => {
            this.speak(welcomeMessage);
        }, 1000);
    }
    
    /**
     * Show the speaking indicator
     */
    showSpeakingIndicator() {
        if (this.speakingIndicator) {
            this.speakingIndicator.classList.remove('hidden');
        }
    }
    
    /**
     * Hide the speaking indicator
     */
    hideSpeakingIndicator() {
        if (this.speakingIndicator) {
            this.speakingIndicator.classList.add('hidden');
        }
    }
    
    /**
     * Cancel any ongoing speech
     */
    cancel() {
        if (this.synth && this.synth.speaking) {
            this.synth.cancel();
            this.hideSpeakingIndicator();
            this.isSpeaking = false;
        }
    }
}

// Create global instance
const textToSpeech = new TextToSpeech();

// Set up welcome message when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Speak welcome message when page is loaded
    textToSpeech.speakWelcome();
});