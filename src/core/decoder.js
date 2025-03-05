/**
 * DialUp Decoder Module
 * Handles decoding of color sequences back to text data
 */

import { COLORS, START_SIGNAL, END_SIGNAL, SYNC_SIGNAL, COLOR_BITS } from './encoder.js';

/**
 * Converts a color to its index in the COLORS array
 * @param {string} color - The color hex code
 * @returns {number} - The index of the color, or -1 if not found
 */
function colorToIndex(color) {
    return COLORS.indexOf(color);
}

/**
 * Converts a sequence of color indexes to binary
 * @param {number[]} colorIndexes - Array of color indexes
 * @returns {string} - Binary string
 */
function colorIndexesToBinary(colorIndexes) {
    return colorIndexes
        .map(index => index.toString(2).padStart(COLOR_BITS, '0'))
        .join('');
}

/**
 * Converts binary to text
 * @param {string} binary - Binary string
 * @returns {string} - Decoded text
 */
function binaryToText(binary) {
    const bytes = [];

    // Process binary data in chunks of 8 bits (1 byte)
    for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.slice(i, i + 8).padEnd(8, '0');
        bytes.push(parseInt(byte, 2));
    }

    // Convert bytes to characters
    return String.fromCharCode(...bytes);
}

/**
 * Verifies checksum for a sequence of color indexes
 * @param {number[]} colorIndexes - Array of color indexes
 * @param {number} receivedChecksum - The received checksum
 * @returns {boolean} - Whether the checksum is valid
 */
function verifyChecksum(colorIndexes, receivedChecksum) {
    const calculatedSum = colorIndexes.reduce((acc, index) => acc + index, 0);
    const calculatedChecksum = calculatedSum % 8;

    return calculatedChecksum === receivedChecksum;
}

/**
 * Extracts the message length from the metadata header
 * @param {string[]} colorSequence - The color sequence to decode
 * @returns {number|null} - The message length or null if invalid
 */
function extractMessageLength(colorSequence) {
    // Look for start signal and sync signal
    const startIndex = colorSequence.indexOf(START_SIGNAL);
    if (startIndex === -1) return null;

    const syncIndex = colorSequence.indexOf(SYNC_SIGNAL, startIndex + 1);
    if (syncIndex === -1) return null;

    // Extract metadata colors (between start and sync signals)
    const metadataColors = colorSequence.slice(startIndex + 1, syncIndex);
    if (metadataColors.length === 0) return null;

    // Convert to indexes and then binary
    const metadataIndexes = metadataColors.map(colorToIndex);
    const metadataBinary = colorIndexesToBinary(metadataIndexes);

    // Extract message length (first 8 bits)
    const lengthBinary = metadataBinary.slice(0, 8);
    return parseInt(lengthBinary, 2);
}

/**
 * Decodes a color sequence back to text
 * @param {string[]} colorSequence - The color sequence to decode
 * @returns {object} - Decoded data and metadata
 */
function decode(colorSequence) {
    if (!colorSequence || colorSequence.length < 5) {
        throw new Error('Invalid color sequence: too short');
    }

    // Check for start and end signals
    const startIndex = colorSequence.indexOf(START_SIGNAL);
    if (startIndex === -1) {
        throw new Error('Invalid color sequence: no start signal found');
    }

    const endIndex = colorSequence.lastIndexOf(END_SIGNAL);
    if (endIndex === -1) {
        throw new Error('Invalid color sequence: no end signal found');
    }

    // Extract message length from metadata
    const expectedLength = extractMessageLength(colorSequence);

    // Find the sync signal after metadata
    const syncIndex = colorSequence.indexOf(SYNC_SIGNAL, startIndex + 1);
    if (syncIndex === -1) {
        throw new Error('Invalid color sequence: no sync signal found');
    }

    // Find the sync signal before the end signal
    const lastSyncIndex = colorSequence.lastIndexOf(SYNC_SIGNAL, endIndex - 1);
    if (lastSyncIndex === -1) {
        throw new Error('Invalid color sequence: no final sync signal found');
    }

    // Extract data colors (between first sync and last sync)
    const dataColors = colorSequence.slice(syncIndex + 1, lastSyncIndex);

    // Extract checksum (the color before the last sync)
    const checksumColor = dataColors.pop();
    const checksumIndex = colorToIndex(checksumColor);

    // Convert colors to indexes
    const colorIndexes = dataColors.map(colorToIndex);

    // Verify checksum
    const checksumValid = verifyChecksum(colorIndexes, checksumIndex);
    if (!checksumValid) {
        throw new Error('Invalid color sequence: checksum verification failed');
    }

    // Convert to binary
    const binary = colorIndexesToBinary(colorIndexes);

    // Convert binary to text
    const text = binaryToText(binary);

    // Verify length if we have the metadata
    if (expectedLength !== null && text.length !== expectedLength) {
        console.warn(`Warning: Decoded text length (${text.length}) doesn't match expected length (${expectedLength})`);
    }

    return {
        text,
        metadata: {
            checksumValid,
            expectedLength,
            actualLength: text.length,
            colorCount: colorSequence.length
        }
    };
}

/**
 * Processes a received color and updates decoding state
 * @param {Object} state - Current decoding state
 * @param {string} color - The received color
 * @returns {Object} - Updated state and decoded message if complete
 */
function processReceivedColor(state, color) {
    // Initialize state if needed
    if (!state) {
        state = {
            collecting: false,
            colors: [],
            complete: false,
            message: null,
            error: null
        };
    }

    // Update state based on the received color
    if (color === START_SIGNAL) {
        // Start new transmission
        return {
            collecting: true,
            colors: [color],
            complete: false,
            message: null,
            error: null
        };
    } else if (state.collecting) {
        // Add color to sequence
        const updatedColors = [...state.colors, color];

        if (color === END_SIGNAL) {
            // End of transmission, try to decode
            try {
                const result = decode(updatedColors);
                return {
                    collecting: false,
                    colors: updatedColors,
                    complete: true,
                    message: result,
                    error: null
                };
            } catch (err) {
                return {
                    collecting: false,
                    colors: updatedColors,
                    complete: true,
                    message: null,
                    error: err.message
                };
            }
        }

        // Continue collecting
        return {
            ...state,
            colors: updatedColors
        };
    }

    // Not collecting and not start signal
    return state;
}

export {
    decode,
    colorToIndex,
    colorIndexesToBinary,
    binaryToText,
    verifyChecksum,
    processReceivedColor
}; 