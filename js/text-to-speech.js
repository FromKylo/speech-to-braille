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
        this.voices = [];
        this.isInitialized = false;
        
        // Check if speech synthesis is available
        if (!this.synth) {
            console.error("Speech synthesis not supported in this browser");
            return;
        }
        
        // Initialize voices when they are available
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = this.initVoices.bind(this);
        } else {
            // For browsers that don't fire onvoiceschanged
            setTimeout(() => this.initVoices(), 500);
        }
    }
    
    /**
     * Initialize available voices
     */
    initVoices() {
        if (this.isInitialized) return;
        
        try {
            this.voices = this.synth.getVoices();
            if (this.voices.length > 0) {
                this.isInitialized = true;
                console.log(`Initialized ${this.voices.length} voices for speech synthesis`);
                
                // Select the best voice for English (if available)
                this.selectedVoice = this.voices.find(voice => 
                    voice.lang.includes('en') && voice.localService
                ) || this.voices[0];
                
                console.log(`Selected voice: ${this.selectedVoice.name}`);
            } else {
                console.warn("No voices available yet, will retry");
                // Retry after a delay if no voices found
                setTimeout(() => this.initVoices(), 1000);
            }
        } catch (error) {
            console.error("Error initializing voices:", error);
        }
    }

    /**
     * Automatically speak the provided text
     * @param {string} text - Text to be spoken
     */
    speak(text) {
        if (!text || this.isSpeaking) return;
        
        // Check if speech synthesis is available
        if (!this.synth) {
            console.error("Speech synthesis not supported");
            return;
        }
        
        try {
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
                console.log(`Finished speaking: "${text}"`);
            };
            
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                this.hideSpeakingIndicator();
                this.isSpeaking = false;
            };
            
            // Start speaking
            this.isSpeaking = true;
            
            // Ensure speech synthesis is in a valid state
            if (this.synth.speaking || this.synth.pending) {
                this.synth.cancel();
            }
            
            console.log(`Speaking: "${text}"`);
            this.synth.speak(utterance);
            
            // Safari/iOS workaround - sometimes speech won't start without this
            if (this.isIOS() || this.isSafari()) {
                setTimeout(() => {
                    if (this.synth.paused) this.synth.resume();
                }, 100);
            }
        } catch (error) {
            console.error("Error speaking text:", error);
            this.isSpeaking = false;
            this.hideSpeakingIndicator();
        }
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
        
        // Use setTimeout to let the page fully load first and voices initialize
        setTimeout(() => {
            if (!this.isInitialized) {
                this.initVoices();
                setTimeout(() => this.speak(welcomeMessage), 1000);
            } else {
                this.speak(welcomeMessage);
            }
        }, 1500);
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
     * Debug method to test speech synthesis
     */
    testSpeech() {
        console.log("Testing speech synthesis...");
        
        if (!this.synth) {
            console.error("Speech synthesis not supported in this browser");
            return false;
        }
        
        console.log("Available voices:", this.voices.map(v => `${v.name} (${v.lang})`).join(', '));
        
        this.speak("This is a test of the speech synthesis system");
        return true;
    }
}

// Create global instance
const textToSpeech = new TextToSpeech();

// Add a test function for debugging
window.testSpeech = function() {
    console.log("Manual speech test triggered");
    textToSpeech.testSpeech();
};

// Set up welcome message when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add a debug button to help diagnose TTS issues
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
        
        // Speak welcome message when page is loaded
        textToSpeech.speakWelcome();
    }, 1000);
});