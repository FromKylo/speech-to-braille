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
            console.error('Braille cell DOM elements not found');
            return false;
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
        clearDots();
        
        if (!brailleArray) return;
        
        // Handle nested arrays for multi-cell braille (contractions)
        if (Array.isArray(brailleArray) && Array.isArray(brailleArray[0])) {
            // Multiple cells
            updateMultiCellDisplay(brailleArray);
        } else if (Array.isArray(brailleArray)) {
            // Single cell
            updateSingleCellDisplay(brailleArray);
        }
    }
    
    // Update display for a single braille cell
    function updateSingleCellDisplay(dotsArray) {
        // Activate dots based on the array (dots are 1-based numbers)
        const dots = defaultBrailleCell.querySelectorAll('.braille-dot');
        dots.forEach(dot => {
            const dotNumber = parseInt(dot.getAttribute('data-dot'));
            if (dotsArray.includes(dotNumber)) {
                dot.classList.add('active');
            }
        });
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
            
            // Create dots
            for (let dotNum = 1; dotNum <= 6; dotNum++) {
                const dot = document.createElement('div');
                dot.className = 'braille-dot';
                dot.setAttribute('data-dot', dotNum);
                dot.textContent = dotNum;
                
                // If this dot is in the array, activate it
                if (dotsArray.includes(dotNum)) {
                    dot.classList.add('active');
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
        },
        
        clearDots: function() {
            clearDots();
        }
    };
})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    brailleVisualizer.init();
});

// Export the braille visualizer
window.brailleVisualizer = brailleVisualizer;

console.log('Braille Visualizer module loaded.');