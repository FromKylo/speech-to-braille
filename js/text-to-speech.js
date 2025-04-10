// Improved text-to-speech with default voice

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

// Initialize speech synthesis on page load
document.addEventListener('DOMContentLoaded', initSpeechSynthesis);

// Initialize and set up the default voice
async function initSpeechSynthesis() {
    // Wait for voices to be loaded
    if (window.speechSynthesis.getVoices().length === 0) {
        return new Promise(resolve => {
            window.speechSynthesis.addEventListener('voiceschanged', () => {
                setupDefaultVoice();
                resolve();
            });
        });
    } else {
        setupDefaultVoice();
        // Speak the introduction automatically
        speakIntroduction();
    }
}

// Setup the default voice
function setupDefaultVoice() {
    const voices = window.speechSynthesis.getVoices();
    
    // Prefer English voices in this order: US English, UK English, any English
    cachedVoice = voices.find(voice => voice.lang === 'en-US' && !voice.localService) || 
                  voices.find(voice => voice.lang === 'en-GB' && !voice.localService) ||
                  voices.find(voice => voice.lang.startsWith('en') && !voice.localService) ||
                  voices.find(voice => voice.lang === 'en-US') ||
                  voices.find(voice => voice.lang === 'en-GB') ||
                  voices.find(voice => voice.lang.startsWith('en')) ||
                  voices[0]; // Fallback to first available voice
    
    console.log('Default voice set to:', cachedVoice ? cachedVoice.name : 'None available');
}

// Speak text with default voice
function speakText(text, callback) {
    if (!text) return;
    
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
    const introText = "Welcome to the Speech to Braille converter! This application will help you learn Braille.";
    speakText(introText);
}

// Automatically speak matched word - call this function when a match is found
function speakMatchedWord(word) {
    if (!word) return;
    speakText(`Matched word: ${word}`);
}

// Export functions for use in other modules
window.speakText = speakText;
window.stopSpeaking = stopSpeaking;
window.speakMatchedWord = speakMatchedWord;