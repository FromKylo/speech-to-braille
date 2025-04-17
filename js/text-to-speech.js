/**
 * Text-to-Speech Module for Speech to Braille App
 * Provides speech synthesis and audio feedback
 */

// Track if introduction has been completed
let introCompleted = false;

// Initialize when page is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Pre-initialize speech synthesis to prevent delay on first use
    if ('speechSynthesis' in window) {
        // Create a silent utterance to initialize the engine
        const silent = new SpeechSynthesisUtterance('');
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
        window.speechSynthesis.cancel();
        
        console.log('Speech synthesis initialized');
    } else {
        console.warn('Speech synthesis not supported in this browser');
    }
});

// Get the preferred voice for speech
function getPreferredVoice() {
    if (!('speechSynthesis' in window)) return null;
    
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    
    // Preferred voices in order (Google US English, then any US English, then any English)
    const googleUSVoice = voices.find(voice => voice.name === 'Google US English' && voice.lang.startsWith('en'));
    if (googleUSVoice) return googleUSVoice;
    
    const usEnglishVoice = voices.find(voice => voice.lang === 'en-US');
    if (usEnglishVoice) return usEnglishVoice;
    
    const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
    if (englishVoice) return englishVoice;
    
    // Default to first available voice if no English voice found
    return voices[0];
}

// Chrome-specific workaround for ensuring voices are loaded
function ensureVoicesLoaded(callback) {
    if (!('speechSynthesis' in window)) return callback(false);
    
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
        return callback(true);
    }
    
    // Set up an event for when voices are loaded
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        return callback(true);
    };
    
    // Fallback if voices don't load within 2 seconds
    setTimeout(() => {
        if (!window.speechSynthesis.onvoiceschanged) return;
        window.speechSynthesis.onvoiceschanged = null;
        return callback(false);
    }, 2000);
}

// Function to speak text with the selected voice
function speakText(text, callback) {
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        if (typeof callback === 'function') callback();
        return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Add event handlers
    utterance.onend = () => {
        // Update speaking indicator status
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) speakingIndicator.classList.add('hidden');
        
        if (typeof callback === 'function') callback();
    };
    
    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        
        // Always hide indicator on error
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) speakingIndicator.classList.add('hidden');
        
        if (typeof callback === 'function') callback();
    };
    
    // Get preferred voice
    ensureVoicesLoaded((voicesLoaded) => {
        if (voicesLoaded) {
            utterance.voice = getPreferredVoice();
        }
        
        // Set parameters
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        
        // Show speaking indicator if available
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) speakingIndicator.classList.remove('hidden');
        
        // Speak the text
        window.speechSynthesis.speak(utterance);
    });
}

// Stop any ongoing speech
function stopSpeaking() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        // Hide speaking indicator
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) speakingIndicator.classList.add('hidden');
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
    
    // Try to speak the text, but with a fallback to ensure we proceed even if TTS fails
    try {
        // Get the introduction duration from app configuration
        let introDuration = 10000; // Default to 10 seconds
        if (window.app && window.app.getConfig && window.app.getConfig().PHASES) {
            introDuration = window.app.getConfig().PHASES.INTRODUCTION.DURATION;
        }
        
        // Play introduction audio with a timeout to ensure we don't get stuck
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TTS timeout')), introDuration * 0.9); // 90% of intro duration as timeout
        });
        
        Promise.race([
            new Promise(resolve => {
                speakText(introText, () => {
                    console.log('Introduction completed via TTS callback');
                    finishIntroduction(speakingIndicator);
                    resolve();
                });
            }),
            timeoutPromise
        ]).catch(error => {
            console.warn('TTS timed out, proceeding anyway:', error);
            finishIntroduction(speakingIndicator);
        });
    } catch (error) {
        console.error('Error during speech intro, proceeding anyway:', error);
        finishIntroduction(speakingIndicator);
    }
    
    // Always ensure we proceed after the intro phase duration is nearly done
    setTimeout(() => {
        if (!introCompleted) {
            console.log('Forcing transition from introduction after timeout');
            finishIntroduction(speakingIndicator);
        }
    }, window.app && window.app.getConfig ? window.app.getConfig().PHASES.INTRODUCTION.DURATION * 0.95 : 9500); // 95% of intro duration
}

// Helper function to finish introduction and transition to next phase
function finishIntroduction(speakingIndicator) {
    if (introCompleted) return; // Prevent duplicate transitions
    introCompleted = true;
    
    // Hide the speaking indicator
    if (speakingIndicator) {
        speakingIndicator.classList.add('hidden');
    }
    
    console.log('Introduction phase completed');
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
        recordingSound.currentTime = 0;
        recordingSound.play().catch(err => console.error('Error playing recording sound:', err));
    }
}

// Play output phase audio cue
function playOutputAudio() {
    const outputSound = document.getElementById('output-mode-sound');
    if (outputSound) {
        outputSound.currentTime = 0;
        outputSound.play().catch(err => console.error('Error playing output sound:', err));
    }
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
    playRecordingAudio,
    playOutputAudio,
    introCompleted: () => introCompleted
};