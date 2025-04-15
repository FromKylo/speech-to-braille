/**
 * UI Enhancement Script for Speech to Braille
 * Applies dynamic spacing, fixes layout issues and improves overall UI
 */

document.addEventListener('DOMContentLoaded', function() {
    // Apply card and container padding consistency
    document.querySelectorAll('.card').forEach(card => {
        ensureConsistentPadding(card);
    });
    
    // Fix spacing between elements
    fixVerticalSpacing();
    
    // Enhance Braille display
    enhanceBrailleDisplay();
    
    // Add nice transitions to phase containers
    enhancePhaseContainers();
    
    // Add subtle hover effects to buttons
    enhanceButtonHover();
    
    // Fix mobile layout issues
    applyResponsiveImprovements();
    
    // Start observing DOM changes to apply same enhancements to dynamically added elements
    observeDOMChanges();
});

// Ensure all cards have consistent padding
function ensureConsistentPadding(element) {
    const computedStyle = window.getComputedStyle(element);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    
    if (paddingTop < 16) { // 1rem
        element.style.padding = '1rem';
    }
}

// Fix spacing between elements for better visual hierarchy
function fixVerticalSpacing() {
    document.querySelectorAll('h2, h3, h4').forEach(heading => {
        const nextElement = heading.nextElementSibling;
        if (nextElement) {
            const computedStyle = window.getComputedStyle(nextElement);
            const marginTop = parseFloat(computedStyle.marginTop);
            
            if (marginTop < 12) { // 0.75rem
                nextElement.style.marginTop = '0.75rem';
            }
        }
    });
    
    // Add proper spacing between form controls
    document.querySelectorAll('input, select, button').forEach(control => {
        const computedStyle = window.getComputedStyle(control);
        const marginBottom = parseFloat(computedStyle.marginBottom);
        
        if (marginBottom < 8 && !control.classList.contains('no-margin')) {
            control.style.marginBottom = '0.5rem';
        }
    });
}

// Enhance the Braille display
function enhanceBrailleDisplay() {
    const brailleCells = document.querySelectorAll('.braille-cell');
    
    brailleCells.forEach(cell => {
        cell.querySelectorAll('.braille-dot').forEach(dot => {
            // Add subtle transition to dots
            dot.style.transition = 'all 0.2s ease';
            
            // Add appropriate cursor
            dot.style.cursor = 'default';
        });
    });
}

// Add smooth transitions to phase containers
function enhancePhaseContainers() {
    const phaseContainers = document.querySelectorAll('.phase-container');
    
    phaseContainers.forEach(container => {
        container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    });
}

// Add subtle hover effects to buttons
function enhanceButtonHover() {
    document.querySelectorAll('button, .action-button').forEach(button => {
        if (!button.dataset.enhanced) {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-1px)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
            });
            
            button.dataset.enhanced = 'true';
        }
    });
}

// Apply responsive improvements
function applyResponsiveImprovements() {
    // Check if viewport is mobile size
    if (window.innerWidth <= 768) {
        // Make card padding smaller on mobile
        document.querySelectorAll('.card').forEach(card => {
            card.style.padding = '0.75rem';
        });
        
        // Stack horizontal layouts on mobile
        document.querySelectorAll('.status-header, .speech-controls').forEach(element => {
            element.style.flexDirection = 'column';
            element.style.alignItems = 'flex-start';
        });
    }
}

// Observe DOM changes to apply enhancements to new elements
function observeDOMChanges() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList.contains('card')) {
                            ensureConsistentPadding(node);
                        }
                        
                        if (node.classList.contains('braille-cell')) {
                            enhanceBrailleDisplay();
                        }
                        
                        if (node.tagName === 'BUTTON' || node.classList.contains('action-button')) {
                            enhanceButtonHover();
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}
