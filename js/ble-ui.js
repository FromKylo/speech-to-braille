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

    createLatencyDisplay();
});

/**
 * Create and update the BLE latency statistics display
 */
function createLatencyDisplay() {
    const bleConnectionSection = document.getElementById('ble-connection');
    if (!bleConnectionSection) return;
    
    // Check if the latency display already exists
    let latencyDisplay = document.getElementById('ble-latency-stats');
    
    if (!latencyDisplay) {
        // Create the display if it doesn't exist
        latencyDisplay = document.createElement('div');
        latencyDisplay.id = 'ble-latency-stats';
        latencyDisplay.className = 'ble-latency-stats';
        latencyDisplay.innerHTML = `
            <h4>BLE Transmission Stats</h4>
            <table class="latency-table">
                <tr>
                    <td>Last Latency:</td>
                    <td id="last-latency">--</td>
                </tr>
                <tr>
                    <td>Average:</td>
                    <td id="avg-latency">--</td>
                </tr>
                <tr>
                    <td>Min / Max:</td>
                    <td id="min-max-latency">--</td>
                </tr>
                <tr>
                    <td>Transmissions:</td>
                    <td id="transmission-count">0</td>
                </tr>
            </table>
        `;
        
        // Add to the troubleshooting section instead of connection section
        const troubleshootingSection = document.getElementById('troubleshooting-section');
        if (troubleshootingSection) {
            // Check if there's a BLE details section, or create one
            let bleDetails = troubleshootingSection.querySelector('details[data-section="ble"]');
            
            if (!bleDetails) {
                bleDetails = document.createElement('details');
                bleDetails.setAttribute('data-section', 'ble');
                bleDetails.innerHTML = `
                    <summary>BLE Performance</summary>
                    <div class="details-content"></div>
                `;
                troubleshootingSection.querySelector('.card').appendChild(bleDetails);
            }
            
            bleDetails.querySelector('.details-content').appendChild(latencyDisplay);
        } else {
            // Fallback to connection section if troubleshooting not found
            bleConnectionSection.appendChild(latencyDisplay);
        }
    }
    
    // Listen for latency events
    document.addEventListener('ble-event', (event) => {
        if (event.detail.type === 'latency') {
            updateLatencyStats(event.detail.data);
        }
    });
    
    // Set up periodic updates
    setInterval(updateLatencyStatsFromController, 1000);
}

/**
 * Update the latency statistics display
 */
function updateLatencyStats(stats) {
    const lastLatencyElement = document.getElementById('last-latency');
    const avgLatencyElement = document.getElementById('avg-latency');
    const minMaxLatencyElement = document.getElementById('min-max-latency');
    const countElement = document.getElementById('transmission-count');
    
    if (lastLatencyElement) {
        lastLatencyElement.textContent = stats.latency ? `${stats.latency} ms` : '--';
    }
    
    if (avgLatencyElement) {
        avgLatencyElement.textContent = stats.average ? `${Math.round(stats.average)} ms` : '--';
    }
    
    if (minMaxLatencyElement) {
        minMaxLatencyElement.textContent = (stats.min && stats.max) ? 
            `${stats.min} / ${stats.max} ms` : '--';
    }
    
    if (countElement) {
        countElement.textContent = stats.count || 0;
    }
}

/**
 * Update latency stats from controller data
 */
function updateLatencyStatsFromController() {
    if (window.bleController && typeof bleController.getLatencyStats === 'function') {
        const stats = bleController.getLatencyStats();
        
        const lastLatencyElement = document.getElementById('last-latency');
        const avgLatencyElement = document.getElementById('avg-latency');
        const minMaxLatencyElement = document.getElementById('min-max-latency');
        const countElement = document.getElementById('transmission-count');
        
        if (lastLatencyElement) {
            lastLatencyElement.textContent = stats.last ? `${stats.last} ms` : '--';
        }
        
        if (avgLatencyElement) {
            avgLatencyElement.textContent = stats.average ? `${Math.round(stats.average)} ms` : '--';
        }
        
        if (minMaxLatencyElement) {
            minMaxLatencyElement.textContent = 
                `${stats.min} / ${stats.max} ms`;
        }
        
        if (countElement) {
            countElement.textContent = stats.count || 0;
        }
    }
}