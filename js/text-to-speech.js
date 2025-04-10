// Improved text-to-speech with default voice and Chrome fixes

// Create a proper namespace
window.textToSpeech = {};

// Default voice settings
const defaultVoiceSettings = {
    lang: 'en-US',
    pitch: 1.0,
    rate: 1.0,
    volume: 1.0
};

// Voice cache to avoid re-fetching voices
let cachedVoice = null;
let isSpeaking = false;
let resumeTimer = null; // Timer for Chrome resume fix
let introCompleted = false; // Track if introduction has been completed

// Chrome-specific fix: Keep the speech synthesis active
function startChromeWorkaround() {
    // Clear any existing timer
    if (resumeTimer) {
        clearInterval(resumeTimer);
    }
    
    // Set up a timer to call resume() every 10 seconds
    // This prevents Chrome from pausing speech synthesis during inactivity
    resumeTimer = setInterval(() => {
        if (window.speechSynthesis) {
            // Only resume if not speaking to avoid interruptions
            if (!isSpeaking && window.speechSynthesis.pending === false) {
                console.log("Applying Chrome resume() fix");
                window.speechSynthesis.resume();
            }
        }
    }, 10000);
    
    console.log("Chrome speech synthesis workaround enabled");
}

// Initialize speech synthesis on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to avoid conflicts with speech-init.js
    setTimeout(() => {
        initSpeechSynthesis().then(() => {
            // Auto-start introduction phase after voice is ready
            speakIntroduction();
        });
    }, 1000);
});

// Initialize and set up the default voice
async function initSpeechSynthesis() {
    console.log("Initializing speech synthesis with Chrome fixes");
    
    // Start Chrome workaround immediately
    startChromeWorkaround();
    
    if (window.speechSynthesis) {
        // Wait for voices to be loaded if needed
        if (window.speechSynthesis.getVoices().length === 0) {
            return new Promise(resolve => {
                window.speechSynthesis.onvoiceschanged = () => {
                    const voices = window.speechSynthesis.getVoices();
                    // Try to find a good English voice
                    cachedVoice = voices.find(voice => 
                        voice.lang.includes('en-US') && voice.default) || 
                        voices.find(voice => voice.lang.includes('en')) || 
                        voices[0];
                    console.log("Voices loaded, selected:", cachedVoice?.name);
                    resolve();
                };
            });
        } else {
            const voices = window.speechSynthesis.getVoices();
            cachedVoice = voices.find(voice => 
                voice.lang.includes('en-US') && voice.default) || 
                voices.find(voice => voice.lang.includes('en')) || 
                voices[0];
            console.log("Voices already loaded, selected:", cachedVoice?.name);
        }
    } else {
        console.warn("Speech synthesis not supported in this browser");
    }
}

// Function to speak text with the selected voice
function speakText(text, callback) {
    if (!window.speechSynthesis) {
        console.warn("Speech synthesis not available");
        if (callback) callback();
        return;
    }
    
    // Stop any current speech
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = defaultVoiceSettings.lang;
    utterance.pitch = defaultVoiceSettings.pitch;
    utterance.rate = defaultVoiceSettings.rate;
    utterance.volume = defaultVoiceSettings.volume;
    
    // Set the default voice if available
    if (cachedVoice) {
        utterance.voice = cachedVoice;
    }
    
    // Set up speaking indicator
    const speakingIndicator = document.getElementById('speaking-indicator');
    if (speakingIndicator) {
        speakingIndicator.classList.remove('hidden');
    }
    isSpeaking = true;
    
    // Set up callbacks
    utterance.onend = function() {
        isSpeaking = false;
        if (speakingIndicator) {
            speakingIndicator.classList.add('hidden');
        }
        if (callback && typeof callback === 'function') {
            callback();
        }
    };
    
    utterance.onerror = function(event) {
        console.error('Speech synthesis error:', event);
        isSpeaking = false;
        if (speakingIndicator) {
            speakingIndicator.classList.add('hidden');
        }
    };
    
    // Speak the text
    window.speechSynthesis.speak(utterance);
}

// Stop any ongoing speech
function stopSpeaking() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) {
            speakingIndicator.classList.add('hidden');
        }
    }
}

// Speak the introduction text automatically
function speakIntroduction() {
    const introText = "Let's learn braille!";
    console.log("Starting introduction phase");
    
    // Update UI to show introduction phase
    const introElement = document.getElementById('intro-phrase');
    if (introElement) {
        introElement.textContent = introText;
    }
    
    // Show the speaking indicator during introduction
    const speakingIndicator = document.getElementById('intro-speaking-status');
    if (speakingIndicator) {
        speakingIndicator.classList.remove('hidden');
    }
    
    // Play introduction audio
    speakText(introText, function() {
        console.log('Introduction completed, dispatching event to start recording phase');
        introCompleted = true;
        
        // Hide the speaking indicator
        if (speakingIndicator) {
            speakingIndicator.classList.add('hidden');
        }
        
        // Dispatch a custom event that the phase controller will listen for
        const event = new CustomEvent('introCompleted');
        window.dispatchEvent(event);
        
        // As a fallback, also call the app's cycle function
        if (window.app && typeof window.app.startListeningCycle === 'function') {
            window.app.startListeningCycle();
        }
        
        // Direct call to phase controller if available
        if (window.phaseControl && typeof window.phaseControl.showPhase === 'function') {
            window.phaseControl.showPhase('recording');
        }
    });
}

// Automatically speak matched word - call this function when a match is found
function speakMatchedWord(word) {
    if (!word) return;
    // Only speak the word without prefix to make it clearer
    speakText(word);
}

// Play recording phase audio cue
function playRecordingAudio() {
    const recordingSound = document.getElementById('listening-mode-sound');
    if (recordingSound) {
        recordingSound.play().catch(err => console.error('Error playing recording sound:', err));
    }
}

// Play output phase audio cue
function playOutputAudio() {
    const outputSound = document.getElementById('output-mode-sound');
    if (outputSound) {
        outputSound.play().catch(err => console.error('Error playing output sound:', err));
    }
}

// Speak welcome message and start listening cycle - deprecated in favor of speakIntroduction
function speakWelcome() {
    if (introCompleted) {
        console.log('Introduction already completed, skipping welcome');
        return;
    }
    
    // Use the new introduction function instead
    speakIntroduction();
}

// Export functions for use in other modules
window.speakText = speakText;
window.stopSpeaking = stopSpeaking;
window.speakMatchedWord = speakMatchedWord;
window.textToSpeech = {
    speak: speakText,
    stop: stopSpeaking,
    speakMatchedWord,
    speakIntroduction,
    speakWelcome,
    playRecordingAudio,
    playOutputAudio,
    introCompleted: () => introCompleted
};