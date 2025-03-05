/**
 * DialUp Audio Encoder Module
 * Handles encoding of text data into audio signals for transmission
 */

// Audio configuration
const AUDIO_CONFIG = {
    sampleRate: 44100,         // Sample rate in Hz
    baseFrequency: 1000,       // Base frequency in Hz
    freqShift: 200,            // Frequency shift between symbols in Hz
    symbolDuration: 0.05,      // Duration of each symbol in seconds
    pauseDuration: 0.01,       // Pause between symbols in seconds
    startMarkerDuration: 0.2,  // Duration of start marker in seconds
    endMarkerDuration: 0.2,    // Duration of end marker in seconds
    startMarkerFreq: 2000,     // Start marker frequency in Hz
    endMarkerFreq: 2200,       // End marker frequency in Hz
    syncFreq: 1800,            // Sync marker frequency in Hz
    syncDuration: 0.1,         // Sync marker duration in seconds
    volume: 0.8                // Output volume (0-1)
};

// Symbol mapping (similar to color mapping in visual encoder)
const SYMBOL_COUNT = 8;  // 8 symbols (representing 3 bits each)

/**
 * Converts text to binary representation
 * @param {string} text - The text to convert
 * @returns {string} - Binary representation of the text
 */
function textToBinary(text) {
    return Array.from(text)
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');
}

/**
 * Converts binary data to a sequence of symbol indexes
 * @param {string} binary - Binary string
 * @returns {number[]} - Array of symbol indexes
 */
function binaryToSymbolIndexes(binary) {
    const symbolIndexes = [];
    const bitsPerSymbol = Math.log2(SYMBOL_COUNT);

    // Process binary data in chunks of bitsPerSymbol
    for (let i = 0; i < binary.length; i += bitsPerSymbol) {
        const chunk = binary.slice(i, i + bitsPerSymbol).padEnd(bitsPerSymbol, '0');
        const index = parseInt(chunk, 2);
        symbolIndexes.push(index);
    }

    return symbolIndexes;
}

/**
 * Calculates checksum for a sequence of symbol indexes
 * @param {number[]} symbolIndexes - Array of symbol indexes
 * @returns {number} - Checksum value (0-7)
 */
function calculateChecksum(symbolIndexes) {
    const sum = symbolIndexes.reduce((acc, index) => acc + index, 0);
    return sum % SYMBOL_COUNT; // Keep in the range 0-7 for our 8 symbols
}

/**
 * Creates a metadata header with information about the message
 * @param {string} text - Original text message
 * @returns {number[]} - Symbol indexes for the metadata header
 */
function createMetadataHeader(text) {
    // Encode message length as 8-bit binary (supports up to 255 characters)
    const lengthBinary = text.length.toString(2).padStart(8, '0');

    // Convert to symbol indexes
    return binaryToSymbolIndexes(lengthBinary);
}

/**
 * Generates an audio buffer for a single frequency
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @returns {AudioBuffer} - Audio buffer containing the tone
 */
function generateTone(audioContext, frequency, duration) {
    const samples = Math.floor(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, samples, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
        // Sine wave at the specified frequency
        data[i] = Math.sin(2 * Math.PI * frequency * i / audioContext.sampleRate) * AUDIO_CONFIG.volume;

        // Apply fade in/out to reduce clicks
        const fadeTime = Math.min(0.01, duration / 10); // 10% of duration or 10ms, whichever is smaller
        const fadeSamples = Math.floor(fadeTime * audioContext.sampleRate);

        if (i < fadeSamples) {
            // Fade in
            data[i] *= (i / fadeSamples);
        } else if (i > samples - fadeSamples) {
            // Fade out
            data[i] *= ((samples - i) / fadeSamples);
        }
    }

    return buffer;
}

/**
 * Generates an audio buffer for a sequence of symbols
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {number[]} symbolIndexes - Array of symbol indexes
 * @returns {AudioBuffer} - Audio buffer containing the encoded message
 */
