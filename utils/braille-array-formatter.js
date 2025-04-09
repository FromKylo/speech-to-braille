/**
 * Formats braille array data for proper display in the web application
 * @param {string} arrayString - The array string from the CSV file
 * @return {string} Formatted array string for display
 */
function formatBrailleArrayForDisplay(arrayString) {
  // Handle single-character braille cells (e.g., {1,2,3})
  if (arrayString.startsWith('{') && !arrayString.startsWith('{{')) {
    const numbers = arrayString.replace(/[{}]/g, '').split(',');
    return numbers.join('-');
  }
  
  // Handle multi-character braille contractions (e.g., {{1,2},{3,4}})
  if (arrayString.startsWith('{{')) {
    const cellGroups = arrayString.slice(1, -1).split('},{');
    const formattedGroups = cellGroups.map(group => {
      return group.replace(/[{}]/g, '').split(',').join('-');
    });
    return formattedGroups.join(' ');
  }
  
  return arrayString;
}

/**
 * Converts the CSV array notation to a visual dot pattern
 * @param {string} arrayString - The array string from the CSV file
 * @return {string} A visual representation of the braille dots
 */
function convertArrayToVisualDots(arrayString) {
  // Create a function to process a single cell
  function processSingleCell(cell) {
    const dots = cell.replace(/[{}]/g, '').split(',').map(Number);
    let visual = "⠿⠿\n⠿⠿\n⠿⠿";
    
    // Replace dots based on what's in the array (1-6)
    // Standard braille dot numbering:
    // 1 4
    // 2 5
    // 3 6
    
    // Implementation depends on how you want to visually represent the dots
    // This is just a placeholder for the concept
    
    return visual;
  }
  
  // Handle single cells vs contractions
  if (arrayString.startsWith('{{')) {
    const cells = arrayString.match(/\{[^}]*\}/g);
    return cells.map(processSingleCell).join(' ');
  } else {
    return processSingleCell(arrayString);
  }
}

module.exports = {
  formatBrailleArrayForDisplay,
  convertArrayToVisualDots
};
