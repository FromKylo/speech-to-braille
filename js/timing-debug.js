/**
 * Timing Debug Utility
 * Helps monitor and debug phase timing issues
 */

(function() {
    // Track phase transitions
    let phaseStartTimes = {};
    let currentPhase = '';
    
    // Listen for phase changes
    window.addEventListener('phasechange', function(e) {
        const phase = e.detail.phase;
        phaseStartTimes[phase] = Date.now();
        currentPhase = phase;
        
        console.log(`[TIMING] Phase changed to: ${phase} at ${new Date().toLocaleTimeString()}`);
        
        // Start monitoring the current phase
        monitorCurrentPhase(phase);
    });
    
    // Monitor a phase to see if it stays too long
    function monitorCurrentPhase(phase) {
        const expectedDuration = getExpectedDuration(phase);
        const warningTime = expectedDuration * 1.5; // 50% longer than expected
        
        setTimeout(() => {
            if (currentPhase === phase) {
                console.warn(`[TIMING] Phase ${phase} has been active for longer than expected (${expectedDuration/1000}s)`);
            }
        }, warningTime);
    }
    
    // Get expected duration for a phase in ms
    function getExpectedDuration(phase) {
        if (!window.config || !window.config.timings) return 5000; // Default fallback
        
        switch(phase) {
            case 'introduction':
                return window.config.timings.introductionPhase * 1000;
            case 'recording':
            case 'listening':
                return window.config.timings.listeningPhase * 1000;
            case 'output':
                return window.config.timings.outputPhase * 1000;
            default:
                return 5000; // Default fallback
        }
    }
    
    // Add to window for console debugging
    window.timingDebug = {
        getPhaseStartTimes: () => phaseStartTimes,
        getCurrentPhase: () => currentPhase,
        getPhaseElapsedTime: (phase) => {
            if (phaseStartTimes[phase]) {
                return (Date.now() - phaseStartTimes[phase]) / 1000 + 's';
            }
            return 'Phase not started';
        }
    };
    
    console.log('[TIMING] Phase timing debug utilities initialized');
})();
