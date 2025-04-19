/**
 * Microphone Level Visualizer
 * Provides real-time visualization of microphone input levels
 */

(function() {
    // Audio context and related variables
    let audioContext;
    let analyser;
    let microphone;
    let javascriptNode;
    let isInitialized = false;
    let micStream = null;

    // DOM elements
    const mainMicLevelBar = document.getElementById('mic-level-bar'); 

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing mic level visualizer');

        // Automatically initialize after a short delay to allow permissions
        setTimeout(() => {
            initAudioAnalysis();
        }, 2000);

        // Listen for phase changes to reset visualization
        window.addEventListener('phasechange', function(e) {
            if (e.detail && e.detail.phase === 'recording') {
                // Reset and ensure visualizer is active in recording phase
                if (mainMicLevelBar) {
                    mainMicLevelBar.style.width = '0%';
                }
                
                // Make sure audio analysis is initialized
                if (!isInitialized) {
                    initAudioAnalysis();
                }
            }
        });
    });

    // Initialize audio analysis for visualizing microphone input
    function initAudioAnalysis() {
        // Don't reinitialize if already set up
        if (isInitialized) return;
        
        try {
            // Setup AudioContext
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            
            // Create analyser node
            analyser = audioContext.createAnalyser();
            analyser.smoothingTimeConstant = 0.8; // Make the visualization smoother
            analyser.fftSize = 1024; // More detailed analysis
            
            // Attempt to get user media (microphone)
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function(stream) {
                    // Success - microphone access granted
                    micStream = stream;
                    microphone = audioContext.createMediaStreamSource(stream);
                    microphone.connect(analyser);
                    
                    // Create processor node for volume analysis
                    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
                    analyser.connect(javascriptNode);
                    javascriptNode.connect(audioContext.destination);
                    
                    // Process audio data
                    javascriptNode.onaudioprocess = processAudio;
                    
                    // Successfully initialized
                    isInitialized = true;
                    console.log('Microphone visualization initialized');
                    
                    // Update micStatus if it exists
                    updateMicStatus(true);
                })
                .catch(function(err) {
                    console.error('Error accessing microphone for visualization:', err);
                    
                    // Update micStatus if it exists
                    updateMicStatus(false, err.message);
                    
                    // Try again after a delay if permission was denied
                    if (err.name === 'NotAllowedError') {
                        setTimeout(() => {
                            if (!isInitialized) {
                                console.log('Retrying microphone access...');
                                initAudioAnalysis();
                            }
                        }, 5000);
                    }
                });
        } catch (e) {
            console.error('AudioContext initialization error:', e);
        }
    }

    // Process audio data to update volume meter
    function processAudio() {
        // Skip if we're not in a phase that shows the mic level
        if (window.phaseControl && 
            window.phaseControl.getCurrentPhase &&
            window.phaseControl.getCurrentPhase() !== 'recording') {
            // Skip processing to save CPU if we're not in recording phase
            return;
        }

        // Skip if we don't have the mic level bar
        if (!mainMicLevelBar) return;

        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        
        // Calculate volume
        let values = 0;
        const length = array.length;
        for (let i = 0; i < length; i++) {
            values += array[i];
        }
        
        const average = values / length;
        const volume = Math.min(100, Math.round((average / 256) * 200)); // Scale for more visual movement
        
        // Update main recording phase mic level indicator
        mainMicLevelBar.style.width = volume + '%';
        
        // Add visual feedback based on volume
        if (volume > 80) {
            mainMicLevelBar.style.background = 'linear-gradient(to right, #4285f4, #ea4335)';
        } else if (volume > 60) {
            mainMicLevelBar.style.background = 'linear-gradient(to right, #4285f4, #fbbc05)';
        } else if (volume > 30) {
            mainMicLevelBar.style.background = 'linear-gradient(to right, #4285f4, #34a853)';
        } else {
            mainMicLevelBar.style.background = 'linear-gradient(to right, #4285f4, #4285f4)';
        }
        
        // Update mic status indicator
        updateMicStatusFromVolume(volume);
    }

    // Update the UI microphone status indicator based on audio volume
    function updateMicStatusFromVolume(volume) {
        // Only update if we're in recording phase
        if (window.phaseControl && 
            window.phaseControl.getCurrentPhase && 
            window.phaseControl.getCurrentPhase() === 'recording') {
            const micStatus = document.getElementById('mic-status');
            if (micStatus) {
                if (volume > 10) {
                    micStatus.textContent = 'Mic: Active';
                    micStatus.className = 'mic-status active';
                } else {
                    micStatus.textContent = 'Mic: Idle';
                    micStatus.className = 'mic-status inactive';
                }
            }
        }
    }

    // Update the UI mic status indicator
    function updateMicStatus(success, errorMessage) {
        const micStatus = document.getElementById('mic-status');
        if (!micStatus) return;

        if (success) {
            micStatus.textContent = 'Mic: Ready';
            micStatus.className = 'mic-status inactive';
        } else {
            micStatus.textContent = 'Mic: Error';
            micStatus.className = 'mic-status error';
            console.error('Mic status error:', errorMessage);
        }
    }

    // Expose control functions to window
    window.micLevelVisualizer = {
        init: initAudioAnalysis,
        isInitialized: () => isInitialized
    };
})();