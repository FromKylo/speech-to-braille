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
    
    // Service and characteristic UUIDs (must match Arduino code)
    const BRAILLE_SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
    const BRAILLE_CHAR_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
    
    // Event listeners
    const eventListeners = {
        'connect': [],
        'disconnect': [],
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
    
    // Helper function to convert braille array to a proper format for sending
    // The ESP32 expects a byte array with each element representing the state of a braille cell
    function prepareBrailleData(brailleArray) {
        // Handle nested arrays for multi-cell braille (contractions)
        if (Array.isArray(brailleArray) && Array.isArray(brailleArray[0])) {
            // Create a byte array where each byte represents a braille cell
            // In standard braille cells, we have dots 1-6, so we use bits 0-5 to represent them
            return new Uint8Array(brailleArray.map(cell => {
                let byte = 0;
                // Set bits for each dot in the cell
                for (const dot of cell) {
                    // Dots are 1-based (1-6), so we subtract 1 for 0-based bit position
                    if (dot >= 1 && dot <= 6) {
                        byte |= (1 << (dot - 1));
                    }
                }
                return byte;
            }));
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
            return new Uint8Array([byte]);
        }
        // Handle empty array
        else {
            return new Uint8Array([0]);
        }
    }
    
    // Send braille data to the ESP32
    async function sendBrailleData(brailleArray) {
        if (!isConnected || !brailleCharacteristic) {
            console.warn('Not connected to BLE device');
            return false;
        }
        
        try {
            // Prepare the braille data
            const dataToSend = prepareBrailleData(brailleArray);
            
            // Log the data being sent
            console.log('Sending braille data:', dataToSend);
            
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