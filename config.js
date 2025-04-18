/**
 * Global Configuration for Speech to Braille Application
 * 
 * This file contains settings that are used across different components.
 * Edit these values to adjust application behavior.
 */

window.config = {
    // Timing settings for application phases (in seconds)
    timings: {
        introductionPhase: 12,
        listeningPhase: 4,
        outputPhase: 8
    },
    
    // Behavioral settings
    behavior: {
        loopListeningIfNoMatch: true,
        autoPronounceOnMatch: true,
        debugMode: true,
        processInterimResults: true,    // Process partial speech results
        interimResultDelay: 600,        // Milliseconds to wait before processing interim results
        minimumInterimWordLength: 2     // Minimum length of words to process from interim results
    },
    
    // Speech recognition settings
    speech: {
        preferOnlineRecognition: true,
        fallbackToOffline: true,
        language: 'en-US',
        continuous: true
    },
    
    // Arduino settings for BLE communication
    arduino: {
        serviceUUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
        characteristicUUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8"
    }
};

// Log that config is loaded
console.log('Configuration loaded:', window.config);
