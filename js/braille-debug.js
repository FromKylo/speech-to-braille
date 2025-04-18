/**
 * Braille Database Debugging Tool - Fixed Version
 * Helps diagnose and test the braille database functionality
 */

(function() {
    // Create UI for database debugging
    function createDebugUI() {
        const container = document.createElement('div');
        container.id = 'braille-debug-ui';
        container.style.padding = '10px';
        container.style.backgroundColor = '#f8f9fa';
        container.style.border = '1px solid #dee2e6';
        container.style.borderRadius = '4px';
        container.style.margin = '10px 0';
        
        container.innerHTML = `
            <h4>Braille Database Debug</h4>
            <div>
                <input type="text" id="braille-debug-word" placeholder="Type word to test">
                <button id="braille-debug-search" class="action-button">Search Database</button>
                <button id="braille-debug-init" class="action-button" style="margin-left: 10px;">Initialize Database</button>
            </div>
            <div id="braille-debug-result" style="margin-top:10px;"></div>
            <div id="braille-debug-status" style="margin-top:10px; padding: 5px; background: #f0f0f0;"></div>
        `;
        
        // Find a place to add our debug UI
        const troubleshootingSection = document.querySelector('#troubleshooting-section .card');
        if (troubleshootingSection) {
            // Create a dedicated details section
            const details = document.createElement('details');
            details.innerHTML = '<summary>Braille Database Debug</summary>';
            const content = document.createElement('div');
            content.className = 'details-content';
            content.appendChild(container);
            details.appendChild(content);
            troubleshootingSection.appendChild(details);
            
            // Add event listener for the search button
            const searchButton = document.getElementById('braille-debug-search');
            if (searchButton) {
                searchButton.addEventListener('click', searchBrailleWord);
            }
            
            // Add event listener for the init button
            const initButton = document.getElementById('braille-debug-init');
            if (initButton) {
                initButton.addEventListener('click', initBrailleTranslator);
            }
            
            // Also add enter key event for the input
            const wordInput = document.getElementById('braille-debug-word');
            if (wordInput) {
                wordInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        searchBrailleWord();
                    }
                });
            }

            // Update initial status
            updateDebugStatus();
        } else {
            console.error('Troubleshooting section not found');
        }
    }
    
    // Search for a word in the braille database
    function searchBrailleWord() {
        const wordInput = document.getElementById('braille-debug-word');
        const resultDiv = document.getElementById('braille-debug-result');
        
        if (!wordInput || !resultDiv) return;
        
        const word = wordInput.value.trim();
        
        if (!word) {
            resultDiv.innerHTML = '<p style="color:#dc3545">Please enter a word to search</p>';
            return;
        }
        
        // Check if braille translator is available
        if (!window.brailleTranslator) {
            resultDiv.innerHTML = '<p style="color:#dc3545">Braille translator not available</p>';
            return;
        }
        
        // Check if database is loaded and if the search function exists
        if (!brailleTranslator.isDatabaseLoaded || !brailleTranslator.isDatabaseLoaded()) {
            resultDiv.innerHTML = `
                <p style="color:#dc3545">Braille database not loaded yet</p>
                <button id="load-db-now" class="action-button">Load Database Now</button>
            `;
            
            const loadDbButton = document.getElementById('load-db-now');
            if (loadDbButton) {
                loadDbButton.addEventListener('click', initBrailleTranslator);
            }
            return;
        }
        
        // Search for the word using the proper methods
        let match = null;
        
        // Try different methods to find a match
        if (typeof brailleTranslator.searchWord === 'function') {
            match = brailleTranslator.searchWord(word);
        } else if (typeof brailleTranslator.processText === 'function') {
            match = brailleTranslator.processText(word);
        } else if (typeof brailleTranslator.processSentence === 'function') {
            match = brailleTranslator.processSentence(word);
        }
        
        if (match) {
            resultDiv.innerHTML = `
                <p style="color:#28a745"><strong>Match found:</strong></p>
                <ul>
                    <li><strong>Word:</strong> ${match.word}</li>
                    <li><strong>Braille Symbol:</strong> ${match.braille || 'N/A'}</li>
                    <li><strong>Array:</strong> ${JSON.stringify(match.array)}</li>
                    <li><strong>Language:</strong> ${match.language || 'UEB'}</li>
                </ul>
            `;
            
            // Also add a "Use this" button to set the current match
            const useButton = document.createElement('button');
            useButton.textContent = 'Use This Match';
            useButton.className = 'action-button';
            useButton.style.backgroundColor = '#28a745';
            
            useButton.addEventListener('click', function() {
                if (window.app && typeof app.processSpeechForBraille === 'function') {
                    app.processSpeechForBraille(match.word);
                    resultDiv.innerHTML += '<p style="color:#28a745">Match applied!</p>';
                    
                    // Ensure text-to-speech reads the word
                    if (window.textToSpeech && typeof textToSpeech.speak === 'function') {
                        textToSpeech.speak(match.word);
                    }
                }
            });
            
            resultDiv.appendChild(useButton);
        } else {
            resultDiv.innerHTML = `
                <p style="color:#dc3545">No match found for "${word}"</p>
                <p>Try another word or check the database.</p>
            `;
        }
    }
    
    // Manually trigger braille translator initialization
    async function initBrailleTranslator() {
        const statusDiv = document.getElementById('braille-debug-status');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = '<p style="color:#ffc107">Initializing braille translator...</p>';
        
        if (!window.brailleTranslator) {
            statusDiv.innerHTML = `
                <p style="color:#dc3545">Error: Braille translator module is not defined. Check console for errors.</p>
                <p>Try reloading the page, or check if braille-translator.js is properly loaded.</p>
            `;
            return;
        }
        
        try {
            const success = await window.brailleTranslator.init();
            if (success) {
                const dbSize = window.brailleTranslator.getDatabaseSize ? 
                    window.brailleTranslator.getDatabaseSize() : 'Unknown';
                    
                statusDiv.innerHTML = `
                    <p style="color:#28a745">Braille database loaded successfully!</p>
                    <p>Database size: ${dbSize} entries</p>
                `;
                showDatabaseStats();
            } else {
                statusDiv.innerHTML = `
                    <p style="color:#dc3545">Failed to load braille database.</p>
                    <p>Check console for detailed error messages.</p>
                `;
            }
        } catch (error) {
            statusDiv.innerHTML = `
                <p style="color:#dc3545">Error initializing braille translator: ${error.message}</p>
                <p>Check console for more details.</p>
            `;
            console.error('Error initializing braille translator:', error);
        }
    }
    
    // Update the debug status information
    function updateDebugStatus() {
        const statusDiv = document.getElementById('braille-debug-status');
        if (!statusDiv) return;
        
        if (!window.brailleTranslator) {
            statusDiv.innerHTML = '<p style="color:#dc3545">Braille translator not available</p>';
            return;
        }
        
        if (window.brailleTranslator.isDatabaseLoaded && window.brailleTranslator.isDatabaseLoaded()) {
            const dbSize = window.brailleTranslator.getDatabaseSize ? 
                window.brailleTranslator.getDatabaseSize() : 'Unknown';
                
            statusDiv.innerHTML = `
                <p style="color:#28a745">Braille database is loaded</p>
                <p>Database size: ${dbSize} entries</p>
            `;
        } else {
            statusDiv.innerHTML = `
                <p style="color:#ffc107">Braille database not loaded yet</p>
                <p>Click "Initialize Database" to load it manually</p>
            `;
        }
    }
    
    // Add database statistics
    function showDatabaseStats() {
        if (!window.brailleTranslator || !window.brailleTranslator.getDatabaseSize) {
            return;
        }
        
        const dbSize = window.brailleTranslator.getDatabaseSize();
            
        const container = document.createElement('div');
        container.innerHTML = `
            <div style="margin-top:10px;">
                <p><strong>Database Statistics:</strong></p>
                <p>Total entries: ${dbSize}</p>
            </div>
        `;
        
        const debugUI = document.getElementById('braille-debug-ui');
        if (debugUI) {
            const existingStats = debugUI.querySelector('.database-stats');
            if (existingStats) {
                existingStats.remove();
            }
            
            container.className = 'database-stats';
            debugUI.appendChild(container);
        }
    }
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Initializing Braille Debug Tool");
        // Wait a bit for other scripts to initialize
        setTimeout(() => {
            createDebugUI();
            showDatabaseStats();
        }, 2500);
    });
})();
