/**
 * BLE Controller for Speech to Braille App
 * 
 * This module handles Bluetooth Low Energy (BLE) communication with the Arduino Nano ESP32.
 * It sends braille array data from the web app to the ESP32 for physical braille output.
 */

// Create a namespace for our BLE functionality
const bleController = (function() {
    // BLE device and characteristic references
    let bleDevice = null;
    let bleServer = null;
    let brailleService = null;
    let brailleCharacteristic = null;
    
    // Connection status
    let isConnected = false;
    
    // Current app phase
    let currentPhase = 'introduction'; // 'introduction', 'recording', or 'output'
    
    // Phase constants (must match Arduino code)
    const PHASE_NOT_OUTPUT = 0;
    const PHASE_OUTPUT = 1;
    
    // Service and characteristic UUIDs (must match Arduino code)
    const BRAILLE_SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
    const BRAILLE_CHAR_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
    
    // Event listeners
    const eventListeners = {
        'connect': [],
        'disconnect': [],
        'error': [],
        'phaseChange': []
    };
    
    // Helper function to trigger events
    function triggerEvent(eventName, data) {
        if (eventListeners[eventName]) {
            for (const callback of eventListeners[eventName]) {
                callback(data);
            }
        }
    }
    
    // Connect to BLE device
    async function connect() {
        if (isConnected) {
            console.log('Already connected to BLE device');
            return true;
        }
        
        if (!navigator.bluetooth) {
            console.error('Web Bluetooth API is not available in this browser or context');
            triggerEvent('error', { message: 'Web Bluetooth not supported' });
            return false;
        }
        
        try {
            console.log('Requesting BLE device...');
            
            // Request the BLE device with the braille service
            bleDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [BRAILLE_SERVICE_UUID] },
                    { namePrefix: 'Braille' }
                ]
            });
            
            // Setup disconnect listener
            bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
            
            // Connect to GATT server
            console.log('Connecting to GATT server...');
            bleServer = await bleDevice.gatt.connect();
            
            // Get the braille service
            console.log('Getting braille service...');
            brailleService = await bleServer.getPrimaryService(BRAILLE_SERVICE_UUID);
            
            // Get the braille characteristic
            console.log('Getting braille characteristic...');
            brailleCharacteristic = await brailleService.getCharacteristic(BRAILLE_CHAR_UUID);
            
            isConnected = true;
            console.log('Connected to braille BLE device!');
            
            // Trigger connect event
            triggerEvent('connect', { device: bleDevice.name || 'Braille Device' });
            
            return true;
            
        } catch (error) {
            console.error('Error connecting to BLE device:', error);
            triggerEvent('error', { message: error.message });
            return false;
        }
    }
    
    // Handle disconnection
    function onDisconnected() {
        isConnected = false;
        console.log('BLE device disconnected');
        triggerEvent('disconnect', {});
    }
    
    // Disconnect from BLE device
    async function disconnect() {
        if (!isConnected || !bleDevice) {
            return;
        }
        
        if (bleDevice.gatt.connected) {
            bleDevice.gatt.disconnect();
        }
        
        isConnected = false;
        console.log('Disconnected from BLE device');
    }
    
    // Set the current phase and notify Arduino
    async function setPhase(phase) {
        console.log('Setting phase:', phase);
        currentPhase = phase;
        
        // Notify Arduino of phase change if connected
        if (isConnected && brailleCharacteristic) {
            try {
                // Create a byte array with just the phase indicator
                const phaseValue = (phase === 'output') ? PHASE_OUTPUT : PHASE_NOT_OUTPUT;
                const phaseData = new Uint8Array([phaseValue]);
                
                console.log('Sending phase update to Arduino:', phaseValue);
                await brailleCharacteristic.writeValue(phaseData);
                
                // If not in output phase, clear braille display
                if (phase !== 'output') {
                    console.log('Not in output phase - ensuring dots are lowered');
                }
                
                // Trigger phase change event
                triggerEvent('phaseChange', { phase: phase });
                
                return true;
            } catch (error) {
                console.error('Error sending phase update:', error);
                return false;
            }
        }
        
        // Still trigger event even if not connected
        triggerEvent('phaseChange', { phase: phase });
        return isConnected;
    }
    
    // Helper function to convert braille array to a proper format for sending
    // The ESP32 expects a byte array with each element representing the state of a braille cell
    function prepareBrailleData(brailleArray, includePhase = true) {
        let cellBytes = [];
        
        // Handle nested arrays for multi-cell braille (contractions)
        if (Array.isArray(brailleArray) && Array.isArray(brailleArray[0])) {
            // Convert each cell to a byte
            cellBytes = brailleArray.map(cell => {
                let byte = 0;
                // Set bits for each dot in the cell
                for (const dot of cell) {
                    // Dots are 1-based (1-6), so we subtract 1 for 0-based bit position
                    if (dot >= 1 && dot <= 6) {
                        byte |= (1 << (dot - 1));
                    }
                }
                return byte;
            });
        } 
        // Handle single cell braille
        else if (Array.isArray(brailleArray)) {
            let byte = 0;
            // Set bits for each dot in the cell
            for (const dot of brailleArray) {
                if (dot >= 1 && dot <= 6) {
                    byte |= (1 << (dot - 1));
                }
            }
            cellBytes = [byte];
        }
        // Handle empty array
        else {
            cellBytes = [0];
        }
        
        // If including phase (default), add phase byte at the beginning
        if (includePhase) {
            const phaseValue = (currentPhase === 'output') ? PHASE_OUTPUT : PHASE_NOT_OUTPUT;
            return new Uint8Array([phaseValue, ...cellBytes]);
        } else {
            return new Uint8Array(cellBytes);
        }
    }
    
    // Send braille data to the ESP32
    async function sendBrailleData(brailleArray) {
        if (!isConnected || !brailleCharacteristic) {
            console.warn('Not connected to BLE device');
            return false;
        }
        
        try {
            // Prepare the braille data with phase information
            const dataToSend = prepareBrailleData(brailleArray);
            
            // Log the data being sent
            console.log('Sending braille data:', Array.from(dataToSend));
            
            // Write to the characteristic
            await brailleCharacteristic.writeValue(dataToSend);
            
            console.log('Braille data sent successfully');
            return true;
            
        } catch (error) {
            console.error('Error sending braille data:', error);
            triggerEvent('error', { message: error.message });
            return false;
        }
    }
    
    // Public API
    return {
        // Check connection status
        isConnected: function() {
            return isConnected;
        },
        
        // Connect to BLE device
        connect: async function() {
            return await connect();
        },
        
        // Disconnect from BLE device
        disconnect: async function() {
            await disconnect();
        },
        
        // Set the current phase
        setPhase: async function(phase) {
            return await setPhase(phase);
        },
        
        // Get the current phase
        getPhase: function() {
            return currentPhase;
        },
        
        // Send braille data
        sendBrailleData: async function(brailleArray) {
            return await sendBrailleData(brailleArray);
        },
        
        // Register event listener
        on: function(eventName, callback) {
            if (eventListeners[eventName]) {
                eventListeners[eventName].push(callback);
            }
            return this;
        }
    };
})();

// Export the BLE controller
window.bleController = bleController;

console.log('BLE Controller module loaded.');