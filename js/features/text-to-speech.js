/**
 * Text-to-Speech Module for Speech to Braille
 * Provides speech synthesis functionality
 */

const textToSpeech = (function() {
    // Check if speech synthesis is supported
    const isSpeechSynthesisSupported = 'speechSynthesis' in window;
    
    // Default voice settings
    let defaultVoice = null;
    let defaultRate = 1.0;
    let defaultPitch = 1.0;
    let defaultVolume = 1.0;
    let isInitialized = false;
    
    // Initialize the speech synthesis
    function init() {
        if (!isSpeechSynthesisSupported) {
            console.warn('Speech synthesis is not supported in this browser');
            return false;
        }
        
        console.log('Initializing Text-to-Speech module...');
        
        // Find the default voice
        selectDefaultVoice();
        
        isInitialized = true;
        console.log('Text-to-Speech initialized');
        return true;
    }
    
    // Select a default voice (preferably female English voice)
    function selectDefaultVoice() {
        if (!isSpeechSynthesisSupported) return;
        
        // Try to select a voice after a small delay to ensure voices are loaded
        setTimeout(() => {
            const voices = speechSynthesis.getVoices();
            
            if (voices.length === 0) {
                console.warn('No voices available yet, trying again later...');
                // Try again later
                setTimeout(selectDefaultVoice, 1000);
                return;
            }
            
            console.log(`${voices.length} voices available`);
            
            // Look for a female US English voice
            let voice = voices.find(v => 
                v.name.includes('Google US English Female') || 
                v.name.includes('Microsoft Zira')
            );
            
            // Fallback to any English voice
            if (!voice) {
                voice = voices.find(v => 
                    v.lang.startsWith('en-') || 
                    v.lang.startsWith('en_')
                );
            }
            
            // Last resort, use the first available voice
            if (!voice && voices.length > 0) {
                voice = voices[0];
            }
            
            if (voice) {
                defaultVoice = voice;
                console.log('Selected voice:', voice.name);
            } else {
                console.warn('No voices found for speech synthesis');
            }
        }, 500);
    }
    
    // Speak text
    function speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!isSpeechSynthesisSupported) {
                reject(new Error('Speech synthesis is not supported'));
                return;
            }
            
            if (!isInitialized) {
                init();
            }
            
            if (!text || typeof text !== 'string') {
                reject(new Error('Invalid text provided'));
                return;
            }
            
            try {
                // Cancel any ongoing speech
                speechSynthesis.cancel();
                
                // Create utterance
                const utterance = new SpeechSynthesisUtterance(text);
                
                // Apply settings
                utterance.rate = options.rate || defaultRate;
                utterance.pitch = options.pitch || defaultPitch;
                utterance.volume = options.volume || defaultVolume;
                
                // Set voice if available
                if (options.voice) {
                    utterance.voice = options.voice;
                } else if (defaultVoice) {
                    utterance.voice = defaultVoice;
                }
                
                // Event handlers
                utterance.onend = () => {
                    console.log('Speech completed for:', text);
                    resolve();
                };
                
                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event);
                    reject(new Error(`Speech synthesis error: ${event.error}`));
                };
                
                // Speak
                console.log('Speaking:', text);
                speechSynthesis.speak(utterance);
            } catch (error) {
                console.error('Error during speech synthesis:', error);
                reject(error);
            }
        });
    }
    
    // Speak the introduction message
    function speakIntroduction() {
        const introText = "Welcome to Speech to Braille. Please speak a word clearly.";
        
        // Show speaking indicator UI
        const speakingIndicator = document.createElement('div');
        speakingIndicator.className = 'speaking-indicator';
        speakingIndicator.innerHTML = '<span class="speak-icon">🔊</span> Speaking...';
        
        const introPhase = document.getElementById('introduction-phase');
        if (introPhase) {
            const existingIndicator = introPhase.querySelector('.speaking-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            introPhase.appendChild(speakingIndicator);
        }
        
        // Speak the intro text
        speak(introText)
            .then(() => {
                console.log('Introduction speech completed');
                
                // Hide the indicator after speech is done
                setTimeout(() => {
                    if (speakingIndicator.parentNode) {
                        speakingIndicator.remove();
                    }
                    
                    // Transition to recording phase
                    if (window.speechToBraille) {
                        speechToBraille.setPhase('RECORDING');
                    }
                }, 500);
            })
            .catch(error => {
                console.error('Error during introduction speech:', error);
                
                // Hide the indicator on error
                if (speakingIndicator.parentNode) {
                    speakingIndicator.remove();
                }
                
                // Transition to recording phase anyway
                if (window.speechToBraille) {
                    speechToBraille.setPhase('RECORDING');
                }
            });
    }
    
    // Get available voices
    function getVoices() {
        if (!isSpeechSynthesisSupported) return [];
        return speechSynthesis.getVoices();
    }
    
    // Set default voice by name
    function setVoiceByName(name) {
        if (!isSpeechSynthesisSupported) return false;
        
        const voices = speechSynthesis.getVoices();
        const voice = voices.find(v => v.name === name);
        
        if (voice) {
            defaultVoice = voice;
            return true;
        }
        
        return false;
    }
    
    // Set default rate
    function setRate(rate) {
        defaultRate = Math.max(0.1, Math.min(10, rate));
    }
    
    // Set default pitch
    function setPitch(pitch) {
        defaultPitch = Math.max(0, Math.min(2, pitch));
    }
    
    // Set default volume
    function setVolume(volume) {
        defaultVolume = Math.max(0, Math.min(1, volume));
    }
    
    // Initialize the module
    init();
    
    // Public API
    return {
        speak,
        speakIntroduction,
        getVoices,
        setVoiceByName,
        setRate,
        setPitch,
        setVolume,
        isSupported: isSpeechSynthesisSupported
    };
})();