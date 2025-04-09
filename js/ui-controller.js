/**
 * UI Controller for Speech to Braille App
 * Handles DOM manipulation and UI state
 */

// UI Controller as a module
const uiController = (function() {
    // DOM elements
    let startSpeechBtn, stopSpeechBtn, speechMethodSelect, recordingIndicator;
    let interimTextElement, finalTextElement, modelBadge;
    let loadingContainer, progressBar, progressStatus;
    let brailleStatus, brailleResult, matchedWordElement, brailleLanguageElement;
    let brailleSymbolElement, brailleArrayElement, noMatchInfo;
    
    // Initialize DOM references
    function initDOMReferences() {
        startSpeechBtn = document.getElementById('start-speech-btn');
        stopSpeechBtn = document.getElementById('stop-speech-btn');
        speechMethodSelect = document.getElementById('speech-method');
        recordingIndicator = document.getElementById('recording-indicator');
        interimTextElement = document.getElementById('interim-text');
        finalTextElement = document.getElementById('final-text');
        modelBadge = document.getElementById('model-badge');
        loadingContainer = document.getElementById('loading-container');
        progressBar = document.getElementById('progress-bar');
        progressStatus = document.getElementById('progress-status');
        
        // Braille translation elements
        brailleStatus = document.getElementById('braille-status');
        brailleResult = document.getElementById('braille-result');
        matchedWordElement = document.getElementById('matched-word');
        brailleLanguageElement = document.getElementById('braille-language');
        brailleSymbolElement = document.getElementById('braille-symbol');
        brailleArrayElement = document.getElementById('braille-array');
        noMatchInfo = document.getElementById('no-match-info');
        
        // Remove any old buttons that were added programmatically
        const oldButtons = document.querySelectorAll('main > button');
        oldButtons.forEach(button => {
            if (button.textContent === 'Start Speech Recognition' || 
                button.textContent === 'Load Speech Recognition Model') {
                button.remove();
            }
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        if (!startSpeechBtn || !stopSpeechBtn || !speechMethodSelect) return;
        
        // Add event listener for speech method select
        speechMethodSelect.addEventListener('change', async function(event) {
            const selectedMethod = event.target.value;
            
            if (selectedMethod === 'local') {
                // Check if model is already loaded
                if (modelBadge.textContent !== 'Local Model') {
                    // Automatically load the model
                    await window.app.loadLocalModel();
                }
            } else if (selectedMethod === 'webspeech') {
                // Switch to web speech API
                updateModelStatus('webspeech');
                enableStartButton();
            }
        });
        
        // Function to start speech recognition
        startSpeechBtn.addEventListener('click', () => {
            window.app.startSpeechRecognition();
        });
        
        // Function to stop speech recognition
        stopSpeechBtn.addEventListener('click', () => {
            window.app.stopSpeechRecognition();
        });
    }
    
    // Initialize braille translator UI
    async function initBrailleTranslator() {
        if (typeof brailleTranslator === 'undefined') {
            console.error('Braille translator module is not loaded');
            brailleStatus.textContent = 'Braille translator not available';
            brailleStatus.className = 'status offline';
            return;
        }
        
        brailleStatus.textContent = 'Loading Braille database...';
        brailleStatus.className = 'status';
        
        // Add retry button for manual database loading
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry Loading Database';
        retryButton.id = 'retry-braille-db-btn';
        retryButton.style.marginTop = '10px';
        retryButton.style.display = 'none';
        brailleStatus.appendChild(document.createElement('br'));
        brailleStatus.appendChild(retryButton);
        
        // Add event listener to retry button
        retryButton.addEventListener('click', async () => {
            brailleStatus.textContent = 'Retrying database load...';
            brailleStatus.className = 'status';
            retryButton.style.display = 'none';
            brailleStatus.appendChild(document.createElement('br'));
            brailleStatus.appendChild(retryButton);
            
            try {
                const success = await brailleTranslator.init();
                if (success) {
                    const dbSize = brailleTranslator.getDatabaseSize();
                    brailleStatus.textContent = `Braille database loaded with ${dbSize} entries`;
                    brailleStatus.className = 'status online';
                    retryButton.style.display = 'none';
                } else {
                    brailleStatus.textContent = 'Failed to load Braille database';
                    brailleStatus.className = 'status offline';
                    retryButton.style.display = 'inline-block';
                    showDatabaseDebugInfo();
                }
            } catch (error) {
                console.error('Error initializing Braille translator:', error);
                brailleStatus.textContent = `Error loading database: ${error.message}`;
                brailleStatus.className = 'status offline';
                retryButton.style.display = 'inline-block';
                showDatabaseDebugInfo();
            }
        });
        
        try {
            const success = await brailleTranslator.init();
            if (success) {
                const dbSize = brailleTranslator.getDatabaseSize();
                brailleStatus.textContent = `Braille database loaded with ${dbSize} entries`;
                brailleStatus.className = 'status online';
            } else {
                brailleStatus.textContent = 'Failed to load Braille database';
                brailleStatus.className = 'status offline';
                retryButton.style.display = 'inline-block';
                showDatabaseDebugInfo();
            }
        } catch (error) {
            console.error('Error initializing Braille translator:', error);
            brailleStatus.textContent = `Error loading database: ${error.message}`;
            brailleStatus.className = 'status offline';
            retryButton.style.display = 'inline-block';
            showDatabaseDebugInfo();
        }
    }
    
    // Function to display database debug info
    function showDatabaseDebugInfo() {
        // Check if the CSV file exists and display diagnostic information
        const debugDiv = document.createElement('div');
        debugDiv.className = 'database-debug-info';
        debugDiv.style.marginTop = '10px';
        debugDiv.style.padding = '10px';
        debugDiv.style.backgroundColor = '#f8f9fa';
        debugDiv.style.border = '1px solid #dee2e6';
        debugDiv.style.borderRadius = '4px';
        
        const debugTitle = document.createElement('h4');
        debugTitle.textContent = 'Diagnostic Information';
        debugTitle.style.margin = '0 0 10px 0';
        debugDiv.appendChild(debugTitle);
        
        // Check file availability
        fetch('/ueb-philb-braille-database.csv', { 
            method: 'HEAD',
            cache: 'no-store'
        })
        .then(response => {
            const fileInfo = document.createElement('p');
            if (response.ok) {
                fileInfo.textContent = '✅ Database file is accessible via direct path';
                fileInfo.style.color = '#155724';
            } else {
                fileInfo.textContent = '❌ Database file is not accessible via direct path';
                fileInfo.style.color = '#721c24';
            }
            debugDiv.appendChild(fileInfo);
            
            // Add server information
            const serverInfo = document.createElement('p');
            serverInfo.textContent = `Server base URL: ${window.location.origin}`;
            debugDiv.appendChild(serverInfo);
            
            // Add helpful suggestions
            const suggestions = document.createElement('ul');
            suggestions.innerHTML = `
                <li>Make sure the file "ueb-philb-braille-database.csv" exists in the root directory</li>
                <li>Check if the file permissions allow it to be read</li>
                <li>Try refreshing the page with Ctrl+F5 to clear cache</li>
                <li>Check the browser console for additional error details</li>
            `;
            debugDiv.appendChild(suggestions);
        })
        .catch(error => {
            const errorInfo = document.createElement('p');
            errorInfo.textContent = `Error checking file: ${error.message}`;
            errorInfo.style.color = '#721c24';
            debugDiv.appendChild(errorInfo);
        })
        .finally(() => {
            brailleStatus.appendChild(debugDiv);
        });
    }
    
    // Initialize UI state based on speech recognition availability
    function initSpeechRecognitionUI() {
        if (typeof speechRecognition !== 'undefined' && speechRecognition.isSupported()) {
            if (speechRecognition.webSpeechRecognition) {
                updateModelStatus('webspeech');
                modelBadge.textContent = 'Web Speech API Available';
                enableStartButton();
            } else {
                updateModelStatus('none');
                modelBadge.textContent = 'No Recognition Available';
                disableStartButton();
            }
        } else {
            updateModelStatus('none');
            modelBadge.textContent = 'Not Available';
            disableStartButton();
            console.error('Speech recognition is not supported');
        }
    }
    
    // Initialize the UI controller
    function init() {
        initDOMReferences();
        setupEventListeners();
        initSpeechRecognitionUI();
        initBrailleTranslator();
    }
    
    // Public methods
    return {
        init,
        
        // Helper function to update progress bar
        updateLoadingProgress: function(percent, statusText) {
            if (!progressBar || !progressStatus) return;
            progressBar.style.width = `${percent}%`;
            if (statusText) {
                progressStatus.textContent = statusText;
            }
        },
        
        // Update model status indicator
        updateModelStatus: function(model) {
            if (!modelBadge) return;
            updateModelStatus(model);
        },
        
        // Helper functions to update UI state
        showLoadingBar: function() {
            if (loadingContainer) loadingContainer.style.display = 'block';
        },
        
        hideLoadingBar: function() {
            if (loadingContainer) loadingContainer.style.display = 'none';
        },
        
        enableStartButton: function() {
            if (startSpeechBtn) startSpeechBtn.disabled = false;
        },
        
        disableStartButton: function() {
            if (startSpeechBtn) startSpeechBtn.disabled = true;
        },
        
        setProgressBarError: function() {
            if (progressBar) progressBar.style.backgroundColor = '#ea4335'; // Red for error
        },
        
        resetProgressBar: function() {
            if (progressBar) progressBar.style.backgroundColor = '#4285f4'; // Reset color
        },
        
        // Helper function to update UI for recording state
        setRecordingState: function(isRecording) {
            console.log(`Setting recording state: ${isRecording}`);
            window.recognitionActive = isRecording;
            
            // Update button states
            if (startSpeechBtn) startSpeechBtn.disabled = isRecording;
            if (stopSpeechBtn) stopSpeechBtn.disabled = !isRecording;
            
            // Update recording indicator
            if (recordingIndicator) {
                if (isRecording) {
                    recordingIndicator.className = 'recording-on';
                    recordingIndicator.textContent = '● Recording';
                } else {
                    recordingIndicator.className = 'recording-off';
                    recordingIndicator.textContent = '● Recording';
                }
            }
            
            // Clear interim text if stopping
            if (!isRecording) {
                this.clearInterimText();
            }
        },
        
        // Text update methods
        updateFinalText: function(text) {
            if (finalTextElement) finalTextElement.textContent += text + ' ';
        },
        
        updateInterimText: function(text) {
            if (interimTextElement) interimTextElement.textContent = text;
        },
        
        clearInterimText: function() {
            if (interimTextElement) interimTextElement.textContent = '';
        },
        
        // Method to get selected speech method
        getSpeechMethod: function() {
            return speechMethodSelect ? speechMethodSelect.value : 'webspeech';
        },
        
        // Braille display methods
        showBrailleMatch: function(result) {
            if (!noMatchInfo || !brailleResult || !matchedWordElement || 
                !brailleLanguageElement || !brailleSymbolElement) return;
                
            noMatchInfo.classList.add('hidden');
            brailleResult.classList.remove('hidden');
            
            // Update UI with matched word and braille symbol
            matchedWordElement.textContent = result.word;
            brailleSymbolElement.textContent = result.braille;
            
            // Display the language directly without formatting
            brailleLanguageElement.textContent = result.language;
        },
        
        showNoMatch: function() {
            if (!brailleResult || !noMatchInfo) return;
            brailleResult.classList.add('hidden');
            noMatchInfo.classList.remove('hidden');
        },
        
        updateBrailleArray: function(formattedArray) {
            if (brailleArrayElement) brailleArrayElement.textContent = formattedArray;
        }
    };
    
    // Private helper functions
    function updateModelStatus(model) {
        if (!modelBadge) return;
        
        modelBadge.className = 'model-badge';
        
        switch(model) {
            case 'webspeech':
                modelBadge.classList.add('web-speech');
                modelBadge.textContent = 'Web Speech API';
                break;
            case 'local':
                modelBadge.classList.add('vosk-model');
                modelBadge.textContent = 'Local Model';
                break;
            default:
                modelBadge.classList.add('no-model');
                modelBadge.textContent = 'Not Selected';
        }
    }
    
    function enableStartButton() {
        if (startSpeechBtn) startSpeechBtn.disabled = false;
    }
    
    function disableStartButton() {
        if (startSpeechBtn) startSpeechBtn.disabled = true;
    }
})();

// Initialize UI controller when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    uiController.init();
});
