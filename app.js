// Import the configuration
const config = require('./config');
// ...existing code...

// Update introduction phase timing
function startIntroductionPhase() {
  console.log(`Starting introduction phase for ${config.timings.introductionPhase} seconds`);
  // Reset any previous speech recognition results
  const interimElement = document.getElementById('interim-text');
  const finalElement = document.getElementById('final-text');
  if (interimElement) interimElement.textContent = '';
  if (finalElement) finalElement.textContent = '';
  
  // ...existing code...
  setTimeout(() => {
    startListeningPhase();
  }, config.timings.introductionPhase * 1000);
}

// Update listening phase with looping capability
function startListeningPhase() {
  console.log(`Starting listening phase for ${config.timings.listeningPhase} seconds`);
  
  // Clear any previous interim text
  const interimElement = document.getElementById('interim-text');
  if (interimElement) {
    interimElement.textContent = '';
  }
  
  // Reset the mic level display
  const micLevelBar = document.getElementById('mic-level-bar');
  if (micLevelBar) {
    micLevelBar.style.width = '0%';
  }
  
  // Show a helpful indicator that we're listening
  setTimeout(() => {
    if (interimElement && !interimElement.textContent && 
        (!window.phaseControl || window.phaseControl.getCurrentPhase() === 'recording')) {
      interimElement.innerHTML = '<span class="interim-indicator">•••</span>';
    }
  }, 500);
  
  // ...existing code...
  
  try {
    speechRecognitionModule.listen(config.timings.listeningPhase, (result) => {
      const hasMatches = databaseModule.findMatchingWords(result);
      
      if (!hasMatches && config.behavior.loopListeningIfNoMatch) {
        console.log("No matching words found. Restarting listening phase.");
        startListeningPhase(); // Loop back to listening
      } else {
        startOutputPhase(result);
      }
    });
  } catch (err) {
    console.error("Speech recognition error:", err);
    // Handle the error gracefully by showing a message in the interim text
    if (interimElement) {
      interimElement.innerHTML = '<span style="color:#ea4335">Speech recognition error. Please try again.</span>';
    }
    // Restart after a delay to recover from errors
    setTimeout(startListeningPhase, 3000);
  }
}

// Update output phase timing
function startOutputPhase(recognizedText) {
  console.log(`Starting output phase for ${config.timings.outputPhase} seconds`);
  
  // Make sure we have the final text displayed
  const finalElement = document.getElementById('final-text');
  if (finalElement && recognizedText) {
    finalElement.textContent = recognizedText;
  }
  
  // Clear interim text when entering output phase
  const interimElement = document.getElementById('interim-text');
  if (interimElement) {
    interimElement.textContent = '';
  }
  
  // ...existing code...
  
  setTimeout(() => {
    // Return to ready state or restart the process
    startIntroductionPhase();
  }, config.timings.outputPhase * 1000);
}

// Enhanced function to process interim results for better visibility
function processInterimResult(interimText) {
  const interimElement = document.getElementById('interim-text');
  if (!interimElement) return;
  
  // Always show something during recording phase
  if (!interimText.trim()) {
    interimElement.innerHTML = '<span class="interim-indicator">•••</span>';
  } else {
    // Add visual highlighting to the latest word
    const words = interimText.trim().split(' ');
    if (words.length > 0) {
      const lastWord = words.pop();
      words.push(`<span class="highlight-word">${lastWord}</span>`);
      interimElement.innerHTML = words.join(' ');
    } else {
      interimElement.textContent = interimText;
    }
  }
  
  // Ensure the element is visible
  interimElement.style.display = 'block';
  interimElement.style.visibility = 'visible';
  interimElement.style.opacity = '1';
}

// ...existing code...