/**
 * Theme Switcher for Speech to Braille
 * Allows users to switch between different color themes
 */

const themeSwitcher = (function() {
    // Available themes - dark mode removed
    const themes = {
        default: {
            primary: '#2563eb',
            primaryDark: '#1d4ed8',
            primaryLight: '#60a5fa',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            background: '#f1f5f9',
            cardBackground: '#ffffff'
        },
        highContrast: {
            primary: '#0000FF', // Blue
            primaryDark: '#000080', // Navy
            primaryLight: '#4169E1', // Royal Blue
            success: '#008000', // Green
            warning: '#FFA500', // Orange
            error: '#FF0000', // Red
            background: '#FFFFFF', // White
            cardBackground: '#F5F5F5' // Light Gray
        },
        calm: {
            primary: '#4f46e5', // Indigo
            primaryDark: '#4338ca',
            primaryLight: '#818cf8',
            success: '#059669', // Teal
            warning: '#d97706', // Amber
            error: '#dc2626', // Red
            background: '#f3f4f6', // Gray 100
            cardBackground: '#ffffff' // White
        }
    };
    
    // Current theme
    let currentTheme = 'default';
    
    // Initialize theme from localStorage if available
    function init() {
        const savedTheme = localStorage.getItem('speechToBrailleTheme');
        if (savedTheme && themes[savedTheme]) {
            currentTheme = savedTheme;
        }
        
        // Apply the current theme
        applyTheme(currentTheme);
        
        // Create theme switcher UI if it doesn't exist
        createThemeSwitcherUI();
    }
    
    // Apply a theme
    function applyTheme(themeName) {
        if (!themes[themeName]) {
            console.error('Theme not found:', themeName);
            return;
        }
        
        const theme = themes[themeName];
        
        // Apply theme colors to CSS variables
        document.documentElement.style.setProperty('--primary', theme.primary);
        document.documentElement.style.setProperty('--primary-dark', theme.primaryDark);
        document.documentElement.style.setProperty('--primary-light', theme.primaryLight);
        document.documentElement.style.setProperty('--success', theme.success);
        document.documentElement.style.setProperty('--warning', theme.warning);
        document.documentElement.style.setProperty('--error', theme.error);
        document.documentElement.style.setProperty('--bg-secondary', theme.background);
        document.documentElement.style.setProperty('--bg-primary', theme.cardBackground);
        
        // Save the current theme
        localStorage.setItem('speechToBrailleTheme', themeName);
        currentTheme = themeName;
        
        // Update UI
        updateThemeSwitcherUI();
    }
    
    // Create theme switcher UI
    function createThemeSwitcherUI() {
        // Check if the theme switcher already exists
        if (document.getElementById('theme-switcher')) {
            return;
        }
        
        // Create theme switcher container
        const themeSwitcher = document.createElement('div');
        themeSwitcher.id = 'theme-switcher';
        themeSwitcher.classList.add('theme-switcher');
        
        // Style the theme switcher
        themeSwitcher.style.position = 'fixed';
        themeSwitcher.style.bottom = '20px';
        themeSwitcher.style.right = '20px';
        themeSwitcher.style.backgroundColor = 'var(--bg-primary)';
        themeSwitcher.style.padding = '8px';
        themeSwitcher.style.borderRadius = '8px';
        themeSwitcher.style.boxShadow = 'var(--shadow-md)';
        themeSwitcher.style.zIndex = '1000';
        themeSwitcher.style.display = 'flex';
        themeSwitcher.style.flexDirection = 'row';
        themeSwitcher.style.gap = '8px';
        
        // Create theme options
        Object.keys(themes).forEach(themeName => {
            const themeOption = document.createElement('button');
            themeOption.classList.add('theme-option');
            themeOption.setAttribute('data-theme', themeName);
            themeOption.setAttribute('title', `Switch to ${themeName} theme`);
            
            // Style the theme option
            themeOption.style.width = '24px';
            themeOption.style.height = '24px';
            themeOption.style.borderRadius = '50%';
            themeOption.style.border = '2px solid transparent';
            themeOption.style.backgroundColor = themes[themeName].primary;
            themeOption.style.cursor = 'pointer';
            themeOption.style.transition = 'transform 0.2s ease';
            
            // Add hover effect
            themeOption.addEventListener('mouseenter', () => {
                themeOption.style.transform = 'scale(1.1)';
            });
            
            themeOption.addEventListener('mouseleave', () => {
                themeOption.style.transform = 'scale(1)';
            });
            
            // Add click event
            themeOption.addEventListener('click', () => {
                applyTheme(themeName);
            });
            
            // Add to theme switcher
            themeSwitcher.appendChild(themeOption);
        });
        
        // Add to body
        document.body.appendChild(themeSwitcher);
        
        // Update UI
        updateThemeSwitcherUI();
    }
    
    // Update theme switcher UI
    function updateThemeSwitcherUI() {
        const themeOptions = document.querySelectorAll('.theme-option');
        
        themeOptions.forEach(option => {
            const themeName = option.getAttribute('data-theme');
            
            if (themeName === currentTheme) {
                option.style.border = '2px solid white';
                option.style.boxShadow = '0 0 0 1px var(--primary)';
            } else {
                option.style.border = '2px solid transparent';
                option.style.boxShadow = 'none';
            }
        });
    }
    
    // Public API
    return {
        init,
        applyTheme,
        getThemes: () => Object.keys(themes),
        getCurrentTheme: () => currentTheme
    };
})();

// Initialize theme switcher when DOM is loaded
document.addEventListener('DOMContentLoaded', themeSwitcher.init);
