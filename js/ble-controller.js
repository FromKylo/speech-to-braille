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
                // Use 2-byte format with 6-bit representation (phase byte + empty dots byte)
                const phaseValue = (phase === 'output') ? PHASE_OUTPUT : PHASE_NOT_OUTPUT;
                const byteArray = new Uint8Array([phaseValue, 0x00]); // Second byte is all dots lowered
                
                console.log('Sending phase update to Arduino using 2-byte format:', 
                    Array.from(byteArray).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
                await brailleCharacteristic.writeValue(byteArray);
                
                // If not in output phase, ensure braille display is cleared
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
    // The ESP32 expects a 2-byte format: phase byte + 6-bit data byte (one per cell)
    function prepareBrailleData(brailleArray, includePhase = true) {
        let cellByte = 0;
        
        // Handle nested arrays for multi-cell braille (contractions)
        if (Array.isArray(brailleArray) && Array.isArray(brailleArray[0])) {
            // Only use the first cell to avoid sending more than 2 bytes
            const cell = brailleArray[0];
            // Set bits for each dot in the cell
            for (const dot of cell) {
                // Dots are 1-based (1-6), so we subtract 1 for 0-based bit position
                if (dot >= 1 && dot <= 6) {
                    cellByte |= (1 << (dot - 1));
                }
            }
            console.log('Using only first cell from multi-cell array:', cell);
        } 
        // Handle single cell braille
        else if (Array.isArray(brailleArray)) {
            // Set bits for each dot in the cell
            for (const dot of brailleArray) {
                if (dot >= 1 && dot <= 6) {
                    cellByte |= (1 << (dot - 1));
                }
            }
        }
        
        // Always return exactly 2 bytes: phase byte + cell byte
        const phaseValue = (currentPhase === 'output') ? PHASE_OUTPUT : PHASE_NOT_OUTPUT;
        return new Uint8Array([phaseValue, cellByte]);
    }
    
    // Add these properties to the class or module
    const pendingTransmissions = new Map(); // To track messages waiting for acknowledgment
    let averageLatency = 0;
    let transmissionCount = 0;
    let lastLatency = 0;
    let maxLatency = 0;
    let minLatency = Number.MAX_VALUE;

    /**
     * Send braille data to the ESP32 using only the 6-bit format
     * @param {Array} brailleArray - Array of dot indices that should be raised
     * @returns {Promise<boolean>} - Whether the transmission was successful
     */
    function sendBrailleData(brailleArray) {
        // Convert braille array to 2-byte packed format (phase + 6 bits)
        const byteArray = prepareBrailleData(brailleArray);
        
        console.log('Sending braille data using 2-byte format:', 
            Array.from(byteArray).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
            'Binary for dots:', (byteArray.length > 1 ? 
                byteArray[1].toString(2).padStart(6, '0') : '000000'));
        
        if (isConnected && brailleCharacteristic) {
            return brailleCharacteristic.writeValue(byteArray)
                .then(() => {
                    console.log('Braille data sent successfully in 6-bit format');
                    return true;
                })
                .catch(error => {
                    console.error('Error sending braille data to BLE:', error);
                    return false;
                });
        }
        return Promise.resolve(false);
    }

    /**
     * Set up the notification handler to receive acknowledgments
     */
    function setupNotificationHandler(characteristic) {
        // ... existing code ...
        
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            try {
                const decoder = new TextDecoder();
                const value = decoder.decode(event.target.value);
                
                // Try to parse as JSON
                try {
                    const data = JSON.parse(value);
                    
                    // Check if this is an acknowledgment
                    if (data.type === 'ACK' && data.id) {
                        handleAcknowledgment(data);
                    }
                    
                    // Dispatch event for other components to use
                    dispatchBLEEvent('data', data);
                } catch (jsonError) {
                    console.log('Received non-JSON data:', value);
                    // Handle as plain text/binary data
                    dispatchBLEEvent('data', value);
                }
            } catch (error) {
                console.error('Error handling BLE notification:', error);
            }
        });
        
        // ... existing code ...
    }

    /**
     * Handle acknowledgment messages from the ESP32
     */
    function handleAcknowledgment(ackData) {
        const messageId = ackData.id;
        const transmission = pendingTransmissions.get(messageId);
        
        if (!transmission) {
            console.warn(`Received acknowledgment for unknown message: ${messageId}`);
            return;
        }
        
        // Calculate the round-trip time
        const roundTripTime = Date.now() - transmission.sentTime;
        
        // Calculate the one-way latency from device processing information
        let oneWayLatency = null;
        if (ackData.deviceProcessingTime !== undefined) {
            oneWayLatency = Math.round(roundTripTime / 2);
        } else {
            oneWayLatency = roundTripTime; // Fall back to round trip if no processing time available
        }
        
        // Update statistics
        lastLatency = oneWayLatency;
        maxLatency = Math.max(maxLatency, oneWayLatency);
        minLatency = Math.min(minLatency, oneWayLatency);
        
        // Update rolling average
        transmissionCount++;
        averageLatency = averageLatency + (oneWayLatency - averageLatency) / transmissionCount;
        
        console.log(`Message ${messageId} acknowledged. Latency: ${oneWayLatency}ms, Device processing time: ${ackData.deviceProcessingTime}ms`);
        
        // Dispatch a latency event for UI updates
        dispatchBLEEvent('latency', {
            messageId: messageId,
            latency: oneWayLatency,
            roundTrip: roundTripTime,
            deviceProcessing: ackData.deviceProcessingTime,
            average: averageLatency,
            max: maxLatency,
            min: minLatency,
            count: transmissionCount
        });
        
        // Remove from pending and resolve the promise
        pendingTransmissions.delete(messageId);
        transmission.resolve(true);
    }

    /**
     * Get the latest latency statistics
     */
    function getLatencyStats() {
        return {
            last: lastLatency,
            average: averageLatency,
            max: maxLatency,
            min: minLatency === Number.MAX_VALUE ? 0 : minLatency,
            count: transmissionCount
        };
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
        },

        // Get latency statistics
        getLatencyStats: function() {
            return getLatencyStats();
        }
    };
})();

// Export the BLE controller
window.bleController = bleController;

console.log('BLE Controller module loaded.');