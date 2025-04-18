/**
 * Braille Database Debugging Tool
 * This script adds tools to debug database lookup issues
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
                <button id="braille-debug-search">Search Database</button>
            </div>
            <div id="braille-debug-result" style="margin-top:10px;"></div>
        `;
        
        // Find a place to add our debug UI
        const troubleshootingSection = document.querySelector('#troubleshooting-section .details-content');
        if (troubleshootingSection) {
            troubleshootingSection.appendChild(container);
            
            // Add event listener for the search button
            const searchButton = document.getElementById('braille-debug-search');
            if (searchButton) {
                searchButton.addEventListener('click', searchBrailleWord);
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
        
        // Check if database is loaded
        if (!brailleTranslator.isDatabaseLoaded()) {
            resultDiv.innerHTML = '<p style="color:#dc3545">Braille database not loaded yet</p>';
            return;
        }
        
        // Search for the word
        const match = brailleTranslator.searchWord(word);
        
        if (match) {
            resultDiv.innerHTML = `
                <p style="color:#28a745"><strong>Match found:</strong></p>
                <ul>
                    <li><strong>Word:</strong> ${match.word}</li>
                    <li><strong>Braille Symbol:</strong> ${match.braille}</li>
                    <li><strong>Array:</strong> ${JSON.stringify(match.array)}</li>
                    <li><strong>Language:</strong> ${match.language}</li>
                </ul>
            `;
            
            // Also add a "Use this" button to set the current match
            const useButton = document.createElement('button');
            useButton.textContent = 'Use This Match';
            useButton.style.backgroundColor = '#28a745';
            useButton.style.color = 'white';
            useButton.style.border = 'none';
            useButton.style.padding = '5px 10px';
            useButton.style.borderRadius = '4px';
            useButton.style.cursor = 'pointer';
            
            useButton.addEventListener('click', function() {
                if (window.app && typeof app.processSpeechForBraille === 'function') {
                    app.processSpeechForBraille(match.word);
                    resultDiv.innerHTML += '<p style="color:#28a745">Match applied!</p>';
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
    
    // Add database statistics
    function showDatabaseStats() {
        if (!window.brailleTranslator || !brailleTranslator.isDatabaseLoaded()) {
            return;
        }
        
        const dbSize = brailleTranslator.getDatabaseSize();
        const container = document.createElement('div');
        container.innerHTML = `
            <div style="margin-top:10px;">
                <p><strong>Database Statistics:</strong></p>
                <p>Total entries: ${dbSize}</p>
            </div>
        `;
        
        const debugUI = document.getElementById('braille-debug-ui');
        if (debugUI) {
            debugUI.appendChild(container);
        }
    }
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for other scripts to initialize
        setTimeout(() => {
            createDebugUI();
            showDatabaseStats();
        }, 2000);
    });
})();
