/**
 * Arduino BLE Debug & Fix Utility
 * This script fixes issues with empty data being sent to Arduino
 */
(function() {
    console.log('Arduino BLE Debug utilities loaded');
    
    // Wait for BLE controller to be initialized
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for other scripts to load
        setTimeout(initializeArduinoDebug, 1000);
    });
    
    function initializeArduinoDebug() {
        if (!window.bleController) {
            console.error('BLE Controller not found - Arduino debug cannot initialize');
            return;
        }
        
        console.log('Patching BLE Controller for Arduino debugging and fixing empty data issues');
        
        // Store the original sendBrailleData function
        const originalSendBrailleData = bleController.sendBrailleData;
        
        // Override the function with our enhanced version
        bleController.sendBrailleData = async function(brailleArray) {
            // Log the original data received
            console.log('Original braille data for Arduino:', brailleArray);
            
            // Fix common issues with the braille data
            const fixedArray = fixBrailleArrayData(brailleArray);
            
            // Log the fixed data
            console.log('Fixed braille data for Arduino:', fixedArray);
            
            // Call the original function with the fixed data
            return originalSendBrailleData.call(this, fixedArray);
        };
        
        // Add debug events listener
        if (bleController.on) {
            bleController.on('connect', function() {
                console.log('Arduino connected - sending test data to verify connection');
                // Send test data after a short delay
                setTimeout(() => {
                    sendTestPattern();
                }, 2000);
            });
        }
        
        console.log('Arduino BLE debugging and fixes initialized');
    }
    
    // Function to fix common issues with braille array data
    function fixBrailleArrayData(brailleArray) {
        // If the array is null, undefined, or empty, provide a default pattern
        if (!brailleArray || 
            (Array.isArray(brailleArray) && brailleArray.length === 0)) {
            console.warn('Empty braille data detected, using default pattern');
            return [1]; // Dot 1 raised as a default pattern
        }
        
        // If it's a nested array but outer array is empty
        if (Array.isArray(brailleArray) && brailleArray.length === 0) {
            return [1]; // Dot 1 raised as a default pattern
        }
        
        // If it's a nested array with empty inner arrays
        if (Array.isArray(brailleArray) && 
            Array.isArray(brailleArray[0]) && 
            brailleArray[0].length === 0) {
            return [1]; // Dot 1 raised as a default pattern
        }
        
        // Handle the case where the array doesn't contain valid dot numbers
        if (Array.isArray(brailleArray) && !brailleArray.some(dot => dot >= 1 && dot <= 6)) {
            // Check if this might be a bit array format and convert it
            if (brailleArray.every(item => item === 0 || item === 1)) {
                // Convert bit array format to dot position format
                const dotPositions = [];
                for (let i = 0; i < brailleArray.length; i++) {
                    if (brailleArray[i] === 1) {
                        dotPositions.push(i + 1);
                    }
                }
                if (dotPositions.length > 0) {
                    return dotPositions;
                }
            }
            return [1]; // Default fallback
        }
        
        // Return the original array if no fixes were needed
        return brailleArray;
    }
    
    // Function to send a test pattern to verify Arduino connectivity
    function sendTestPattern() {
        if (!window.bleController || !bleController.isConnected()) return;
        
        console.log('Sending test pattern to Arduino...');
        
        // Send each dot individually with a delay
        const testPatterns = [
            [1], // Dot 1
            [2], // Dot 2
            [3], // Dot 3
            [4], // Dot 4
            [5], // Dot 5
            [6], // Dot 6
            [1, 2, 3, 4, 5, 6] // All dots
        ];
        
        let index = 0;
        const sendNextPattern = () => {
            if (index < testPatterns.length) {
                const pattern = testPatterns[index];
                console.log(`Sending test pattern ${index + 1}/${testPatterns.length}:`, pattern);
                bleController.sendBrailleData(pattern);
                index++;
                setTimeout(sendNextPattern, 1000);
            } else {
                console.log('Test pattern sequence completed');
            }
        };
        
        sendNextPattern();
    }
    
    // Expose debugging functions to window for console access
    window.arduinoDebug = {
        sendTestPattern: sendTestPattern,
        fixBrailleData: fixBrailleArrayData,
        reinitialize: initializeArduinoDebug
    };
})();
