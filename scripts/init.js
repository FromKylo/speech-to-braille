// Import configuration
const config = require('../config');

// Initialize CSS variables from config when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Update CSS variables to match config
    document.documentElement.style.setProperty('--intro-phase-duration', `${config.timings.introductionPhase}s`);
    document.documentElement.style.setProperty('--listening-phase-duration', `${config.timings.listeningPhase}s`);
    document.documentElement.style.setProperty('--output-phase-duration', `${config.timings.outputPhase}s`);
});

// Make config globally available for browser JavaScript
window.speechToBrailleConfig = config;
