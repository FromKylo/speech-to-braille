/**
 * Figma UI Style Applier
 * 
 * This script applies Figma UI styles to existing elements
 * based on their current classes and attributes.
 */

document.addEventListener('DOMContentLoaded', function() {
  // Apply button styles
  document.querySelectorAll('button').forEach(button => {
    if (!button.classList.contains('figma-button')) {
      button.classList.add('figma-button');
      
      if (button.classList.contains('action-button')) {
        button.classList.add('figma-button-primary');
      } else if (button.id === 'disconnect-ble-btn') {
        button.classList.add('figma-button-danger');
      } else if (button.id === 'start-speech-btn') {
        button.classList.add('figma-button-success');
      } else if (button.id === 'stop-speech-btn') {
        button.classList.add('figma-button-danger');
      } else if (button.id === 'speak-word-btn') {
        button.classList.add('figma-button-primary');
      } else {
        button.classList.add('figma-button-secondary');
      }
    }
  });
  
  // Apply card styles
  document.querySelectorAll('.card').forEach(card => {
    card.classList.add('figma-card');
  });
  
  // Apply status indicator styles
  document.querySelectorAll('.status-dot').forEach(dot => {
    dot.classList.add('figma-status-dot');
    
    if (dot.classList.contains('online')) {
      dot.classList.add('figma-status-online');
    } else if (dot.classList.contains('offline')) {
      dot.classList.add('figma-status-offline');
    } else if (dot.classList.contains('unknown')) {
      dot.classList.add('figma-status-warning');
    }
    
    if (dot.classList.contains('blinking')) {
      dot.classList.add('figma-animate-blink');
    }
  });
  
  // Apply progress bar styles
  document.querySelectorAll('.progress-bar').forEach(progressContainer => {
    progressContainer.classList.add('figma-progress-container');
    
    const progressBar = progressContainer.querySelector('.progress');
    if (progressBar) {
      progressBar.classList.add('figma-progress-bar');
    }
  });
  
  // Apply braille dot styles
  document.querySelectorAll('.braille-cell').forEach(cell => {
    cell.classList.add('figma-braille-cell');
    
    cell.querySelectorAll('.braille-dot').forEach(dot => {
      dot.classList.add('figma-braille-dot');
    });
  });
});
