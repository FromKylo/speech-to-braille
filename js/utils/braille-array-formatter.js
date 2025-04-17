/**
 * Braille Array Formatter Utility
 * 
 * Provides formatting options for Braille dot arrays to improve readability
 * in the user interface and for debugging.
 */

const brailleArrayFormatter = (function() {
    // Format options
    const FORMAT_TYPES = {
        JSON: 'json',
        DOTS: 'dots',
        BINARY: 'binary',
        PRETTY: 'pretty',
        COMPACT: 'compact'
    };
    
    // Default format type
    let defaultFormat = FORMAT_TYPES.PRETTY;
    
    // Format a Braille array based on the specified format type
    function format(array, formatType = defaultFormat) {
        if (!array) return '[]';
        
        try {
            switch(formatType) {
                case FORMAT_TYPES.JSON:
                    return JSON.stringify(array);
                    
                case FORMAT_TYPES.DOTS:
                    return formatAsDots(array);
                    
                case FORMAT_TYPES.BINARY:
                    return formatAsBinary(array);
                    
                case FORMAT_TYPES.PRETTY:
                    return formatAsPretty(array);
                    
                case FORMAT_TYPES.COMPACT:
                    return formatAsCompact(array);
                    
                default:
                    return JSON.stringify(array);
            }
        } catch (error) {
            console.error('Error formatting Braille array:', error);
            return JSON.stringify(array);
        }
    }
    
    // Format array as visual dot representation
    function formatAsDots(array) {
        // Check if we have a 2D array (multiple cells)
        const is2DArray = Array.isArray(array) && Array.isArray(array[0]);
        
        if (is2DArray) {
            // Format each cell and join with separator
            return array.map(formatSingleCellAsDots).join('  ');
        } else {
            // Format a single cell
            return formatSingleCellAsDots(array);
        }
    }
    
    // Format a single Braille cell as dots
    function formatSingleCellAsDots(cellArray) {
        // Standard 6-dot Braille cell representation
        // 1 4
        // 2 5
        // 3 6
        let result = '';
        
        const hasDot = (dotNumber) => cellArray.includes(dotNumber);
        
        // Build visual representation
        result += hasDot(1) ? '⦿' : '⦾';
        result += ' ';
        result += hasDot(4) ? '⦿' : '⦾';
        result += '\n';
        
        result += hasDot(2) ? '⦿' : '⦾';
        result += ' ';
        result += hasDot(5) ? '⦿' : '⦾';
        result += '\n';
        
        result += hasDot(3) ? '⦿' : '⦾';
        result += ' ';
        result += hasDot(6) ? '⦿' : '⦾';
        
        return result;
    }
    
    // Format array as binary representation
    function formatAsBinary(array) {
        // Check if we have a 2D array (multiple cells)
        const is2DArray = Array.isArray(array) && Array.isArray(array[0]);
        
        if (is2DArray) {
            // Format each cell and join with separator
            return array.map(formatSingleCellAsBinary).join(' | ');
        } else {
            // Format a single cell
            return formatSingleCellAsBinary(array);
        }
    }
    
    // Format a single Braille cell as binary
    function formatSingleCellAsBinary(cellArray) {
        // Create a 6-bit binary representation (1 for raised dot, 0 for flat)
        let binary = '';
        
        for (let i = 1; i <= 6; i++) {
            binary += cellArray.includes(i) ? '1' : '0';
        }
        
        return binary;
    }
    
    // Format array in a pretty human-readable format
    function formatAsPretty(array) {
        // Check if we have a 2D array (multiple cells)
        const is2DArray = Array.isArray(array) && Array.isArray(array[0]);
        
        if (is2DArray) {
            return array.map((cell, index) => {
                const dots = cell.join(', ');
                return `Cell ${index + 1}: [${dots}]`;
            }).join('\n');
        } else {
            return `[${array.join(', ')}]`;
        }
    }
    
    // Format array in compact form
    function formatAsCompact(array) {
        // Check if we have a 2D array (multiple cells)
        const is2DArray = Array.isArray(array) && Array.isArray(array[0]);
        
        if (is2DArray) {
            // Just join arrays with minimal separators for compact view
            return `[[${array.map(cell => cell.join(',')).join('],[')}}]]`;
        } else {
            return `[${array.join(',')}]`;
        }
    }
    
    // Set the default format type
    function setDefaultFormat(formatType) {
        if (Object.values(FORMAT_TYPES).includes(formatType)) {
            defaultFormat = formatType;
            return true;
        }
        return false;
    }
    
    // Get available format types
    function getFormatTypes() {
        return FORMAT_TYPES;
    }
    
    // Public API
    return {
        format,
        formatAsDots,
        formatAsBinary,
        formatAsPretty, 
        formatAsCompact,
        setDefaultFormat,
        getFormatTypes,
        FORMAT_TYPES
    };
})();