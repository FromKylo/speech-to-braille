/**
 * Speech recognition diagnostics helper
 * Provides tools to debug speech recognition issues
 */

(function() {
    // Create diagnostic UI
    function createDiagnosticUI() {
        const container = document.createElement('div');
        container.id = 'speech-diagnostics';
        container.style.position = 'fixed';
        container.style.bottom = '10px';
        container.style.right = '10px';
        container.style.backgroundColor = '#f8f9fa';
        container.style.padding = '10px';
        container.style.border = '1px solid #dee2e6';
        container.style.borderRadius = '4px';
        container.style.zIndex = '9999';
        container.style.fontSize = '12px';
        container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        container.style.maxWidth = '300px';
        
        // Add diagnostic information
        const info = document.createElement('div');
        info.innerHTML = `
            <h4 style="margin:0 0 5px;font-size:14px;">Speech Recognition Diagnostics</h4>
            <div id="diag-webspeech">Web Speech API: ${checkWebSpeechSupport()}</div>
            <div id="diag-microphone">Microphone: Checking...</div>
            <div id="diag-recognition-state">Recognition State: Unknown</div>
            <button id="diag-check-mic" style="margin-top:5px;padding:2px 5px;">Check Microphone</button>
            <button id="diag-force-restart" style="margin-left:5px;padding:2px 5px;">Force Restart</button>
        `;
        container.appendChild(info);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'X';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '5px';
        closeBtn.style.right = '5px';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '12px';
        closeBtn.addEventListener('click', () => {
            container.style.display = 'none';
        });
        container.appendChild(closeBtn);
        
        document.body.appendChild(container);
        
        // Add event listeners
        document.getElementById('diag-check-mic').addEventListener('click', checkMicrophoneAccess);
        document.getElementById('diag-force-restart').addEventListener('click', forceRestartRecognition);
        
        // Initial microphone check
        checkMicrophoneAccess();
    }
    
    // Check Web Speech API support
    function checkWebSpeechSupport() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            return '<span style="color:green;">Supported ✓</span>';
        } else {
            return '<span style="color:red;">Not Supported ✗</span>';
        }
    }
    
    // Check microphone access
    async function checkMicrophoneAccess() {
        const diagMic = document.getElementById('diag-microphone');
        if (!diagMic) return;
        
        diagMic.innerHTML = 'Microphone: Checking...';
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            diagMic.innerHTML = 'Microphone: <span style="color:green;">Access Granted ✓</span>';
            
            // Stop tracks after checking
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            diagMic.innerHTML = `Microphone: <span style="color:red;">Access Denied ✗ (${err.name})</span>`;
            console.error('Microphone access error:', err);
        }
    }
    
    // Force restart recognition
    function forceRestartRecognition() {
        if (window.speechRecognition) {
            try {
                // First try to stop if already running
                if (speechRecognition.isRecording || speechRecognition._recognitionActive) {
                    try {
                        if (speechRecognition.recognition) {
                            speechRecognition.recognition.stop();
                        }
                    } catch (e) {
                        console.log('Error stopping recognition:', e);
                    }
                }
                
                // Wait a moment then restart
                setTimeout(() => {
                    try {
                        speechRecognition.isRecording = false;
                        speechRecognition._recognitionActive = false;
                        speechRecognition.startRecognition();
                        
                        // Update state display
                        updateRecognitionState();
                    } catch (e) {
                        console.error('Failed to restart recognition:', e);
                        alert('Failed to restart: ' + e.message);
                    }
                }, 500);
            } catch (e) {
                console.error('Error during force restart:', e);
                alert('Error during force restart: ' + e.message);
            }
        } else {
            alert('Speech recognition not initialized');
        }
    }
    
    // Update recognition state display
    function updateRecognitionState() {
        const stateElement = document.getElementById('diag-recognition-state');
        if (!stateElement || !window.speechRecognition) return;
        
        let stateText = 'Unknown';
        let color = 'gray';
        
        if (window.speechRecognition) {
            if (speechRecognition.isRecording && speechRecognition._recognitionActive) {
                stateText = 'Active (recording)';
                color = 'green';
            } else if (speechRecognition.isRecording && !speechRecognition._recognitionActive) {
                stateText = 'Inconsistent (isRecording=true, active=false)';
                color = 'orange';
            } else if (!speechRecognition.isRecording && speechRecognition._recognitionActive) {
                stateText = 'Inconsistent (isRecording=false, active=true)';
                color = 'orange';
            } else {
                stateText = 'Inactive (not recording)';
                color = 'red';
            }
        }
        
        stateElement.innerHTML = `Recognition State: <span style="color:${color}">${stateText}</span>`;
    }
    
    // Initialize diagnostic tools when enabled
    function initDiagnostics() {
        // Check if diagnostics are enabled via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('diagnostics') === 'true') {
            console.log('Speech diagnostics enabled');
            createDiagnosticUI();
            
            // Set up interval to update recognition state
            setInterval(updateRecognitionState, 1000);
        }
    }
    
    // Initialize after page loads
    window.addEventListener('DOMContentLoaded', initDiagnostics);
    
    // Expose diagnostic functions to window for console use
    window.speechDiagnostics = {
        checkMicrophoneAccess,
        checkWebSpeechSupport,
        forceRestartRecognition,
        showDiagnosticUI: createDiagnosticUI
    };
})();
