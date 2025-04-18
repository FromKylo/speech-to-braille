/**
 * Braille Dot Visualizer for Speech to Braille App
 * 
 * This module handles the visual representation of braille patterns
 * in the web interface, coordinating with the BLE controller.
 */

// Create a namespace for braille visualization functionality
const brailleVisualizer = (function() {
    // DOM elements
    let brailleCellsContainer = null;
    let defaultBrailleCell = null;
    
    // Initialize the visualizer
    function init() {
        brailleCellsContainer = document.getElementById('braille-cells-container');
        defaultBrailleCell = document.getElementById('braille-cell');
        
        if (!brailleCellsContainer || !defaultBrailleCell) {
            console.warn('Braille cell DOM elements not found, attempting to create them');
            createDefaultBrailleCell();
            
            // Check if creation was successful
            if (!brailleCellsContainer || !defaultBrailleCell) {
                console.error('Failed to create braille cell elements');
                return false;
            }
        }
        
        // Clear all dots initially
        clearDots();
        
        console.log('Braille visualizer initialized');
        return true;
    }
    
    // Clear all active dots
    function clearDots() {
        const dots = document.querySelectorAll('.braille-dot');
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
    }
    
    // Update the visual display based on braille array data
    function updateDisplay(brailleArray) {
        console.log('Braille visualizer updating display with:', brailleArray);
        
        // Safety check for valid input
        if (!brailleArray || !Array.isArray(brailleArray)) {
            console.warn('Invalid braille array provided to visualizer:', brailleArray);
            return;
        }
        
        // Clear existing dots first
        clearDots();
        
        try {
            // Handle nested arrays for multi-cell braille (contractions)
            if (Array.isArray(brailleArray) && Array.isArray(brailleArray[0])) {
                // Multiple cells
                updateMultiCellDisplay(brailleArray);
            } else if (Array.isArray(brailleArray)) {
                // Single cell
                updateSingleCellDisplay(brailleArray);
            }
            
            // Debug what dots should be activated
            console.log('Dots activated:', Array.isArray(brailleArray[0]) ? 
                         brailleArray.map(cell => cell.join(',')).join(' | ') : 
                         brailleArray.join(','));
        } catch (error) {
            console.error('Error updating braille display:', error);
        }
        
        // Make sure the braille display container is visible
        const displayContainer = document.querySelector('.braille-dot-display');
        if (displayContainer) {
            displayContainer.style.display = 'block';
            displayContainer.style.visibility = 'visible';
            displayContainer.style.opacity = '1';
        }
    }
    
    // Update display for a single braille cell
    function updateSingleCellDisplay(dotsArray) {
        // Check if defaultBrailleCell exists before trying to access it
        if (!defaultBrailleCell) {
            console.error('Cannot update braille display: defaultBrailleCell is null');
            
            // Try to reinitialize or create the element if missing
            const existingCell = document.getElementById('braille-cell');
            if (existingCell) {
                defaultBrailleCell = existingCell;
            } else {
                // Create the braille cell if it doesn't exist
                createDefaultBrailleCell();
                
                // If still null after creation attempt, exit
                if (!defaultBrailleCell) {
                    return;
                }
            }
        }
        
        // Activate dots based on the array (dots are 1-based numbers)
        const dots = defaultBrailleCell.querySelectorAll('.braille-dot');
        dots.forEach(dot => {
            const dotNumber = parseInt(dot.getAttribute('data-dot'));
            if (dotsArray.includes(dotNumber)) {
                dot.classList.add('active');
                console.log(`Activated dot ${dotNumber}`);
            }
        });
    }
    
    // Helper function to create default braille cell if it doesn't exist
    function createDefaultBrailleCell() {
        console.log('Creating default braille cell element');
        
        // First check/create the container
        if (!brailleCellsContainer) {
            brailleCellsContainer = document.getElementById('braille-cells-container');
            
            if (!brailleCellsContainer) {
                // Create the container if it doesn't exist
                brailleCellsContainer = document.createElement('div');
                brailleCellsContainer.id = 'braille-cells-container';
                brailleCellsContainer.className = 'braille-cells-container';
                
                // Find a suitable parent element to append to
                const brailleDisplay = document.querySelector('.braille-dot-display') || 
                                      document.querySelector('.braille-container') ||
                                      document.querySelector('#braille-result');
                
                if (brailleDisplay) {
                    brailleDisplay.appendChild(brailleCellsContainer);
                } else {
                    console.error('Cannot find suitable parent for braille cells container');
                    return;
                }
            }
        }
        
        // Now create the cell
        defaultBrailleCell = document.createElement('div');
        defaultBrailleCell.id = 'braille-cell';
        defaultBrailleCell.className = 'braille-cell';
        
        // Create the 6 dots
        for (let dotNum = 1; dotNum <= 6; dotNum++) {
            const dot = document.createElement('div');
            dot.className = 'braille-dot';
            dot.setAttribute('data-dot', dotNum);
            dot.textContent = dotNum;
            defaultBrailleCell.appendChild(dot);
        }
        
        // Add the cell to the container
        brailleCellsContainer.appendChild(defaultBrailleCell);
        
        console.log('Default braille cell created successfully');
    }
    
    // Update display for multiple braille cells (contractions)
    function updateMultiCellDisplay(cellsArray) {
        // Clear existing cells first
        brailleCellsContainer.innerHTML = '';
        
        // Create a cell for each array in the nested array
        cellsArray.forEach((dotsArray, index) => {
            // Create a new cell wrapper
            const cellWrapper = document.createElement('div');
            cellWrapper.className = 'braille-cell-wrapper';
            
            // Create the cell itself
            const cell = document.createElement('div');
            cell.className = 'braille-cell';
            cell.id = `braille-cell-${index + 1}`;
            
            // Create dots
            for (let dotNum = 1; dotNum <= 6; dotNum++) {
                const dot = document.createElement('div');
                dot.className = 'braille-dot';
                dot.setAttribute('data-dot', dotNum);
                dot.textContent = dotNum;
                
                // If this dot is in the array, activate it
                if (dotsArray.includes(dotNum)) {
                    dot.classList.add('active');
                    console.log(`Cell ${index + 1}: Activated dot ${dotNum}`);
                }
                
                cell.appendChild(dot);
            }
            
            // Add cell label
            const label = document.createElement('div');
            label.className = 'braille-cell-label';
            label.textContent = `Cell ${index + 1}`;
            
            // Add to wrapper and container
            cellWrapper.appendChild(cell);
            cellWrapper.appendChild(label);
            brailleCellsContainer.appendChild(cellWrapper);
        });
    }
    
    // Public API
    return {
        init: function() {
            return init();
        },
        
        updateDisplay: function(brailleArray) {
            updateDisplay(brailleArray);
            return true; // Return success
        },
        
        clearDots: function() {
            clearDots();
        }
    };
})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing braille visualizer');
    brailleVisualizer.init();
});

// Export the braille visualizer
window.brailleVisualizer = brailleVisualizer;

console.log('Braille Visualizer module loaded.');