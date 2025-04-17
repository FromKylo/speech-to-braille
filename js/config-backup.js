/**
 * Application Configuration
 * 
 * This file contains all configurable parameters for the application.
 * Edit these values to adjust timing and behavior.
 */

// Define config right away to ensure it exists
window.config = {
  // Timing parameters (in seconds)
  timings: {
    introductionPhase: 10,    // Duration of introduction phase
    listeningPhase: 3,        // Duration of listening for speech input
    outputPhase: 7,           // Duration of displaying output
  },
  
  // Behavior settings
  behavior: {
    loopListeningIfNoMatch: true,  // Whether to loop listening phase if no words match database
  }
};

// Log that config has been loaded
console.log('Config loaded:', window.config);

// Also support CommonJS for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.config;
}
