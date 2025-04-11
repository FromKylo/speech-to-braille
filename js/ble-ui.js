// Initialize BLE controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get UI elements
    const bleStatusElement = document.getElementById('ble-status');
    const connectBleBtn = document.getElementById('connect-ble-btn');
    const disconnectBleBtn = document.getElementById('disconnect-ble-btn');
    const bleMessageElement = document.getElementById('ble-message');
    
    // Get the new connection status indicators
    const webStatusDot = document.getElementById('web-status-dot');
    const webStatusText = document.getElementById('web-status-text');
    const arduinoStatusDot = document.getElementById('arduino-status-dot');
    const arduinoStatusText = document.getElementById('arduino-status-text');
    
    // Initialize BLE controller if it exists
    if (window.bleController) {
        console.log('Initializing BLE controller UI');
        
        // Set up button event listeners
        connectBleBtn.addEventListener('click', async function() {
            bleMessageElement.textContent = 'Connecting to Arduino...';
            
            try {
                // Update web app status to "Connecting"
                updateWebStatus('connecting');
                
                const success = await bleController.connect();
                if (success) {
                    updateConnectionUI(true);
                } else {
                    updateWebStatus('failed');
                    updateArduinoStatus('unknown');
                    bleMessageElement.textContent = 'Failed to connect to Arduino. Please try again.';
                }
            } catch (error) {
                console.error('Error connecting to BLE device:', error);
                updateWebStatus('error');
                updateArduinoStatus('unknown');
                bleMessageElement.textContent = `Error: ${error.message}`;
            }
        });
        
        disconnectBleBtn.addEventListener('click', async function() {
            try {
                await bleController.disconnect();
                updateConnectionUI(false);
            } catch (error) {
                console.error('Error disconnecting from BLE device:', error);
            }
        });
        
        // Set up event listeners for BLE events
        bleController.on('connect', function(data) {
            updateConnectionUI(true);
            bleMessageElement.textContent = `Connected to ${data.device}`;
            
            // Notify user about the connection
            if (window.textToSpeech) {
                window.textToSpeech.speak('Connected to Arduino');
            }
        });
        
        bleController.on('disconnect', function() {
            updateConnectionUI(false);
            bleMessageElement.textContent = 'Disconnected from Arduino';
        });
        
        bleController.on('error', function(data) {
            updateWebStatus('error');
            updateArduinoStatus('unknown');
            bleStatusElement.className = 'status offline';
            bleStatusElement.textContent = 'Error';
            bleMessageElement.textContent = data.message;
        });
        
        // Function to update connection status indicators
        function updateWebStatus(status) {
            switch(status) {
                case 'connected':
                    webStatusDot.className = 'status-dot online';
                    webStatusText.textContent = 'Connected';
                    break;
                case 'connecting':
                    webStatusDot.className = 'status-dot unknown blinking';
                    webStatusText.textContent = 'Connecting...';
                    break;
                case 'error':
                    webStatusDot.className = 'status-dot offline';
                    webStatusText.textContent = 'Error';
                    break;
                case 'failed':
                    webStatusDot.className = 'status-dot offline';
                    webStatusText.textContent = 'Connection Failed';
                    break;
                default: // offline
                    webStatusDot.className = 'status-dot offline';
                    webStatusText.textContent = 'Not Connected';
            }
        }
        
        function updateArduinoStatus(status) {
            switch(status) {
                case 'connected':
                    arduinoStatusDot.className = 'status-dot online';
                    arduinoStatusText.textContent = 'Connected (LED ON)';
                    break;
                case 'error':
                    arduinoStatusDot.className = 'status-dot offline';
                    arduinoStatusText.textContent = 'Error';
                    break;
                case 'unknown':
                    arduinoStatusDot.className = 'status-dot unknown blinking';
                    arduinoStatusText.textContent = 'Unknown';
                    break;
                default: // offline
                    arduinoStatusDot.className = 'status-dot offline';
                    arduinoStatusText.textContent = 'Not Connected (LED Blinking)';
            }
        }
        
        // Function to update full UI based on connection state
        function updateConnectionUI(isConnected) {
            if (isConnected) {
                updateWebStatus('connected');
                updateArduinoStatus('connected');
                
                bleStatusElement.className = 'status online';
                bleStatusElement.textContent = 'Connected';
                connectBleBtn.style.display = 'none';
                disconnectBleBtn.style.display = 'block';
            } else {
                updateWebStatus('offline');
                updateArduinoStatus('offline');
                
                bleStatusElement.className = 'status offline';
                bleStatusElement.textContent = 'Not Connected';
                connectBleBtn.style.display = 'block';
                disconnectBleBtn.style.display = 'none';
                bleMessageElement.textContent = '';
            }
        }
        
        // Check if Web Bluetooth is supported
        if (!navigator.bluetooth) {
            updateWebStatus('error');
            updateArduinoStatus('unknown');
            
            bleStatusElement.className = 'status offline';
            bleStatusElement.textContent = 'Not Supported';
            connectBleBtn.disabled = true;
            bleMessageElement.textContent = 'Web Bluetooth is not supported in this browser. Try Chrome or Edge.';
        }
        
        // Initialize UI based on current connection state
        updateConnectionUI(bleController.isConnected());
    } else {
        console.error('BLE controller not found');
        
        // Update status indicators if elements exist
        if (webStatusDot && webStatusText) {
            webStatusDot.className = 'status-dot offline';
            webStatusText.textContent = 'Not Available';
        }
        
        if (arduinoStatusDot && arduinoStatusText) {
            arduinoStatusDot.className = 'status-dot offline';
            arduinoStatusText.textContent = 'Not Available';
        }
        
        bleStatusElement.className = 'status offline';
        bleStatusElement.textContent = 'Not Available';
        connectBleBtn.disabled = true;
        bleMessageElement.textContent = 'BLE controller module is not loaded.';
    }
});