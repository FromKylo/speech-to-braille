/**
 * Sound Effects Manager
 * Handles audio feedback for different app states
 */
const soundEffects = (function() {
    // Audio elements
    let listeningModeSound = null;
    let outputModeSound = null;
    
    // Initialize audio elements
    function init() {
        listeningModeSound = document.getElementById('listening-mode-sound');
        outputModeSound = document.getElementById('output-mode-sound');
        
        // Fallback audio using Web Audio API if audio files aren't available
        setupFallbackSounds();
    }
    
    // Create fallback sounds using Web Audio API
    function setupFallbackSounds() {
        if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
            console.warn('Web Audio API not supported');
            return;
        }
        
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioCtx();
        
        // Create listening mode sound (higher pitch beep)
        window.createListeningSound = function() {
            playTone(audioContext, 880, 0.2); // A5 note, 0.2s duration
        };
        
        // Create output mode sound (lower pitch beep)
        window.createOutputSound = function() {
            playTone(audioContext, 440, 0.3); // A4 note, 0.3s duration
        };
    }
    
    // Helper function to play a tone
    function playTone(audioContext, frequency, duration) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Add fade out
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }
    
    // Play listening mode start sound
    function playListeningModeSound() {
        if (listeningModeSound && listeningModeSound.readyState >= 2) {
            listeningModeSound.currentTime = 0;
            listeningModeSound.play().catch(e => {
                console.warn('Could not play audio file:', e);
                if (window.createListeningSound) {
                    window.createListeningSound();
                }
            });
        } else if (window.createListeningSound) {
            window.createListeningSound();
        }
    }
    
    // Play output mode start sound
    function playOutputModeSound() {
        if (outputModeSound && outputModeSound.readyState >= 2) {
            outputModeSound.currentTime = 0;
            outputModeSound.play().catch(e => {
                console.warn('Could not play audio file:', e);
                if (window.createOutputSound) {
                    window.createOutputSound();
                }
            });
        } else if (window.createOutputSound) {
            window.createOutputSound();
        }
    }
    
    // Return public API
    return {
        init,
        playListeningModeSound,
        playOutputModeSound
    };
})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', soundEffects.init);

// Make it globally available
window.soundEffects = soundEffects;
