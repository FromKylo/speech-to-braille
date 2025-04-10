// Initialize BLE controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get UI elements
    const bleStatusElement = document.getElementById('ble-status');
    const connectBleBtn = document.getElementById('connect-ble-btn');
    const disconnectBleBtn = document.getElementById('disconnect-ble-btn');
    const bleMessageElement = document.getElementById('ble-message');
    
    // Initialize BLE controller if it exists
    if (window.bleController) {
        console.log('Initializing BLE controller UI');
        
        // Set up button event listeners
        connectBleBtn.addEventListener('click', async function() {
            bleMessageElement.textContent = 'Connecting to Braille device...';
            
            try {
                const success = await bleController.connect();
                if (success) {
                    updateBleConnectionUI(true);
                } else {
                    bleMessageElement.textContent = 'Failed to connect to device. Please try again.';
                }
            } catch (error) {
                console.error('Error connecting to BLE device:', error);
                bleMessageElement.textContent = `Error: ${error.message}`;
            }
        });
        
        disconnectBleBtn.addEventListener('click', async function() {
            try {
                await bleController.disconnect();
                updateBleConnectionUI(false);
            } catch (error) {
                console.error('Error disconnecting from BLE device:', error);
            }
        });
        
        // Set up event listeners for BLE events
        bleController.on('connect', function(data) {
            updateBleConnectionUI(true);
            bleMessageElement.textContent = `Connected to ${data.device}`;
            
            // Notify user about the connection
            if (window.textToSpeech) {
                window.textToSpeech.speak('Connected to Braille device');
            }
        });
        
        bleController.on('disconnect', function() {
            updateBleConnectionUI(false);
            bleMessageElement.textContent = 'Disconnected from Braille device';
        });
        
        bleController.on('error', function(data) {
            bleStatusElement.className = 'status offline';
            bleStatusElement.textContent = 'Error';
            bleMessageElement.textContent = data.message;
        });
        
        // Function to update UI based on connection state
        function updateBleConnectionUI(isConnected) {
            if (isConnected) {
                bleStatusElement.className = 'status online';
                bleStatusElement.textContent = 'Connected';
                connectBleBtn.style.display = 'none';
                disconnectBleBtn.style.display = 'block';
            } else {
                bleStatusElement.className = 'status offline';
                bleStatusElement.textContent = 'Not Connected';
                connectBleBtn.style.display = 'block';
                disconnectBleBtn.style.display = 'none';
                bleMessageElement.textContent = '';
            }
        }
        
        // Check if Web Bluetooth is supported
        if (!navigator.bluetooth) {
            bleStatusElement.className = 'status offline';
            bleStatusElement.textContent = 'Not Supported';
            connectBleBtn.disabled = true;
            bleMessageElement.textContent = 'Web Bluetooth is not supported in this browser. Try Chrome or Edge.';
        }
        
        // Initialize UI based on current connection state
        updateBleConnectionUI(bleController.isConnected());
    } else {
        console.error('BLE controller not found');
        bleStatusElement.className = 'status offline';
        bleStatusElement.textContent = 'Not Available';
        connectBleBtn.disabled = true;
        bleMessageElement.textContent = 'BLE controller module is not loaded.';
    }
});