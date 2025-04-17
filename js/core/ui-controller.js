/**
 * UI Controller Module
 * 
 * Handles all user interface interactions, updates, and UI state management
 * for the Speech-to-Braille application
 */

const uiController = (function() {
    // UI state
    let isRecording = false;
    let isUIInitialized = false;
    
    // Initialize UI components
    function init() {
        console.log('Initializing UI controller...');
        
        try {
            // Setup UI interaction handlers
            setupUIEventHandlers();
            
            // Initialize theme from preferences
            initializeTheme();
            
            // Set initial UI state
            updateLastUpdatedTimestamp();
            
            isUIInitialized = true;
            return true;
        } catch (error) {
            console.error('Error initializing UI controller:', error);
            return false;
        }
    }
    
    // Setup UI event handlers
    function setupUIEventHandlers() {
        // Speak word button handler
        const speakWordBtn = document.getElementById('speak-word-btn');
        if (speakWordBtn) {
            speakWordBtn.addEventListener('click', function() {
                const wordElement = document.getElementById('matched-word');
                if (wordElement && wordElement.textContent && wordElement.textContent !== 'None') {
                    if (window.textToSpeech) {
                        textToSpeech.speak(wordElement.textContent);
                        
                        // Show speaking indicator
                        const speakingIndicator = document.getElementById('speaking-indicator');
                        if (speakingIndicator) {
                            speakingIndicator.classList.remove('hidden');
                            setTimeout(() => {
                                speakingIndicator.classList.add('hidden');
                            }, 2000);
                        }
                    }
                }
            });
        }
        
        // Refresh cache info button handler
        const refreshButton = document.getElementById('refresh-button');
        if (refreshButton) {
            refreshButton.addEventListener('click', function() {
                if (window.cacheManager && cacheManager.refreshCacheInfo) {
                    cacheManager.refreshCacheInfo();
                } else {
                    updateDynamicContent('Cache manager not available');
                }
            });
        }
    }
    
    // Initialize theme based on user preferences
    function initializeTheme() {
        // Check for system dark mode preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Check localStorage for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        
        // Apply theme based on preference or system default
        if (savedTheme === 'dark' || (!savedTheme && prefersDarkMode)) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-update if user hasn't set a preference
            if (!savedTheme) {
                if (e.matches) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            }
        });
    }
    
    // Show the loading bar
    function showLoadingBar() {
        const loadingContainer = document.getElementById('loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = 'block';
        }
    }
    
    // Hide the loading bar
    function hideLoadingBar() {
        const loadingContainer = document.getElementById('loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
    }
    
    // Update loading progress
    function updateLoadingProgress(percent, message) {
        const progressBar = document.getElementById('progress-bar');
        const progressStatus = document.getElementById('progress-status');
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        
        if (progressStatus) {
            progressStatus.textContent = message || `Loading ${percent}%`;
        }
    }
    
    // Set progress bar error state
    function setProgressBarError() {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.classList.add('error');
        }
    }
    
    // Show the speech loading bar
    function showSpeechLoadingBar() {
        const loadingContainer = document.getElementById('speech-loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = 'block';
        }
    }
    
    // Hide the speech loading bar
    function hideSpeechLoadingBar() {
        const loadingContainer = document.getElementById('speech-loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
    }
    
    // Update speech loading progress
    function updateSpeechLoadingProgress(percent, message) {
        const progressBar = document.getElementById('speech-progress-bar');
        const progressStatus = document.getElementById('speech-loading-status');
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        
        if (progressStatus) {
            progressStatus.textContent = message || `Loading speech recognition ${percent}%`;
        }
    }
    
    // Update the interim text display
    function updateInterimText(text) {
        const interimTextElement = document.getElementById('interim-text');
        if (interimTextElement) {
            interimTextElement.textContent = text;
        }
    }
    
    // Update the final text display
    function updateFinalText(text) {
        const finalTextElement = document.getElementById('final-text');
        if (finalTextElement) {
            finalTextElement.textContent = text;
        }
    }
    
    // Clear the interim text display
    function clearInterimText() {
        updateInterimText('');
    }
    
    // Clear the final text display
    function clearFinalText() {
        updateFinalText('');
    }
    
    // Set the recording state UI
    function setRecordingState(isActive) {
        isRecording = isActive;
        
        // Update the recognition status in troubleshooting
        const statusElement = document.getElementById('recognition-active-status');
        if (statusElement) {
            statusElement.textContent = isActive ? 'Yes' : 'No';
            statusElement.style.color = isActive ? '#34a853' : '#ea4335';
        }
        
        // Update recording indicator
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) {
            if (isActive) {
                recordingIndicator.style.display = 'inline-block';
            } else {
                recordingIndicator.style.display = 'none';
            }
        }
        
        // Update any other UI elements that show recording state
        updateLastUpdatedTimestamp();
    }
    
    // Show a Braille match in the UI
    function showBrailleMatch(result) {
        if (!result) return;
        
        // Show the match container
        const brailleResult = document.getElementById('braille-result');
        const noMatchInfo = document.getElementById('no-match-info');
        
        if (brailleResult) brailleResult.style.display = 'block';
        if (noMatchInfo) noMatchInfo.style.display = 'none';
        
        // Update match data
        updateMatchedWord(result.text || result.symbol || 'Unknown');
        updateBrailleLanguage(result.language || 'UEB');
        updateBrailleSymbol(result.symbol || result.text || '-');
        
        // Update dots array display
        if (result.array) {
            // Format the array for display using our utility if available
            if (window.brailleArrayFormatter && brailleArrayFormatter.format) {
                updateBrailleArray(brailleArrayFormatter.format(result.array));
            } else {
                // Fallback to basic formatting
                updateBrailleArray(JSON.stringify(result.array));
            }
        } else {
            updateBrailleArray('[]');
        }
    }
    
    // Show no match found in the UI
    function showNoMatch() {
        // Hide the match container, show the no match message
        const brailleResult = document.getElementById('braille-result');
        const noMatchInfo = document.getElementById('no-match-info');
        
        if (brailleResult) brailleResult.style.display = 'none';
        if (noMatchInfo) noMatchInfo.style.display = 'block';
        
        // Clear any existing data
        updateMatchedWord('None');
        updateBrailleLanguage('N/A');
        updateBrailleSymbol('');
        updateBrailleArray('[]');
    }
    
    // Update the matched word display
    function updateMatchedWord(word) {
        const matchedWordElement = document.getElementById('matched-word');
        if (matchedWordElement) {
            matchedWordElement.textContent = word;
        }
    }
    
    // Update the Braille language display
    function updateBrailleLanguage(language) {
        const languageElement = document.getElementById('braille-language');
        if (languageElement) {
            languageElement.textContent = language;
        }
    }
    
    // Update the Braille symbol display
    function updateBrailleSymbol(symbol) {
        const symbolElement = document.getElementById('braille-symbol');
        if (symbolElement) {
            symbolElement.textContent = symbol;
        }
    }
    
    // Update the Braille array display
    function updateBrailleArray(arrayText) {
        const arrayElement = document.getElementById('braille-array');
        if (arrayElement) {
            arrayElement.textContent = arrayText;
        }
    }
    
    // Update the last updated timestamp in the troubleshooting section
    function updateLastUpdatedTimestamp() {
        const timestampElement = document.getElementById('last-updated');
        if (timestampElement) {
            const now = new Date();
            timestampElement.textContent = now.toLocaleTimeString();
        }
    }
    
    // Update the cycle mode UI
    function updateCycleModeUI(mode) {
        // Update the troubleshooting info
        const phaseIndicator = document.getElementById('current-phase-indicator');
        if (phaseIndicator) {
            const phaseName = mode.charAt(0).toUpperCase() + mode.slice(1);
            phaseIndicator.textContent = phaseName;
        }
        
        // Legacy elements for backward compatibility
        const statusElement = document.getElementById('cycle-mode-status');
        const indicatorElement = document.getElementById('cycle-mode-indicator');
        
        if (statusElement) {
            statusElement.textContent = mode;
        }
        
        if (indicatorElement) {
            indicatorElement.textContent = mode;
        }
        
        updateLastUpdatedTimestamp();
    }
    
    // Update dynamic content in the troubleshooting section
    function updateDynamicContent(content) {
        const dynamicContentElement = document.getElementById('dynamic-content');
        if (dynamicContentElement) {
            dynamicContentElement.innerHTML = content;
        }
    }
    
    // Update introduction text
    function updateIntroText(text) {
        const introElement = document.getElementById('intro-phrase');
        if (introElement) {
            introElement.textContent = text;
        }
    }
    
    // Show the speaking status indicator for the introduction
    function showIntroSpeakingStatus(isVisible) {
        const statusElement = document.getElementById('intro-speaking-status');
        if (statusElement) {
            statusElement.style.display = isVisible ? 'flex' : 'none';
        }
    }
    
    // Public API
    return {
        init,
        showLoadingBar,
        hideLoadingBar,
        updateLoadingProgress,
        setProgressBarError,
        showSpeechLoadingBar,
        hideSpeechLoadingBar,
        updateSpeechLoadingProgress,
        updateInterimText,
        updateFinalText,
        clearInterimText,
        clearFinalText,
        setRecordingState,
        showBrailleMatch,
        showNoMatch,
        updateMatchedWord,
        updateBrailleLanguage,
        updateBrailleSymbol,
        updateBrailleArray,
        updateLastUpdatedTimestamp,
        updateCycleModeUI,
        updateDynamicContent,
        updateIntroText,
        showIntroSpeakingStatus
    };
})();