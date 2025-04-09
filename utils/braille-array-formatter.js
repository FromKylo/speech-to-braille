/**
 * Formats braille array data for proper display in the web application
 * @param {string|Array} arrayData - The array string from the CSV file or parsed array
 * @return {string} Formatted array string for display
 */
function formatBrailleArrayForDisplay(arrayData) {
  // Handle case when we receive the actual array instead of string
  if (Array.isArray(arrayData)) {
    // Convert array back to string format for display
    if (Array.isArray(arrayData[0])) {
      // It's a nested array (for contractions)
      return '{{' + arrayData.map(subArray => subArray.join(',')).join('},{') + '}}';
    } else {
      // It's a simple array
      return '{' + arrayData.join(',') + '}';
    }
  }
  
  // If we received a string with quotes (from CSV), remove the quotes
  if (typeof arrayData === 'string' && arrayData.startsWith('"')) {
    arrayData = arrayData.slice(1, -1);
  }
  
  // Handle single-character braille cells (e.g., {1,2,3})
  if (arrayData.startsWith('{') && !arrayData.startsWith('{{')) {
    const numbers = arrayData.replace(/[{}]/g, '').split(',');
    return numbers.join('-');
  }
  
  // Handle multi-character braille contractions (e.g., {{1,2},{3,4}})
  if (arrayData.startsWith('{{')) {
    const cellGroups = arrayData.slice(1, -1).split('},{');
    const formattedGroups = cellGroups.map(group => {
      return group.replace(/[{}]/g, '').split(',').join('-');
    });
    return formattedGroups.join(' ');
  }
  
  return arrayData;
}

/**
 * Parses a braille array string from the CSV into a structured array
 * @param {string} arrayString - The array string from the CSV file
 * @return {Array} Parsed array of dot numbers
 */
function parseBrailleArray(arrayString) {
  // Remove quotes if present (from CSV)
  if (arrayString.startsWith('"') && arrayString.endsWith('"')) {
    arrayString = arrayString.slice(1, -1);
  }
  
  try {
    // Handle multi-character braille contractions (e.g., {{1,2},{3,4}})
    if (arrayString.startsWith('{{')) {
      const nestedArrays = [];
      // Match each inner array like {1,2} from a string like {{1,2},{3,4}}
      const matches = arrayString.match(/\{([^{}]+)\}/g);
      
      if (matches) {
        for (const match of matches) {
          // Extract values between brackets and split by comma
          const values = match
            .replace(/[{}]/g, '')
            .split(',')
            .map(val => parseInt(val.trim()))
            .filter(val => !isNaN(val));
          
          nestedArrays.push(values);
        }
      }
      
      return nestedArrays;
    } else {
      // If it's a simple array like {1,2,3}
      const values = arrayString
        .replace(/[{}]/g, '')
        .split(',')
        .map(val => parseInt(val.trim()))
        .filter(val => !isNaN(val));
      
      return values;
    }
  } catch (error) {
    console.error('Error parsing braille array:', arrayString, error);
    return [];
  }
}

/**
 * Converts the CSV array notation to a visual dot pattern
 * @param {string|Array} arrayData - The array string from the CSV file or parsed array
 * @return {string} A visual representation of the braille dots
 */
function convertArrayToVisualDots(arrayData) {
  // If we received a string, parse it first
  let dotsArray = Array.isArray(arrayData) ? arrayData : parseBrailleArray(arrayData);
  
  // Create a function to process a single cell
  function processSingleCell(dots) {
    // Standard braille dot numbering:
    // 1 4
    // 2 5
    // 3 6
    
    // Create a template with all dots filled
    let visualTemplate = [
      "⠿⠿", // Row 1: dots 1,4
      "⠿⠿", // Row 2: dots 2,5
      "⠿⠿"  // Row 3: dots 3,6
    ];
    
    // In a real implementation, you would modify this template
    // based on which dots are present in the array
    
    return visualTemplate.join("\n");
  }
  
  // Handle nested arrays (contractions) vs single cell
  if (Array.isArray(dotsArray[0])) {
    return dotsArray.map(processSingleCell).join(' ');
  } else {
    return processSingleCell(dotsArray);
  }
}

// Export the utility functions
module.exports = {
  formatBrailleArrayForDisplay,
  parseBrailleArray,
  convertArrayToVisualDots
};
