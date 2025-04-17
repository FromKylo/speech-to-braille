/**
 * Config Debug Utility
 * Helps diagnose configuration loading issues
 */

(function() {
    // Check if config is loaded
    function checkConfig() {
        console.log('Config check running at:', new Date().toLocaleTimeString());
        
        if (!window.config) {
            console.error('ERROR: window.config is not defined!');
            return false;
        }
        
        if (!window.config.timings) {
            console.error('ERROR: window.config.timings is not defined!');
            return false;
        }
        
        console.log('Config loaded successfully:', window.config);
        console.log('Timing values:',
            'Introduction:', window.config.timings.introductionPhase + 's',
            'Listening:', window.config.timings.listeningPhase + 's',
            'Output:', window.config.timings.outputPhase + 's'
        );
        
        return true;
    }
    
    // Run check immediately
    checkConfig();
    
    // Run check when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        if (checkConfig()) {
            console.log('Config still valid after DOM loaded');
        }
    });
    
    // Make checker available globally
    window.configDebugger = {
        check: checkConfig
    };
})();
