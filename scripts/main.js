// Import configuration
const config = require('../config');

// Remove redundant timing logic as it has been moved to phase-controller.js

// Update introduction phase timing
function handleIntroductionPhase() {
    switchToListeningPhase();
    
    // ...existing code...
}

// Update listening phase timing
function handleListeningPhase() {
    const hasMatches = checkForMatches();
    
    if (!hasMatches && config.behavior.loopListeningIfNoMatch) {
        // Restart listening phase
        handleListeningPhase();
    } else {
        switchToOutputPhase();
    }
    
    // ...existing code...
}

// Update output phase timing
function handleOutputPhase() {
    resetAndStartAgain();
    
    // ...existing code...
}

// ...existing code...