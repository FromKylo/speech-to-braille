/**
 * BLE Controller Module for Speech to Braille
 * Handles Bluetooth Low Energy communication with Arduino devices
 */

const bleController = (function() {
    // BLE Device and service UUIDs
    const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
    const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
    
    // State variables
    let device = null;
    let server = null;
    let service = null;
    let characteristic = null;
    let isConnected = false;
    let isConnecting = false;
    let deviceName = '';
    let connectionCallbacks = [];
    
    // DOM elements for UI interaction
    let bleStatus = null;
    let connectBtn = null;
    let disconnectBtn = null;
    let scanBtn = null;
    let deviceList = null;
    let connectionInfo = null;
    
    // Initialize the BLE controller
    function init() {
        console.log('Initializing BLE controller...');
        
        // Check if Web Bluetooth API is supported
        if (!navigator.bluetooth) {
            console.warn('Web Bluetooth API is not supported on this browser');
            updateUIStatus('not-supported');
            return false;
        }
        
        // Initialize UI elements
        initUI();
        
        console.log('BLE controller initialized');
        return true;
    }
    
    // Initialize UI elements
    function initUI() {
        // Find UI elements
        bleStatus = document.getElementById('ble-status');
        connectBtn = document.getElementById('connect-btn');
        disconnectBtn = document.getElementById('disconnect-btn');
        scanBtn = document.getElementById('scan-btn');
        deviceList = document.getElementById('device-list');
        connectionInfo = document.getElementById('connection-info');
        
        // Set up event listeners if elements exist
        if (connectBtn) {
            connectBtn.addEventListener('click', connect);
        }
        
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', disconnect);
        }
        
        if (scanBtn) {
            scanBtn.addEventListener('click', scanDevices);
        }
        
        // Update initial UI state
        updateUIStatus('disconnected');
    }
    
    // Start device scanning
    async function scanDevices() {
        if (isConnecting) return;
        
        if (deviceList) {
            deviceList.innerHTML = '<li class="scanning">Scanning for devices...</li>';
        }
        
        updateUIStatus('scanning');
        
        try {
            console.log('Requesting Bluetooth device...');
            device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [SERVICE_UUID] },
                    { namePrefix: 'ESP32' },
                    { namePrefix: 'Arduino' }
                ],
                // Optional services to access
                optionalServices: [SERVICE_UUID]
            });
            
            deviceName = device.name || 'Unknown Device';
            console.log('Device selected:', deviceName);
            
            // Update UI with device
            if (deviceList) {
                deviceList.innerHTML = '';
                const li = document.createElement('li');
                li.className = 'device-item';
                li.innerHTML = `<span class="device-name">${deviceName}</span>
                                <span class="device-id">${device.id}</span>`;
                li.addEventListener('click', connect);
                deviceList.appendChild(li);
            }
            
            updateUIStatus('selected');
            
            // Auto connect if requested
            if (connectBtn.dataset.autoconnect === 'true') {
                connect();
            }
        } catch (error) {
            console.error('Error scanning for devices:', error);
            updateUIStatus('error', error.message);
            
            if (deviceList) {
                deviceList.innerHTML = `<li class="error">Error: ${error.message}</li>`;
            }
        }
    }
    
    // Connect to the selected device
    async function connect() {
        if (isConnected || isConnecting) return;
        
        if (!device) {
            console.warn('No device selected. Scan for devices first.');
            return;
        }
        
        isConnecting = true;
        updateUIStatus('connecting');
        
        try {
            console.log('Connecting to device:', deviceName);
            
            // Connect to the device
            server = await device.gatt.connect();
            console.log('Connected to GATT server');
            
            // Get the primary service
            service = await server.getPrimaryService(SERVICE_UUID);
            console.log('Got primary service');
            
            // Get the characteristic
            characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
            console.log('Got characteristic');
            
            // Set up disconnect event listener
            device.addEventListener('gattserverdisconnected', handleDisconnection);
            
            // Update state
            isConnected = true;
            isConnecting = false;
            updateUIStatus('connected');
            
            // Notify callbacks
            notifyConnectionCallbacks(true);
            
            // Send initial data
            await sendInitialData();
            
            return true;
        } catch (error) {
            console.error('Connection error:', error);
            isConnecting = false;
            updateUIStatus('error', error.message);
            
            // Notify callbacks
            notifyConnectionCallbacks(false, error);
            
            return false;
        }
    }
    
    // Handle device disconnection
    function handleDisconnection(event) {
        console.log('Device disconnected:', deviceName);
        
        // Clean up
        isConnected = false;
        server = null;
        service = null;
        characteristic = null;
        
        // Update UI
        updateUIStatus('disconnected');
        
        // Notify callbacks
        notifyConnectionCallbacks(false);
    }
    
    // Manually disconnect from device
    function disconnect() {
        if (!isConnected || !device) return;
        
        console.log('Disconnecting from device:', deviceName);
        
        // Disconnect from GATT server
        if (device.gatt && device.gatt.connected) {
            device.gatt.disconnect();
        }
        
        // Clean up will be handled by disconnection event handler
    }
    
    // Send data to the connected device
    async function sendData(data) {
        if (!isConnected || !characteristic) {
            console.warn('Not connected to a device');
            return false;
        }
        
        try {
            // Convert data to the format expected by the Arduino device
            const buffer = prepareDataForTransmission(data);
            
            // Write to the characteristic
            await characteristic.writeValue(buffer);
            console.log('Data sent successfully:', data);
            
            return true;
        } catch (error) {
            console.error('Error sending data:', error);
            return false;
        }
    }
    
    // Prepare data for transmission to Arduino
    function prepareDataForTransmission(data) {
        // Check data type
        if (typeof data === 'string') {
            // Convert string to ArrayBuffer
            const encoder = new TextEncoder();
            return encoder.encode(data);
        } else if (Array.isArray(data)) {
            // Handle array of numbers (Braille dots)
            if (Array.isArray(data[0])) {
                // 2D array (multiple cells)
                // Flatten and convert to Uint8Array
                const flatArray = data.flat();
                return new Uint8Array(flatArray);
            } else {
                // 1D array (single cell)
                return new Uint8Array(data);
            }
        } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
            // Already in correct format
            return data;
        } else {
            // Convert object to JSON string
            const jsonString = JSON.stringify(data);
            const encoder = new TextEncoder();
            return encoder.encode(jsonString);
        }
    }
    
    // Send initial data to the device after connection
    async function sendInitialData() {
        // Send app info and configuration
        const initialData = {
            appName: 'Speech to Braille',
            version: '1.0',
            mode: 'default'
        };
        
        return await sendData(initialData);
    }
    
    // Send Braille data to the device
    async function sendBrailleData(brailleArray) {
        console.log('Sending Braille data to device:', brailleArray);
        return await sendData(brailleArray);
    }
    
    // Update the current application phase on the device
    async function setPhase(phase) {
        if (!isConnected) return false;
        
        const phaseData = {
            type: 'phase',
            value: phase
        };
        
        return await sendData(phaseData);
    }
    
    // Register connection callback
    function onConnectionChange(callback) {
        if (typeof callback === 'function') {
            connectionCallbacks.push(callback);
        }
    }
    
    // Notify all connection callbacks
    function notifyConnectionCallbacks(connected, error = null) {
        connectionCallbacks.forEach(callback => {
            try {
                callback({
                    connected,
                    deviceName,
                    error: error ? error.message : null
                });
            } catch (callbackError) {
                console.error('Error in connection callback:', callbackError);
            }
        });
    }
    
    // Update the UI status
    function updateUIStatus(status, message = '') {
        if (bleStatus) {
            // Update status dot display
            const statusDot = bleStatus.querySelector('.status-dot');
            const statusLabel = bleStatus.querySelector('.status-label');
            
            if (statusDot && statusLabel) {
                // Remove all classes first
                statusDot.className = 'status-dot';
                
                switch (status) {
                    case 'connected':
                        statusDot.classList.add('online');
                        statusLabel.textContent = 'Connected: ' + deviceName;
                        break;
                    case 'disconnected':
                        statusDot.classList.add('offline');
                        statusLabel.textContent = 'Disconnected';
                        break;
                    case 'scanning':
                        statusDot.classList.add('blinking');
                        statusLabel.textContent = 'Scanning...';
                        break;
                    case 'connecting':
                        statusDot.classList.add('blinking');
                        statusLabel.textContent = 'Connecting...';
                        break;
                    case 'error':
                        statusDot.classList.add('offline');
                        statusLabel.textContent = 'Error: ' + message;
                        break;
                    case 'not-supported':
                        statusDot.classList.add('offline');
                        statusLabel.textContent = 'Bluetooth not supported';
                        break;
                    default:
                        statusDot.classList.add('unknown');
                        statusLabel.textContent = 'Unknown status';
                }
            }
        }
        
        // Update buttons
        if (connectBtn) {
            connectBtn.disabled = status === 'connecting' || status === 'connected' || status === 'not-supported';
        }
        
        if (disconnectBtn) {
            disconnectBtn.disabled = status !== 'connected';
        }
        
        if (scanBtn) {
            scanBtn.disabled = status === 'scanning' || status === 'connecting' || status === 'not-supported';
        }
        
        // Update connection info
        if (connectionInfo && status === 'connected') {
            connectionInfo.innerHTML = `
                <div><strong>Device:</strong> ${deviceName}</div>
                <div><strong>Status:</strong> Connected</div>
                <div><strong>ID:</strong> ${device ? device.id : 'Unknown'}</div>
            `;
            connectionInfo.classList.remove('hidden');
        } else if (connectionInfo) {
            connectionInfo.classList.add('hidden');
        }
    }
    
    // Check if a device is connected
    function getConnectionStatus() {
        return {
            isConnected,
            isConnecting,
            deviceName
        };
    }
    
    // Initialize on creation
    init();
    
    // Public API
    return {
        connect,
        disconnect,
        scanDevices,
        sendData,
        sendBrailleData,
        setPhase,
        isConnected: () => isConnected,
        getDevice: () => device,
        getConnectionStatus,
        onConnectionChange
    };
})();