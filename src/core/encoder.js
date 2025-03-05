/**
 * DialUp Encoder Module
 * Handles encoding of text data into color sequences for visual transmission
 */

// Color configuration - 8 colors (representing 3 bits each)
const COLORS = [
    '#FF0000', // Red (000)
    '#00FF00', // Green (001)
    '#0000FF', // Blue (010)
    '#FFFF00', // Yellow (011)
    '#FF00FF', // Magenta (100)
    '#00FFFF', // Cyan (101)
    '#FFFFFF', // White (110)
    '#000000'  // Black (111)
];

// Special signals
const START_SIGNAL = '#FF00FF'; // Magenta
const END_SIGNAL = '#0000FF';   // Blue
const SYNC_SIGNAL = '#FFFFFF';  // White

// Encoding configuration
const COLOR_BITS = 3; // 3 bits per color (8 colors)

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
 * Converts binary data to a sequence of color indexes
 * @param {string} binary - Binary string
 * @returns {number[]} - Array of color indexes
 */
function binaryToColorIndexes(binary) {
    const colorIndexes = [];

    // Process binary data in chunks of COLOR_BITS
    for (let i = 0; i < binary.length; i += COLOR_BITS) {
        const chunk = binary.slice(i, i + COLOR_BITS).padEnd(COLOR_BITS, '0');
        const index = parseInt(chunk, 2);
        colorIndexes.push(index);
    }

    return colorIndexes;
}

/**
 * Calculates checksum for a sequence of color indexes
 * @param {number[]} colorIndexes - Array of color indexes
 * @returns {number} - Checksum value (0-7)
 */
function calculateChecksum(colorIndexes) {
    const sum = colorIndexes.reduce((acc, index) => acc + index, 0);
    return sum % 8; // Keep in the range 0-7 for our 8 colors
}

/**
 * Encodes text into a full color sequence including start/end signals and checksum
 * @param {string} text - Text to encode
 * @returns {string[]} - Array of color hex codes
 */
function encodeText(text) {
    // Convert text to binary
    const binary = textToBinary(text);

    // Convert binary to color indexes
    const colorIndexes = binaryToColorIndexes(binary);

    // Calculate checksum
    const checksum = calculateChecksum(colorIndexes);

    // Convert indexes to actual colors
    const colorSequence = colorIndexes.map(index => COLORS[index]);

    // Add start signal, sync signal, and end signal
    const fullSequence = [
        START_SIGNAL,
        SYNC_SIGNAL,
        ...colorSequence,
        COLORS[checksum], // Add checksum color
        SYNC_SIGNAL,
        END_SIGNAL
    ];

    return fullSequence;
}

/**
 * Creates a metadata header with information about the message
 * @param {string} text - Original text message
 * @returns {string[]} - Color sequence for the metadata header
 */
function createMetadataHeader(text) {
    // Encode message length as 8-bit binary (supports up to 255 characters)
    const lengthBinary = text.length.toString(2).padStart(8, '0');

    // Convert to color indexes
    const lengthColorIndexes = binaryToColorIndexes(lengthBinary);

    // Convert to colors
    return lengthColorIndexes.map(index => COLORS[index]);
}

/**
 * Encodes text into a complete transmission sequence with metadata
 * @param {string} text - Text to encode
 * @returns {object} - Object containing color sequence and metadata
 */
function encode(text) {
    if (!text || text.length === 0) {
        throw new Error('Cannot encode empty message');
    }

    const metadataHeader = createMetadataHeader(text);
    const messageSequence = encodeText(text);

    // Combine metadata and message
    const fullSequence = [
        START_SIGNAL,
        ...metadataHeader,
        SYNC_SIGNAL,
        ...messageSequence.slice(1) // Skip the START_SIGNAL already included
    ];

    return {
        colors: fullSequence,
        metadata: {
            originalText: text,
            textLength: text.length,
            binaryLength: textToBinary(text).length,
            colorCount: messageSequence.length
        }
    };
}

export {
    COLORS,
    START_SIGNAL,
    END_SIGNAL,
    SYNC_SIGNAL,
    COLOR_BITS,
    encode,
    textToBinary,
    binaryToColorIndexes,
    calculateChecksum
}; 