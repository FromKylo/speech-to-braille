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
  
  // Apply brand color to headings with the primary color
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    const computedStyle = window.getComputedStyle(heading);
    const color = computedStyle.getPropertyValue('color');
    
    // If the heading has a blue color similar to our brand color
    // Note: This is a simplified check, ideally we'd use the color-utils.js here
    if (color.includes('rgb(37, 55, 129)') || color.includes('#253781')) {
      heading.style.color = 'var(--color-primary)';
    }
  });
  
  // Apply theme colors to various elements
  applyThemeColors();
});

/**
 * Applies theme colors to elements based on their context
 */
function applyThemeColors() {
  // Header backgrounds
  document.querySelectorAll('.heading-wrapper, [class*="header"], nav').forEach(el => {
    const computedStyle = window.getComputedStyle(el);
    const bgColor = computedStyle.getPropertyValue('background-color');
    
    // If it's blue-ish, use our primary color
    if (bgColor.includes('rgb(37, 55, 129)') || bgColor.includes('rgb(24, 160, 251)')) {
      el.style.backgroundColor = 'var(--color-primary)';
    }
  });
  
  // Success elements
  document.querySelectorAll('[class*="success"]').forEach(el => {
    el.style.color = 'var(--color-success)';
  });
  
  // Warning elements
  document.querySelectorAll('[class*="warning"]').forEach(el => {
    el.style.color = 'var(--color-warning)';
  });
  
  // Error elements
  document.querySelectorAll('[class*="error"]').forEach(el => {
    el.style.color = 'var(--color-error)';
  });
}
