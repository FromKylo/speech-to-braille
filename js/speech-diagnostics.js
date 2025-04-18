/**
 * Speech recognition diagnostics helper
 * Provides tools to debug speech recognition issues
 * Modified to keep microphone always open and listening
 */

(function() {
    let micStream = null;
    let audioContext = null;
    let analyzer = null;
    let dataArray = null;
    let levelMeterInterval = null;

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
            
            // Update the status indicator
            const statusIndicator = document.getElementById('speech-status-indicator');
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator-large success';
                statusIndicator.textContent = 'Microphone access granted and always listening. Speech recognition should work.';
            }
            
            // Keep the stream open to ensure microphone is always active
            // Only stop it if the page is unloaded
            window.addEventListener('beforeunload', () => {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            });
        } catch (err) {
            diagMic.innerHTML = `Microphone: <span style="color:red;">Access Denied ✗ (${err.name})</span>`;
            console.error('Microphone access error:', err);
            
            // Update the status indicator
            const statusIndicator = document.getElementById('speech-status-indicator');
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator-large error';
                statusIndicator.textContent = `Microphone access denied: ${err.message}. Speech recognition will not work.`;
            }
        }
    }
    
    // Force restart recognition - modified to ensure microphone stays open
    function forceRestartRecognition() {
        if (window.speechRecognition && speechRecognition.isRecording) {
            console.log('Force restarting speech recognition while keeping mic open');
            
            // Store the current state
            const wasRecording = speechRecognition.isRecording;
            
            // Stop the recognition
            speechRecognition.stopRecognition();
            
            // Wait a moment and restart
            setTimeout(() => {
                speechRecognition.startRecognition();
                console.log('Speech recognition restarted with mic open');
            }, 500);
        } else {
            console.log('Starting speech recognition');
            if (window.speechRecognition) {
                speechRecognition.startRecognition();
            }
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
    
    // Start microphone level meter - keeps microphone always open
    function startMicLevelMeter() {
        // Stop any existing monitoring but keep microphone open
        if (levelMeterInterval) {
            clearInterval(levelMeterInterval);
            levelMeterInterval = null;
        }
        
        // Get the mic level elements
        const levelMeter = document.getElementById('mic-level-bar');
        if (!levelMeter) return;
        
        try {
            // Request microphone access if we don't already have it
            if (!micStream) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        micStream = stream;
                        
                        // Create audio context and analyzer
                        audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        const source = audioContext.createMediaStreamSource(stream);
                        analyzer = audioContext.createAnalyser();
                        analyzer.fftSize = 256;
                        source.connect(analyzer);
                        
                        // Prepare data array for analyzer
                        const bufferLength = analyzer.frequencyBinCount;
                        dataArray = new Uint8Array(bufferLength);
                        
                        // Start the level meter
                        startLevelMeterUpdates(levelMeter);
                    })
                    .catch(err => {
                        console.error('Microphone level meter error:', err);
                        levelMeter.style.width = '0%';
                    });
            } else {
                // We already have mic access, just start the meter
                startLevelMeterUpdates(levelMeter);
            }
        } catch (err) {
            console.error('Error starting microphone level meter:', err);
        }
    }
    
    // Helper function to start level meter updates
    function startLevelMeterUpdates(levelMeter) {
        levelMeterInterval = setInterval(() => {
            // Get audio data
            analyzer.getByteFrequencyData(dataArray);
            
            // Calculate average level
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            // Scale the level (0-100%)
            const scaledLevel = Math.min(100, Math.max(0, average * 2));
            
            // Update the meter
            levelMeter.style.width = scaledLevel + '%';
            
            // Update the status indicator if level is good
            const statusIndicator = document.getElementById('speech-status-indicator');
            if (statusIndicator && scaledLevel > 10) {
                statusIndicator.className = 'status-indicator-large success';
                statusIndicator.textContent = 'Microphone is active and always listening. Speech recognition should function correctly.';
            }
        }, 100);
    }
    
    // Initialize diagnostic tools when enabled
    function initDiagnostics() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('diagnostics') === 'true' || true) { // Always enable diagnostics
            console.log('Speech diagnostics enabled with always-on microphone');
            
            // Set up interval to update recognition state
            setInterval(updateRecognitionState, 1000);
            
            // Add event listener to the test microphone button
            const testMicBtn = document.getElementById('test-mic-btn');
            if (testMicBtn) {
                testMicBtn.addEventListener('click', () => {
                    startMicLevelMeter();
                    
                    // Keep mic meter running indefinitely
                    // Don't stop it with setTimeout anymore
                    
                    // Update button text
                    testMicBtn.textContent = 'Microphone Active';
                    setTimeout(() => {
                        testMicBtn.textContent = 'Test Microphone';
                    }, 3000);
                });
            }
            
            // Check microphone status initially and keep it open
            checkMicrophoneAccess();
            
            // Listen for speech recognition events to update status
            document.addEventListener('speechRecognitionStarted', () => {
                const statusIndicator = document.getElementById('speech-status-indicator');
                if (statusIndicator) {
                    statusIndicator.className = 'status-indicator-large success';
                    statusIndicator.textContent = 'Speech recognition is active and always listening.';
                }
            });
            
            document.addEventListener('speechRecognitionError', (event) => {
                const statusIndicator = document.getElementById('speech-status-indicator');
                if (statusIndicator) {
                    statusIndicator.className = 'status-indicator-large error';
                    statusIndicator.textContent = `Speech recognition error: ${event.detail || 'Unknown error'}`;
                }
            });
            
            // Start microphone level meter automatically to keep mic open
            startMicLevelMeter();
        }
    }
    
    // Initialize when DOM is ready
    window.addEventListener('DOMContentLoaded', initDiagnostics);
    
    // Expose diagnostic functions to window for console use
    window.speechDiagnostics = {
        checkMicrophoneAccess,
        checkWebSpeechSupport,
        forceRestartRecognition,
        startMicLevelMeter,
        showDiagnosticUI: createDiagnosticUI
    };
})();
