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
        
        // Start updating the current phase timer display
        updateTimingDisplay(phase);
    });
    
    // Update timing display in the UI
    function updateTimingDisplay(phase) {
        const currentPhaseTimeElement = document.getElementById('current-phase-time');
        if (!currentPhaseTimeElement) return;
        
        // Clear any previous interval
        if (window.phaseTimeDisplayInterval) {
            clearInterval(window.phaseTimeDisplayInterval);
        }
        
        // Update every 100ms
        window.phaseTimeDisplayInterval = setInterval(() => {
            if (currentPhaseTimeElement) {
                const elapsed = getElapsedTime(phase);
                currentPhaseTimeElement.textContent = elapsed.toFixed(1);
            }
        }, 100);
    }
    
    // Monitor a phase to see if it stays too long
    function monitorCurrentPhase(phase) {
        const expectedDuration = getExpectedDuration(phase);
        const warningTime = expectedDuration * 1.5; // 50% longer than expected
        
        setTimeout(() => {
            if (currentPhase === phase) {
                console.warn(`[TIMING] Phase ${phase} has been active for longer than expected (${expectedDuration/1000}s)`);
                
                // Add to DOM debug element if it exists
                const debugEl = document.getElementById('phase-debug-helper');
                if (debugEl) {
                    debugEl.innerHTML += `<br><span style="color:#fbbc05">WARNING: Phase ${phase} exceeded expected duration!</span>`;
                }
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
    
    // Function to get elapsed time for a phase in seconds
    function getElapsedTime(phase) {
        if (!phaseStartTimes[phase]) return 0;
        return (Date.now() - phaseStartTimes[phase]) / 1000;
    }
    
    // Add to window for console debugging
    window.timingDebug = {
        getPhaseStartTimes: () => phaseStartTimes,
        getCurrentPhase: () => currentPhase,
        getPhaseElapsedTime: (phase) => {
            if (phaseStartTimes[phase]) {
                return getElapsedTime(phase) + 's';
            }
            return 'Phase not started';
        },
        getAllPhaseTimes: () => {
            const result = {};
            for (const phase in phaseStartTimes) {
                result[phase] = getElapsedTime(phase) + 's';
            }
            return result;
        }
    };
    
    // Add refresh button event listener when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        const refreshBtn = document.getElementById('refresh-timings-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                // Update timing displays from config
                const introTimeElement = document.getElementById('intro-time');
                const listenTimeElement = document.getElementById('listen-time');
                const outputTimeElement = document.getElementById('output-time');
                
                if (window.config && window.config.timings) {
                    if (introTimeElement) introTimeElement.textContent = window.config.timings.introductionPhase;
                    if (listenTimeElement) listenTimeElement.textContent = window.config.timings.listeningPhase;
                    if (outputTimeElement) outputTimeElement.textContent = window.config.timings.outputPhase;
                }
                
                // Also update the CSS variables
                if (window.phaseControl && typeof window.phaseControl.updateTimingCSS === 'function') {
                    window.phaseControl.updateTimingCSS();
                }
                
                // Show confirmation message
                const btn = this;
                const originalText = btn.textContent;
                btn.textContent = 'Updated!';
                btn.style.backgroundColor = '#34a853';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = '';
                }, 2000);
            });
        }
    });
    
    console.log('[TIMING] Phase timing debug utilities initialized');
})();
