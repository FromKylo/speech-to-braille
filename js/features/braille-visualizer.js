/**
 * Braille Visualizer Module
 * 
 * This module handles the visual display of Braille dots based on the 
 * array values received from the Braille Translator.
 */

const brailleVisualizer = (function() {
    // DOM elements
    let visualizerContainer = null;
    let cellsContainer = null;
    
    // The standard 6-dot Braille cell positions
    const DOT_POSITIONS = [
        { label: '1', top: 0, left: 0 },
        { label: '2', top: 1, left: 0 },
        { label: '3', top: 2, left: 0 },
        { label: '4', top: 0, left: 1 },
        { label: '5', top: 1, left: 1 },
        { label: '6', top: 2, left: 1 }
    ];
    
    // Initialize the visualizer
    function init() {
        console.log('Initializing Braille visualizer...');
        
        // Find or create the visualizer container
        visualizerContainer = document.getElementById('braille-visualizer');
        
        if (!visualizerContainer) {
            console.log('Creating Braille visualizer container');
            visualizerContainer = document.createElement('div');
            visualizerContainer.id = 'braille-visualizer';
            visualizerContainer.className = 'braille-visualizer';
            
            // Find a good place to insert it
            const brailleResultContainer = document.getElementById('braille-result');
            if (brailleResultContainer) {
                brailleResultContainer.appendChild(visualizerContainer);
            } else {
                // Fallback to adding it to the main content
                const main = document.querySelector('main');
                if (main) {
                    main.appendChild(visualizerContainer);
                }
            }
        }
        
        // Create the cells container if it doesn't exist
        cellsContainer = visualizerContainer.querySelector('.braille-cells-container');
        if (!cellsContainer) {
            cellsContainer = document.createElement('div');
            cellsContainer.className = 'braille-cells-container';
            visualizerContainer.appendChild(cellsContainer);
        }
        
        console.log('Braille visualizer initialized');
    }
    
    // Update the display with Braille dot array values
    function updateDisplay(brailleArray) {
        if (!visualizerContainer || !cellsContainer) {
            console.error('Braille visualizer not initialized');
            return;
        }
        
        console.log('Updating Braille visualizer with array:', brailleArray);
        
        // Clear the cells container
        cellsContainer.innerHTML = '';
        
        // Check if we have a 2D array (multiple cells)
        const is2DArray = Array.isArray(brailleArray) && Array.isArray(brailleArray[0]);
        
        if (is2DArray) {
            // Handle multiple cells (2D array)
            brailleArray.forEach((cellArray, cellIndex) => {
                createBrailleCell(cellArray, `Cell ${cellIndex + 1}`);
            });
        } else if (Array.isArray(brailleArray)) {
            // Handle single cell (1D array)
            createBrailleCell(brailleArray, 'Braille Cell');
        } else {
            console.error('Invalid Braille array format:', brailleArray);
        }
    }
    
    // Create a single Braille cell
    function createBrailleCell(dotsArray, label) {
        // Create cell container
        const cellContainer = document.createElement('div');
        cellContainer.className = 'braille-cell-container';
        
        // Create cell grid
        const cell = document.createElement('div');
        cell.className = 'braille-cell';
        
        // Create dots
        DOT_POSITIONS.forEach((pos, index) => {
            const dotNum = index + 1;
            const dot = document.createElement('div');
            dot.className = 'braille-dot';
            dot.dataset.position = dotNum;
            dot.textContent = pos.label;
            
            // Check if this dot is active in the array
            if (dotsArray.includes(dotNum)) {
                dot.classList.add('active');
            }
            
            cell.appendChild(dot);
        });
        
        // Add cell to container
        cellContainer.appendChild(cell);
        
        // Add label below the cell
        if (label) {
            const cellLabel = document.createElement('div');
            cellLabel.className = 'braille-cell-label';
            cellLabel.textContent = label;
            cellContainer.appendChild(cellLabel);
        }
        
        // Add to the cells container
        cellsContainer.appendChild(cellContainer);
    }
    
    // Clear all dots (deactivate them)
    function clearDots() {
        if (!cellsContainer) return;
        
        const dots = cellsContainer.querySelectorAll('.braille-dot');
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
    }
    
    // Show a specific character pattern
    function showCharacterPattern(character) {
        // This function would lookup the pattern for a specific character
        // and update the display accordingly
        if (window.brailleTranslator) {
            const result = brailleTranslator.translate(character);
            if (result && result.array) {
                updateDisplay(result.array);
                return true;
            }
        }
        
        return false;
    }
    
    // Get a description of the current dots
    function getDotsDescription() {
        if (!cellsContainer) return '';
        
        let descriptions = [];
        
        const cells = cellsContainer.querySelectorAll('.braille-cell-container');
        cells.forEach((cell, index) => {
            const activeDots = cell.querySelectorAll('.braille-dot.active');
            const positions = Array.from(activeDots).map(dot => dot.dataset.position).join(', ');
            descriptions.push(`Cell ${index + 1}: dots ${positions}`);
        });
        
        return descriptions.join('; ');
    }
    
    // Public API
    return {
        init,
        updateDisplay,
        clearDots,
        showCharacterPattern,
        getDotsDescription
    };
})();