function generateSymbolSequence(audioContext, symbolIndexes) {
    // Calculate total duration
    const symbolsWithPause = symbolIndexes.length * (AUDIO_CONFIG.symbolDuration + AUDIO_CONFIG.pauseDuration);
    const totalDuration = AUDIO_CONFIG.startMarkerDuration + AUDIO_CONFIG.syncDuration +
        symbolsWithPause + AUDIO_CONFIG.syncDuration + AUDIO_CONFIG.endMarkerDuration;

    // Create buffer for the entire sequence
    const totalSamples = Math.floor(audioContext.sampleRate * totalDuration);
    const buffer = audioContext.createBuffer(1, totalSamples, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    let currentTime = 0;
    let currentSample = 0;

    // Add start marker
    const startMarkerSamples = Math.floor(audioContext.sampleRate * AUDIO_CONFIG.startMarkerDuration);
    for (let i = 0; i < startMarkerSamples; i++) {
        data[currentSample++] = Math.sin(2 * Math.PI * AUDIO_CONFIG.startMarkerFreq * i / audioContext.sampleRate) * AUDIO_CONFIG.volume;
    }
    currentTime += AUDIO_CONFIG.startMarkerDuration;

    // Add sync tone
    const syncSamples = Math.floor(audioContext.sampleRate * AUDIO_CONFIG.syncDuration);
    for (let i = 0; i < syncSamples; i++) {
        data[currentSample++] = Math.sin(2 * Math.PI * AUDIO_CONFIG.syncFreq * i / audioContext.sampleRate) * AUDIO_CONFIG.volume;
    }
    currentTime += AUDIO_CONFIG.syncDuration;

    // Add each symbol with pause
    for (const symbolIndex of symbolIndexes) {
        // Calculate frequency for this symbol
        const frequency = AUDIO_CONFIG.baseFrequency + (symbolIndex * AUDIO_CONFIG.freqShift);

        // Add symbol tone
        const symbolSamples = Math.floor(audioContext.sampleRate * AUDIO_CONFIG.symbolDuration);
        for (let i = 0; i < symbolSamples; i++) {
            data[currentSample++] = Math.sin(2 * Math.PI * frequency * i / audioContext.sampleRate) * AUDIO_CONFIG.volume;
        }
        currentTime += AUDIO_CONFIG.symbolDuration;

        // Add pause
        const pauseSamples = Math.floor(audioContext.sampleRate * AUDIO_CONFIG.pauseDuration);
        for (let i = 0; i < pauseSamples; i++) {
            data[currentSample++] = 0; // Silence
        }
        currentTime += AUDIO_CONFIG.pauseDuration;
    }

    // Add sync tone
    for (let i = 0; i < syncSamples; i++) {
        data[currentSample++] = Math.sin(2 * Math.PI * AUDIO_CONFIG.syncFreq * i / audioContext.sampleRate) * AUDIO_CONFIG.volume;
    }
    currentTime += AUDIO_CONFIG.syncDuration;

    // Add end marker
    const endMarkerSamples = Math.floor(audioContext.sampleRate * AUDIO_CONFIG.endMarkerDuration);
    for (let i = 0; i < endMarkerSamples; i++) {
        data[currentSample++] = Math.sin(2 * Math.PI * AUDIO_CONFIG.endMarkerFreq * i / audioContext.sampleRate) * AUDIO_CONFIG.volume;
    }

    return buffer;
}

/**
 * Encodes text into an audio buffer for transmission
 * @param {string} text - Text to encode
 * @returns {Promise<AudioBuffer>} - Promise resolving to an audio buffer
 */
async function encodeText(text) {
    if (!text || text.length === 0) {
        throw new Error('Cannot encode empty message');
    }

    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Convert text to binary
    const binary = textToBinary(text);

    // Convert binary to symbol indexes
    const symbolIndexes = binaryToSymbolIndexes(binary);

    // Calculate checksum
    const checksum = calculateChecksum(symbolIndexes);

    // Create metadata header
    const metadataHeader = createMetadataHeader(text);

    // Combine all parts
    const fullSequence = [
        ...metadataHeader,
        ...symbolIndexes,
        checksum
    ];

    // Generate audio buffer
    return generateSymbolSequence(audioContext, fullSequence);
}

/**
 * Plays an audio buffer
 * @param {AudioBuffer} buffer - Audio buffer to play
 * @returns {Promise<void>} - Promise that resolves when playback completes
 */
function playAudioBuffer(buffer) {
    return new Promise((resolve) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);

        source.onended = () => {
            resolve();
        };

        source.start();
    });
}

/**
 * Checks if the audio channel is busy (has significant audio activity)
 * @returns {Promise<boolean>} - Promise resolving to true if channel is busy
 */
async function isChannelBusy() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);

        microphone.connect(analyser);
        analyser.fftSize = 256;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

        // Clean up
        stream.getTracks().forEach(track => track.stop());

        // If average is above threshold, channel is busy
        return average > 30; // Threshold can be adjusted
    } catch (error) {
        console.error('Error checking audio channel:', error);
        return false; // Assume not busy if we can't check
    }
}

/**
 * Encodes and transmits text as audio
 * @param {string} text - Text to transmit
 * @returns {Promise<void>} - Promise that resolves when transmission completes
 */
async function transmitAudio(text) {
    // Check if channel is busy
    const busy = await isChannelBusy();
    if (busy) {
        throw new Error('Audio channel is busy');
    }

    // Encode text to audio buffer
    const buffer = await encodeText(text);

    // Play the buffer
    await playAudioBuffer(buffer);
}

export {
    AUDIO_CONFIG,
    encodeText,
    transmitAudio,
    isChannelBusy,
    playAudioBuffer,
    textToBinary,
    binaryToSymbolIndexes,
    calculateChecksum
}; 