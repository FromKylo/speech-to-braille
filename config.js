/**
 * Application Configuration
 * 
 * This file contains all configurable parameters for the application.
 * Edit these values to adjust timing and behavior.
 */

const config = {
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

// Make config work in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
} else {
  // In browser context
  window.config = config;
}
