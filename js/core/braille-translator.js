/**
 * Braille Translator Module
 * 
 * Converts text to Unified English Braille (UEB) code patterns 
 * for display and transmission to hardware devices.
 */

const brailleTranslator = (function() {
    // Braille database
    let brailleDatabase = null;
    let isInitialized = false;
    let isLoading = false;
    let loadPromise = null;
    
    // Default database path
    const DEFAULT_DATABASE_PATH = 'ueb-philb-braille-database.csv';
    
    /**
     * Initialize the translator by loading the Braille database
     * @param {string} databasePath - Path to the CSV database file
     * @returns {Promise} - Resolves when database is loaded
     */
    function init(databasePath = DEFAULT_DATABASE_PATH) {
        if (isInitialized) {
            return Promise.resolve(true);
        }
        
        if (loadPromise) {
            return loadPromise;
        }
        
        isLoading = true;
        
        loadPromise = new Promise((resolve, reject) => {
            console.log('Loading Braille database from:', databasePath);
            
            fetch(databasePath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load Braille database: ${response.status} ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(csvData => {
                    brailleDatabase = parseBrailleDatabase(csvData);
                    isInitialized = true;
                    isLoading = false;
                    console.log('Braille database loaded successfully');
                    resolve(true);
                })
                .catch(error => {
                    console.error('Error loading Braille database:', error);
                    isLoading = false;
                    loadPromise = null;
                    reject(error);
                });
        });
        
        return loadPromise;
    }
    
    /**
     * Parse CSV data into a usable Braille database
     * @param {string} csvData - Raw CSV data
     * @returns {Object} - Mapping of characters to Braille patterns
     */
    function parseBrailleDatabase(csvData) {
        const lines = csvData.split('\n');
        const database = {};
        
        // Skip header row if it exists
        const startIndex = lines[0].includes('Character,Dots') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const [char, dots, description] = line.split(',');
            if (char && dots) {
                // Parse dots into a numerical array
                const dotsArray = dots.split('-').map(Number);
                database[char.trim()] = {
                    dots: dotsArray,
                    description: description ? description.trim() : ''
                };
            }
        }
        
        return database;
    }
    
    /**
     * Convert text to Braille dot patterns
     * @param {string} text - Text to convert to Braille
     * @returns {Array} - Array of Braille dot patterns for each character
     */
    function textToBraille(text) {
        if (!isInitialized) {
            console.warn('Braille database not initialized. Initializing now...');
            init();
            return [[]];
        }
        
        const result = [];
        const upperCase = /[A-Z]/;
        let capitalizing = false;
        
        // Process each character
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Handle capitalization
            if (upperCase.test(char) && !capitalizing) {
                // Add capital sign (dots 6)
                result.push([6]);
                capitalizing = true;
            } else if (!upperCase.test(char) && capitalizing) {
                capitalizing = false;
            }
            
            // Get Braille pattern for the character (lowercase for lookup)
            const charLower = char.toLowerCase();
            const brailleChar = brailleDatabase[charLower];
            
            if (brailleChar) {
                result.push(brailleChar.dots);
            } else if (char === ' ') {
                // Space character
                result.push([]);
            } else {
                // Unknown character - use generic dot pattern (dots 1-2-3-4-5-6)
                console.warn(`Character not found in Braille database: "${char}"`);
                result.push([1, 2, 3, 4, 5, 6]);
            }
        }
        
        return result;
    }
    
    /**
     * Convert text to an array of Braille cell patterns suitable for display
     * @param {string} text - Text to convert to Braille
     * @returns {Array} - Array of Braille cell patterns (6-bit binary patterns)
     */
    function textToBrailleCells(text) {
        const braillePatterns = textToBraille(text);
        
        return braillePatterns.map(pattern => {
            // Create a 6-bit pattern where each bit represents a dot
            let cellPattern = 0;
            
            // Set bits for dots (1-6)
            pattern.forEach(dot => {
                if (dot >= 1 && dot <= 6) {
                    cellPattern |= (1 << (dot - 1));
                }
            });
            
            return cellPattern;
        });
    }
    
    /**
     * Convert text to an array representation suitable for Arduino
     * @param {string} text - Text to convert to Braille
     * @returns {string} - Comma-separated list of Braille cell patterns for Arduino
     */
    function textToBrailleArduino(text) {
        const cells = textToBrailleCells(text);
        return cells.join(',');
    }
    
    /**
     * Get a Braille dot pattern for a specific character
     * @param {string} char - Single character to convert
     * @returns {Array} - Dot pattern for the character
     */
    function getCharacterPattern(char) {
        if (!isInitialized) {
            console.warn('Braille database not initialized');
            return [];
        }
        
        const charLower = char.toLowerCase();
        const brailleChar = brailleDatabase[charLower];
        
        return brailleChar ? brailleChar.dots : [];
    }
    
    /**
     * Check if a character exists in the Braille database
     * @param {string} char - Character to check
     * @returns {boolean} - True if character exists in database
     */
    function hasCharacter(char) {
        if (!isInitialized) {
            console.warn('Braille database not initialized');
            return false;
        }
        
        return !!brailleDatabase[char.toLowerCase()];
    }
    
    /**
     * Get the loading status of the Braille database
     * @returns {Object} - Status object with isLoaded and isLoading properties
     */
    function getStatus() {
        return {
            isLoaded: isInitialized,
            isLoading: isLoading
        };
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        init().catch(error => {
            console.error('Failed to initialize Braille translator:', error);
        });
    });
    
    // Public API
    return {
        init,
        textToBraille,
        textToBrailleCells,
        textToBrailleArduino,
        getCharacterPattern,
        hasCharacter,
        getStatus
    };
})();