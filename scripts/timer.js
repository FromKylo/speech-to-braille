// Import configuration
const config = require('../config');

// ...existing code...

// Update countdown function to use config
function startIntroductionCountdown() {
    // Replace hardcoded value with config value
    startCountdown(config.timings.introductionPhase, 'intro-countdown');
}

function startListeningCountdown() {
    // Replace hardcoded value with config value
    startCountdown(config.timings.listeningPhase, 'listening-countdown');
}

function startOutputCountdown() {
    // Replace hardcoded value with config value
    startCountdown(config.timings.outputPhase, 'output-countdown');
}

// ...existing code...