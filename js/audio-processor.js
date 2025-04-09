/**
 * AudioProcessor for Speech Recognition
 * This AudioWorklet processor handles audio input for the Vosk speech recognition engine
 */

class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        // Get the sample rate from the options or use default (16000 Hz is good for speech)
        this.sampleRate = (options && options.processorOptions && options.processorOptions.sampleRate) || 16000;
        
        // Buffer size for resampling (if needed)
        this.bufferSize = 4096;
        this.inputBuffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        
        // For optional resampling
        this.resamplingFactor = this.sampleRate / 16000; // 16kHz is Vosk's preferred rate
        this.needsResampling = Math.abs(this.resamplingFactor - 1.0) > 0.01;
        
        // Flag to prevent flooding the main thread with too many messages
        this.lastPostTime = 0;
    }
    
    /**
     * Process audio data
     * @param {Array} inputs - Array of input channels arrays
     * @param {Array} outputs - Array of output channels arrays
     * @param {Object} parameters - Processing parameters
     * @returns {boolean} - Return true to keep the processor alive
     */
    process(inputs, outputs, parameters) {
        // Get input data (first channel of first input)
        const input = inputs[0];
        if (!input || !input.length) return true;
        
        const inputChannel = input[0];
        if (!inputChannel) return true;
        
        // Accumulate data in the buffer
        for (let i = 0; i < inputChannel.length; i++) {
            this.inputBuffer[this.bufferIndex++] = inputChannel[i];
            
            // When buffer is full, send it to the main thread
            if (this.bufferIndex >= this.bufferSize) {
                const now = Date.now();
                // Throttle messages to avoid flooding (send at most every 100ms)
                if (now - this.lastPostTime > 100) {
                    this.lastPostTime = now;
                    
                    // Send data to main thread
                    if (this.needsResampling) {
                        const resampledBuffer = this.resampleAudio(this.inputBuffer);
                        this.port.postMessage(resampledBuffer);
                    } else {
                        // Clone buffer before sending to avoid sharing memory
                        this.port.postMessage(this.inputBuffer.slice(0));
                    }
                }
                
                // Reset buffer index
                this.bufferIndex = 0;
            }
        }
        
        // Return true to keep the processor alive
        return true;
    }
    
    /**
     * Simple linear resampling function to convert audio to 16kHz
     * Note: For production, consider using a more sophisticated resampling algorithm
     * @param {Float32Array} buffer - Input audio buffer
     * @returns {Float32Array} - Resampled buffer at 16kHz
     */
    resampleAudio(buffer) {
        // Calculate output buffer size based on resampling factor
        const outputLength = Math.floor(buffer.length / this.resamplingFactor);
        const outputBuffer = new Float32Array(outputLength);
        
        for (let i = 0; i < outputLength; i++) {
            // Simple linear interpolation for resampling
            const inputIndex = i * this.resamplingFactor;
            const index1 = Math.floor(inputIndex);
            const index2 = Math.min(index1 + 1, buffer.length - 1);
            const fraction = inputIndex - index1;
            
            // Linear interpolation between adjacent samples
            outputBuffer[i] = (1 - fraction) * buffer[index1] + fraction * buffer[index2];
        }
        
        return outputBuffer;
    }
}

// Register the audio processor
registerProcessor('audio-processor', AudioProcessor);