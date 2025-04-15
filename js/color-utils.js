/**
 * Utility functions to help with color management across the Figma UI
 */

// Color mapping from hex codes to CSS variables
const colorMapping = {
  // Primary colors
  '#253781': 'var(--color-primary)',
  '#1D2C6A': 'var(--color-primary-dark)',
  '#3B4D99': 'var(--color-primary-light)',
  
  // Status colors
  '#419822': 'var(--color-success)',
  '#D97706': 'var(--color-warning)',
  '#AB1C1C': 'var(--color-error)',
  
  // Text colors
  '#000000': 'var(--text-primary)',
  '#374151': 'var(--text-secondary)',
  '#4B5563': 'var(--text-tertiary)',
  '#9CA3AF': 'var(--text-disabled)',
  '#FFFFFF': 'var(--text-inverse)',
  
  // Background colors
  '#F9FAFB': 'var(--background-secondary)',
  '#F3F4F6': 'var(--background-tertiary)',
  
  // Border colors
  '#E5E7EB': 'var(--border-default)',
};

/**
 * Converts a hex color code to its corresponding CSS variable if available
 * @param {string} hexColor - The hex color code (e.g., "#253781")
 * @return {string} - The CSS variable or original color if no mapping exists
 */
function getColorVariable(hexColor) {
  const normalizedColor = hexColor.toUpperCase();
  return colorMapping[normalizedColor] || hexColor;
}

/**
 * Checks if a color is close to the brand color
 * @param {string} hexColor - The hex color code to check
 * @return {boolean} - True if the color is similar to the brand color
 */
function isBrandColor(hexColor) {
  // Simple check if it's close to our primary blue
  if (hexColor.toLowerCase().includes('253781')) {
    return true;
  }
  
  // Could implement a more sophisticated color comparison here
  return false;
}

// Export functions if using modules
if (typeof module !== 'undefined') {
  module.exports = {
    getColorVariable,
    isBrandColor
  };
}
