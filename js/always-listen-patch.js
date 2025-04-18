/**
 * This script overrides microphone suspension functionality
 * to ensure the microphone is always listening
 */
(function() {
    // Wait for DOM and then for phase controller to initialize
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for phase controller to be available
        setTimeout(() => {
            if (window.phaseControl) {
                console.log('Patching phase controller to keep microphone always listening');
                
                // Override the suspendMicrophone function to do nothing
                if (typeof window.phaseControl.suspendMicrophone === 'function') {
                    window.phaseControl.suspendMicrophone = function() {
                        console.log('Microphone suspension prevented - keeping mic always on');
                        
                        // Keep the mic status showing as active
                        const micStatus = document.getElementById('mic-status');
                        if (micStatus) {
                            micStatus.textContent = 'Mic: Always Active';
                            micStatus.className = 'mic-status active';
                        }
                    };
                }
                
                // Override the resumeMicrophone function as well
                if (typeof window.phaseControl.resumeMicrophone === 'function') {
                    window.phaseControl.resumeMicrophone = function() {
                        console.log('Mic was already active - always-on microphone enabled');
                        
                        // Ensure the mic status shows as active
                        const micStatus = document.getElementById('mic-status');
                        if (micStatus) {
                            micStatus.textContent = 'Mic: Always Active';
                            micStatus.className = 'mic-status active';
                        }
                    };
                }
            }
        }, 1000);
    });
    
    // Also patch the app.js pauseSpeechRecognition function
    setTimeout(() => {
        if (window.app && typeof window.app.pauseSpeechRecognition === 'function') {
            console.log('Patching app.js to keep microphone always listening');
            window.app.pauseSpeechRecognition = function() {
                console.log('Speech recognition pause prevented - keeping mic always on');
                
                // Instead of pausing, ensure it's active
                if (typeof speechRecognition !== 'undefined') {
                    if (!speechRecognition.isRecording) {
                        speechRecognition.startRecognition();
                    }
                }
            };
        }
    }, 1500);
})();
