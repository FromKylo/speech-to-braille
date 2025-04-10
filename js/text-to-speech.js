/**
 * Text to Speech module
 * Simplified for Chrome/Android compatibility only
 */
class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.speakingIndicator = document.getElementById('speaking-indicator');
        this.isSpeaking = false;
        this.voices = [];
        
        // Initialize voices when they are available (Chrome-specific event)
        this.synth.onvoiceschanged = () => this.initVoices();
    }
    
    /**
     * Initialize available voices
     */
    initVoices() {
        this.voices = this.synth.getVoices();
        if (this.voices.length > 0) {
            console.log(`Loaded ${this.voices.length} voices`);
            
            // Select the best voice for Chrome/Android
            this.selectedVoice = this.voices.find(voice => 
                voice.lang.includes('en-US') || voice.lang.includes('en-GB')
            ) || this.voices[0];
            
            console.log(`Selected voice: ${this.selectedVoice.name}`);
            
            // Speak welcome message after voices are initialized
            this.speakWelcome();
        }
    }

    /**
     * Speak the provided text
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
        
        // Use selected voice if available
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }
        
        // Show speaking indicator
        this.showSpeakingIndicator();
        
        // Handle events
        utterance.onend = () => {
            this.hideSpeakingIndicator();
            this.isSpeaking = false;
        };
        
        utterance.onerror = () => {
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
        const welcomeMessage = "Speech to Braille Refreshable Display. Let's learn braille!";
        this.speak(welcomeMessage);
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
    
    /**
     * Test speech synthesis
     */
    testSpeech() {
        this.speak("This is a test of the speech synthesis system");
        return true;
    }
}

// Create global instance
const textToSpeech = new TextToSpeech();

// Add a test function for debugging
window.testSpeech = function() {
    textToSpeech.testSpeech();
};

// Set up welcome message when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add a debug button
    setTimeout(() => {
        const container = document.querySelector('.card:first-of-type');
        if (container) {
            const debugButton = document.createElement('button');
            debugButton.textContent = 'Test Speech';
            debugButton.style.backgroundColor = '#9c27b0';
            debugButton.style.margin = '10px 0';
            debugButton.addEventListener('click', window.testSpeech);
            container.appendChild(debugButton);
        }
    }, 1000);
});