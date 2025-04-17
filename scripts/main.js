// Import configuration
const config = require('../config');

// ...existing code...

// Update introduction phase timing
function handleIntroductionPhase() {
    // Replace hardcoded value of 10 seconds with config value
    const introTimer = setTimeout(() => {
        switchToListeningPhase();
    }, config.timings.introductionPhase * 1000);
    
    // ...existing code...
}

// Update listening phase timing
function handleListeningPhase() {
    // Replace hardcoded value of 3 seconds with config value
    const listenTimer = setTimeout(() => {
        const hasMatches = checkForMatches();
        
        if (!hasMatches && config.behavior.loopListeningIfNoMatch) {
            // Restart listening phase
            handleListeningPhase();
        } else {
            switchToOutputPhase();
        }
    }, config.timings.listeningPhase * 1000);
    
    // ...existing code...
}

// Update output phase timing
function handleOutputPhase() {
    // Replace hardcoded value of 7 seconds with config value
    const outputTimer = setTimeout(() => {
        resetAndStartAgain();
    }, config.timings.outputPhase * 1000);
    
    // ...existing code...
}

// ...existing code...