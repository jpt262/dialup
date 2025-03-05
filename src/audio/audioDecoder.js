/**
 * DialUp Audio Decoder Module
 * Handles decoding of audio signals back to text data
 */

import { AUDIO_CONFIG } from './audioEncoder.js';

// Decoding configuration
const DECODE_CONFIG = {
    fftSize: 1024,              // FFT size for frequency analysis
    minSignalStrength: 0.1,     // Minimum signal strength to detect a tone
    frequencyTolerance: 30,     // Frequency tolerance in Hz
    startMarkerThreshold: 0.7,  // Threshold for detecting start marker
    endMarkerThreshold: 0.7,    // Threshold for detecting end marker
    symbolThreshold: 0.5,       // Threshold for detecting symbols
    minSymbolDuration: 0.03,    // Minimum duration to consider a symbol valid
    maxSymbolGap: 0.02,         // Maximum gap between symbols
    symbolCount: 8              // Number of possible symbols (same as encoder)
};

/**
 * Creates an audio decoder for processing audio input
 * @returns {Object} - Audio decoder object
 */
function createAudioDecoder() {
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let stream = null;
    let isListening = false;
    let onMessageCallback = null;
    let onStatusChangeCallback = null;

    // Decoding state
    const state = {
        isDecoding: false,
        symbolBuffer: [],
        lastSymbolTime: 0,
        detectedFrequencies: [],
        messageBuffer: [],
        currentMessage: null
    };

    /**
     * Updates decoder status and notifies via callback
     * @param {string} status - New status string
     * @param {Object} [data] - Optional data associated with status
     * @private
     */
    function updateStatus(status, data = null) {
        if (onStatusChangeCallback) {
            onStatusChangeCallback({ status, data });
        }
    }

    /**
     * Starts listening for audio input
     * @returns {Promise<void>} - Promise that resolves when listening starts
     */
    async function startListening() {
        if (isListening) {
            return; // Already listening
        }

        try {
            // Request microphone access
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create audio context and analyzer
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);

            // Configure analyzer
            analyser.fftSize = DECODE_CONFIG.fftSize;
            microphone.connect(analyser);

            // Start processing audio frames
            isListening = true;
            updateStatus('listening', { timestamp: Date.now() });

            // Start processing loop
            requestAnimationFrame(processAudioFrame);

        } catch (error) {
            console.error('Failed to start audio listening:', error);
            updateStatus('error', { message: error.message });
            throw error;
        }
    }

    /**
     * Stops listening for audio input
     */
    function stopListening() {
        if (!isListening) {
            return; // Not listening
        }

        // Stop all tracks in the stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        // Disconnect and clean up audio nodes
        if (microphone && analyser) {
            microphone.disconnect(analyser);
            microphone = null;
            analyser = null;
        }

        // Close audio context
        if (audioContext) {
            if (audioContext.state !== 'closed') {
                audioContext.close();
            }
            audioContext = null;
        }

        isListening = false;
        updateStatus('stopped');

        // Reset decoding state
        resetDecodingState();
    }

    /**
     * Resets the decoding state
     * @private
     */
    function resetDecodingState() {
        state.isDecoding = false;
        state.symbolBuffer = [];
        state.lastSymbolTime = 0;
        state.detectedFrequencies = [];
        state.messageBuffer = [];
        state.currentMessage = null;
    }

    /**
     * Processes a single audio frame for decoding
     * @private
     */
    function processAudioFrame() {
        if (!isListening || !analyser) {
            return;
        }

        // Get frequency data
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Process frequency data
        const dominantFrequency = findDominantFrequency(dataArray, audioContext.sampleRate);

        if (dominantFrequency) {
            const now = audioContext.currentTime;

            // Check for start marker
            if (!state.isDecoding &&
                Math.abs(dominantFrequency - AUDIO_CONFIG.startMarkerFreq) < DECODE_CONFIG.frequencyTolerance) {

                state.isDecoding = true;
                state.lastSymbolTime = now;
                state.symbolBuffer = [];
                updateStatus('started', { timestamp: now });

                // Check for end marker
            } else if (state.isDecoding &&
                Math.abs(dominantFrequency - AUDIO_CONFIG.endMarkerFreq) < DECODE_CONFIG.frequencyTolerance) {

                // Process the collected symbols
                if (state.symbolBuffer.length > 0) {
                    try {
                        const decodedMessage = decodeSymbols(state.symbolBuffer);

                        if (decodedMessage) {
                            state.currentMessage = decodedMessage;

                            // Notify via callback
                            if (onMessageCallback) {
                                onMessageCallback(decodedMessage);
                            }

                            updateStatus('decoded', { message: decodedMessage });
                        }
                    } catch (error) {
                        updateStatus('error', { message: error.message });
                    }
                }

                // Reset for next message
                state.isDecoding = false;
                state.symbolBuffer = [];

                // Check for sync marker
            } else if (state.isDecoding &&
                Math.abs(dominantFrequency - AUDIO_CONFIG.syncFreq) < DECODE_CONFIG.frequencyTolerance) {

                // Sync marker - just update the time
                state.lastSymbolTime = now;

                // Process regular symbol
            } else if (state.isDecoding) {
                // Calculate which symbol this frequency represents
                const symbolIndex = Math.round((dominantFrequency - AUDIO_CONFIG.baseFrequency) / AUDIO_CONFIG.freqShift);

                // Check if it's a valid symbol
                if (symbolIndex >= 0 && symbolIndex < DECODE_CONFIG.symbolCount) {
                    // Check if this is a new symbol (based on time gap)
                    const timeSinceLastSymbol = now - state.lastSymbolTime;

                    if (timeSinceLastSymbol >= AUDIO_CONFIG.symbolDuration - 0.01) {
                        state.symbolBuffer.push(symbolIndex);
                        state.lastSymbolTime = now;

                        updateStatus('symbol', {
                            index: symbolIndex,
                            frequency: dominantFrequency,
                            count: state.symbolBuffer.length
                        });
                    }
                }
            }
        }

        // Check for timeout (no activity for too long)
        const now = audioContext.currentTime;
        if (state.isDecoding && (now - state.lastSymbolTime) > AUDIO_CONFIG.symbolDuration * 10) {
            updateStatus('timeout', { duration: now - state.lastSymbolTime });
            state.isDecoding = false;
            state.symbolBuffer = [];
        }

        // Continue processing loop
        requestAnimationFrame(processAudioFrame);
    }

    /**
     * Finds the dominant frequency in the audio spectrum
     * @param {Uint8Array} frequencyData - Frequency data from analyzer
     * @param {number} sampleRate - Audio sample rate
     * @returns {number|null} - Dominant frequency or null if none detected
     * @private
     */
    function findDominantFrequency(frequencyData, sampleRate) {
        const bufferLength = frequencyData.length;

        // Find the bin with maximum amplitude
        let maxValue = 0;
        let maxIndex = -1;

        for (let i = 0; i < bufferLength; i++) {
            if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxIndex = i;
            }
        }

        // Convert to actual frequency
        if (maxValue > DECODE_CONFIG.minSignalStrength * 255) {
            return maxIndex * sampleRate / (bufferLength * 2);
        }

        return null;
    }

    /**
     * Decodes a sequence of symbol indexes back to text
     * @param {number[]} symbols - Array of symbol indexes
     * @returns {Object} - Decoded message object
     * @private
     */
    function decodeSymbols(symbols) {
        if (symbols.length < 3) {
            throw new Error('Symbol sequence too short');
        }

        // Extract metadata (first few symbols)
        const metadataLength = Math.ceil(8 / Math.log2(DECODE_CONFIG.symbolCount));
        if (symbols.length <= metadataLength) {
            throw new Error('Symbol sequence too short for metadata');
        }

        const metadataSymbols = symbols.slice(0, metadataLength);
        const dataSymbols = symbols.slice(metadataLength, symbols.length - 1);
        const checksumSymbol = symbols[symbols.length - 1];

        // Verify checksum
        const calculatedChecksum = dataSymbols.reduce((sum, symbol) => sum + symbol, 0) % DECODE_CONFIG.symbolCount;
        if (calculatedChecksum !== checksumSymbol) {
            throw new Error('Checksum verification failed');
        }

        // Convert symbols to binary
        let binary = '';
        const bitsPerSymbol = Math.log2(DECODE_CONFIG.symbolCount);

        for (const symbol of dataSymbols) {
            binary += symbol.toString(2).padStart(bitsPerSymbol, '0');
        }

        // Convert binary to text (8 bits per character)
        let text = '';
        for (let i = 0; i < binary.length; i += 8) {
            const byte = binary.slice(i, i + 8).padEnd(8, '0');
            text += String.fromCharCode(parseInt(byte, 2));
        }

        return {
            text,
            metadata: {
                symbolCount: symbols.length,
                checksumValid: true
            }
        };
    }

    /**
     * Sets a callback for received messages
     * @param {function} callback - Function to call with decoded message
     */
    function onMessage(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        onMessageCallback = callback;
    }

    /**
     * Sets a callback for status changes
     * @param {function} callback - Function to call with status updates
     */
    function onStatusChange(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        onStatusChangeCallback = callback;
    }

    /**
     * Gets the current decoder state
     * @returns {Object} - Current state information
     */
    function getState() {
        return {
            isListening,
            isDecoding: state.isDecoding,
            symbolCount: state.symbolBuffer.length,
            lastActivity: state.lastSymbolTime,
            currentMessage: state.currentMessage
        };
    }

    // Build and return the decoder object
    return {
        startListening,
        stopListening,
        onMessage,
        onStatusChange,
        getState,
        reset: resetDecodingState
    };
}

export {
    createAudioDecoder,
    DECODE_CONFIG
}; 