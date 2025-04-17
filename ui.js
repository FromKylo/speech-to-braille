const config = require('./config');

exports.displayIntroScreen = function() {
  document.getElementById('timer').textContent = `${config.timings.introductionPhase} seconds`;
  // ...existing code...
};

exports.displayListeningScreen = function() {
  document.getElementById('timer').textContent = `${config.timings.listeningPhase} seconds`;
  // ...existing code...
};

exports.displayOutputScreen = function() {
  document.getElementById('timer').textContent = `${config.timings.outputPhase} seconds`;
  // ...existing code...
};

exports.updateListeningLoop = function(attempt) {
  document.getElementById('listening-attempt').textContent = `Attempt ${attempt}`;
  // ...existing code...
};

// ...existing code...