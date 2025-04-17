// Import the configuration
const config = require('./config');
// ...existing code...

// Update introduction phase timing
function startIntroductionPhase() {
  console.log(`Starting introduction phase for ${config.timings.introductionPhase} seconds`);
  // ...existing code...
  setTimeout(() => {
    startListeningPhase();
  }, config.timings.introductionPhase * 1000);
}

// Update listening phase with looping capability
function startListeningPhase() {
  console.log(`Starting listening phase for ${config.timings.listeningPhase} seconds`);
  // ...existing code...
  
  speechRecognitionModule.listen(config.timings.listeningPhase, (result) => {
    const hasMatches = databaseModule.findMatchingWords(result);
    
    if (!hasMatches && config.behavior.loopListeningIfNoMatch) {
      console.log("No matching words found. Restarting listening phase.");
      startListeningPhase(); // Loop back to listening
    } else {
      startOutputPhase(result);
    }
  });
}

// Update output phase timing
function startOutputPhase(recognizedText) {
  console.log(`Starting output phase for ${config.timings.outputPhase} seconds`);
  // ...existing code...
  
  setTimeout(() => {
    // Return to ready state or restart the process
    startIntroductionPhase();
  }, config.timings.outputPhase * 1000);
}

// ...existing code...