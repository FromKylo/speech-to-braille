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
        this.initialized = false;
        this.englishVoice = null;
        this.filipinoVoice = null;
        this.introCompleted = false;
        
        // Initialize voices when they are available
        this.synth.onvoiceschanged = () => this.initVoices();
        this.initVoices(); // Try initial load
        
        // Fallback initialization after a delay
        setTimeout(() => {
            if (!this.initialized) this.initVoices();
        }, 1000);
    }
    
    /**
     * Initialize available voices
     */
    initVoices() {
        this.voices = this.synth.getVoices();
        
        if (this.voices.length > 0) {
            // Find the best voices for each language
            this.englishVoice = this.voices.find(voice => 
                (voice.lang.includes('en-US') || voice.lang.includes('en-GB')) && voice.localService
            ) || this.voices.find(voice => voice.lang.includes('en'));
            
            // For Filipino/Tagalog voice
            this.filipinoVoice = this.voices.find(voice => 
                voice.lang.includes('fil') || voice.lang.includes('tl') || voice.lang.includes('fil-PH')
            );
            
            // Default to English voice if Filipino not found
            if (!this.filipinoVoice) {
                this.filipinoVoice = this.englishVoice;
            }
            
            // Default voice if nothing was found
            if (!this.englishVoice) {
                this.englishVoice = this.voices[0];
            }
            
            console.log(`Voices loaded. English: ${this.englishVoice?.name}, Filipino: ${this.filipinoVoice?.name}`);
            this.initialized = true;
            
            // Speak welcome message and ensure button is enabled
            this.speakWelcome();
            this.ensureStartButtonEnabled();
        }
    }

    /**
     * Speak the provided text with callback support
     * @param {string} text - Text to be spoken
     * @param {string} language - Language code (optional, 'en' or 'fil')
     * @param {function} onEndCallback - Callback to execute when speech ends
     */
    speak(text, language = 'en', onEndCallback = null) {
        if (!text || this.isSpeaking) {
            if (onEndCallback) onEndCallback();
            return;
        }
        
        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Select appropriate voice based on language
        if (language === 'fil' && this.filipinoVoice) {
            utterance.voice = this.filipinoVoice;
        } else {
            utterance.voice = this.englishVoice;
        }
        
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
            if (onEndCallback) onEndCallback();
        };
        
        utterance.onerror = () => {
            this.hideSpeakingIndicator();
            this.isSpeaking = false;
            if (onEndCallback) onEndCallback();
        };
        
        // Start speaking
        this.isSpeaking = true;
        
        // Make sure to clear previous speech (important for Chrome)
        if (this.synth.speaking) {
            this.synth.cancel();
        }
        
        this.synth.speak(utterance);
    }
    
    /**
     * Speak welcome message when app opens
     */
    speakWelcome() {
        const welcomeMessage = "Speech to Braille Refreshable Display. Let's learn braille!";
        
        // Only show introduction section
        this.showOnlySection('introduction-section');
        
        // Speak welcome message and transition to listening mode when done
        this.speak(welcomeMessage, 'en', () => {
            console.log('Welcome message completed, transitioning to listening mode');
            this.introCompleted = true;
            
            // Start the application cycle
            if (typeof window.app !== 'undefined') {
                // Start with listening mode
                window.app.startListeningCycle();
            }
        });
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
    
    /**
     * Ensure the start button is enabled
     */
    ensureStartButtonEnabled() {
        const startBtn = document.getElementById('start-speech-btn');
        if (startBtn && startBtn.disabled) {
            console.log('Text-to-speech: Enabling start button');
            startBtn.disabled = false;
        }
    }

    /**
     * Helper to show only a specific section
     */
    showOnlySection(sectionId) {
        const sections = document.querySelectorAll('.app-section');
        sections.forEach(section => {
            if (section.id === sectionId) {
                section.classList.add('active');
                section.classList.remove('hidden');
            } else {
                section.classList.remove('active');
                section.classList.add('hidden');
            }
        });
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
        
        // Ensure start button is enabled
        const startBtn = document.getElementById('start-speech-btn');
        if (startBtn) {
            startBtn.disabled = false;
            console.log('DOM loaded: Enabling start button');
        }
    }, 1000);
});

// Add event listener to page load to ensure button is enabled and start speech recognition
window.addEventListener('load', () => {
    // Hide start/stop buttons since we're auto-starting
    const startBtn = document.getElementById('start-speech-btn');
    const stopBtn = document.getElementById('stop-speech-btn');
    
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    
    // Update cycle mode status instead of recording indicator
    const cycleModeStatus = document.getElementById('cycle-mode-status');
    if (cycleModeStatus) {
        cycleModeStatus.textContent = '● Listening Mode (5s)';
        cycleModeStatus.classList.add('always-on');
    }
    
    // Start with introduction section only
    const sections = document.querySelectorAll('.app-section');
    sections.forEach(section => {
        if (section.id === 'introduction-section') {
            section.classList.add('active');
            section.classList.remove('hidden');
        } else {
            section.classList.remove('active');
            section.classList.add('hidden');
        }
    });
    
    // Auto-start speech recognition after a short delay
    setTimeout(() => {
        if (typeof window.app !== 'undefined' && 
            typeof window.app.startSpeechRecognition === 'function') {
            console.log('Auto-initializing speech recognition');
            window.app.startSpeechRecognition();
            
            // Make sure the listening/output cycle starts
            if (typeof window.app.startListeningCycle === 'function') {
                console.log('Starting listening/output cycle');
                window.app.startListeningCycle();
            }
        }
    }, 2000);
});