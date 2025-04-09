/**
 * Braille Translator Module
 * 
 * This module processes speech recognition results and matches words against
 * the Braille database to output array values and Braille symbols.
 */

// Create a namespace for our Braille translator functionality
const brailleTranslator = (function() {
    // Store the Braille database after loading
    let brailleDatabase = [];
    let databaseLoaded = false;
    
    // Event listeners
    const eventListeners = {
        'match': [],
        'nomatch': [],
        'databaseloaded': [],
        'error': []
    };
    
    // Helper function to trigger events
    function triggerEvent(eventName, data) {
        if (eventListeners[eventName]) {
            for (const callback of eventListeners[eventName]) {
                callback(data);
            }
        }
    }
    
    // Function to load the Braille database from the CSV file
    async function loadDatabase() {
        try {
            // Try multiple path possibilities to handle different server configurations
            const possiblePaths = [
                '/ueb-philb-braille-database.csv',
                './ueb-philb-braille-database.csv',
                '../ueb-philb-braille-database.csv',
                window.location.origin + '/ueb-philb-braille-database.csv'
            ];
            
            let response = null;
            let csvText = null;
            let loadedFrom = '';
            
            // Try each path until one works
            for (const path of possiblePaths) {
                try {
                    console.log(`Attempting to load Braille database from: ${path}`);
                    response = await fetch(path, { cache: 'no-store' });
                    if (response.ok) {
                        csvText = await response.text();
                        loadedFrom = path;
                        console.log(`Successfully loaded Braille database from: ${path}`);
                        break;
                    }
                } catch (pathError) {
                    console.warn(`Could not load from ${path}:`, pathError);
                }
            }
            
            if (!csvText) {
                throw new Error(`Failed to load Braille database from any path`);
            }
            
            const rows = csvText.split('\n');
            
            // Skip the first row (header) and parse the rest
            const parsedDatabase = [];
            
            for (let i = 1; i < rows.length; i++) {
                // Skip empty rows
                if (!rows[i].trim()) continue;
                
                // Remove the initial comment if present
                const row = rows[i].replace(/^\/\/.*?/, '').trim();
                if (!row) continue;
                
                const columns = row.split(',');
                if (columns.length >= 5) {
                    parsedDatabase.push({
                        word: columns[0].trim(),
                        shortForm: columns[1].trim(),
                        braille: columns[2].trim(),
                        array: parseArray(columns[3]),
                        language: columns[4].trim()
                    });
                }
            }
            
            brailleDatabase = parsedDatabase;
            databaseLoaded = true;
            
            // Trigger databaseloaded event
            triggerEvent('databaseloaded', { 
                count: brailleDatabase.length,
                loadedFrom: loadedFrom
            });
            
            console.log(`Braille database loaded with ${brailleDatabase.length} entries`);
            return true;
            
        } catch (error) {
            console.error('Error loading Braille database:', error);
            triggerEvent('error', { message: error.message });
            return false;
        }
    }
    
    // Helper function to parse array values from the CSV
    function parseArray(arrayString) {
        // Handle single value arrays like {1,2} or nested arrays like {{1,2},{3,4}}
        try {
            // If it's a nested array
            if (arrayString.includes('{{')) {
                const nestedArrays = [];
                const matches = arrayString.match(/\{([^{}]+)\}/g);
                
                if (matches) {
                    for (const match of matches) {
                        // Extract values between brackets and split by comma
                        const values = match
                            .replace(/[{}]/g, '')
                            .split(',')
                            .map(val => parseInt(val.trim()))
                            .filter(val => !isNaN(val));
                        
                        nestedArrays.push(values);
                    }
                }
                
                return nestedArrays;
            } else {
                // If it's a simple array like {1,2,3}
                const values = arrayString
                    .replace(/[{}]/g, '')
                    .split(',')
                    .map(val => parseInt(val.trim()))
                    .filter(val => !isNaN(val));
                
                // Debug output to check parsed values
                console.log('Parsed array for:', arrayString, 'Result:', values);
                
                return values;
            }
        } catch (error) {
            console.error('Error parsing array:', arrayString, error);
            return [];
        }
    }
    
    // Function to process a sentence and find the first matching word
    function processSentence(sentence) {
        if (!databaseLoaded) {
            console.error('Braille database not loaded. Call loadDatabase() first.');
            triggerEvent('error', { message: 'Braille database not loaded' });
            return null;
        }
        
        if (!sentence || typeof sentence !== 'string') {
            console.error('Invalid sentence provided');
            triggerEvent('error', { message: 'Invalid sentence provided' });
            return null;
        }
        
        // Split the sentence into words and clean them
        const words = sentence.toLowerCase().split(/\s+/).map(word => {
            // Remove punctuation and special characters
            return word.replace(/[^\w\s']|_/g, "").replace(/\s+/g, " ");
        });
        
        // Check each word against the database
        for (const word of words) {
            if (!word) continue;
            
            // Find in database (exact match)
            const exactMatch = brailleDatabase.find(entry => entry.word.toLowerCase() === word);
            if (exactMatch) {
                triggerEvent('match', {
                    word: word,
                    braille: exactMatch.braille,
                    array: exactMatch.array,
                    language: exactMatch.language
                });
                
                return {
                    word: word,
                    braille: exactMatch.braille,
                    array: exactMatch.array,
                    language: exactMatch.language
                };
            }
        }
        
        // No match found
        triggerEvent('nomatch', { sentence });
        return null;
    }
    
    // Public API
    return {
        // Initialize the translator
        init: async function() {
            return await loadDatabase();
        },
        
        // Check if database is loaded
        isDatabaseLoaded: function() {
            return databaseLoaded;
        },
        
        // Get database size
        getDatabaseSize: function() {
            return brailleDatabase.length;
        },
        
        // Process a sentence from speech recognition
        processText: function(text) {
            return processSentence(text);
        },
        
        // Register event listeners
        on: function(eventName, callback) {
            if (eventListeners[eventName]) {
                eventListeners[eventName].push(callback);
            }
            return this;
        },
        
        // Search database by word (utility function)
        searchWord: function(word) {
            if (!databaseLoaded) return null;
            
            const match = brailleDatabase.find(entry => 
                entry.word.toLowerCase() === word.toLowerCase()
            );
            
            return match || null;
        }
    };
})();

// Initialize the module when the script loads
console.log('Braille Translator module loaded.');