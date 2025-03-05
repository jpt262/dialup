/**
 * DialUp Binary/Hex Converter Module
 * Utilities for converting between text, binary, and hex formats
 */

/**
 * Converts text to binary string
 * @param {string} text - Text to convert
 * @returns {string} - Binary representation
 */
function textToBinary(text) {
    return Array.from(text)
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');
}

/**
 * Converts binary string to text
 * @param {string} binary - Binary string (must be multiple of 8 bits)
 * @returns {string} - Decoded text
 */
function binaryToText(binary) {
    if (binary.length % 8 !== 0) {
        throw new Error('Binary string length must be multiple of 8');
    }

    return binary.match(/.{8}/g)
        .map(byte => String.fromCharCode(parseInt(byte, 2)))
        .join('');
}

/**
 * Converts text to hexadecimal string
 * @param {string} text - Text to convert
 * @returns {string} - Hexadecimal representation
 */
function textToHex(text) {
    return Array.from(text)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Converts hexadecimal string to text
 * @param {string} hex - Hex string (must be multiple of 2 chars)
 * @returns {string} - Decoded text
 */
function hexToText(hex) {
    if (hex.length % 2 !== 0) {
        throw new Error('Hex string length must be multiple of 2');
    }

    return hex.match(/.{2}/g)
        .map(byte => String.fromCharCode(parseInt(byte, 16)))
        .join('');
}

/**
 * Validates if a string is valid binary (contains only 0s and 1s)
 * @param {string} binary - Binary string to validate
 * @returns {boolean} - Whether the string is valid binary
 */
function isValidBinary(binary) {
    return /^[01]+$/.test(binary);
}

/**
 * Validates if a string is valid hexadecimal
 * @param {string} hex - Hex string to validate
 * @returns {boolean} - Whether the string is valid hex
 */
function isValidHex(hex) {
    return /^[0-9A-Fa-f]+$/.test(hex);
}

/**
 * Converts between different encoding formats
 * @param {string} content - Content to convert
 * @param {string} fromEncoding - Source encoding ('text', 'binary', 'hex')
 * @param {string} toEncoding - Target encoding ('text', 'binary', 'hex')
 * @returns {string} - Converted content
 */
function convertEncoding(content, fromEncoding, toEncoding) {
    if (fromEncoding === toEncoding) {
        return content;
    }

    // First convert to text as intermediate format if needed
    let textContent = content;

    if (fromEncoding === 'binary') {
        if (!isValidBinary(content)) {
            throw new Error('Invalid binary string');
        }
        textContent = binaryToText(content);
    } else if (fromEncoding === 'hex') {
        if (!isValidHex(content)) {
            throw new Error('Invalid hex string');
        }
        textContent = hexToText(content);
    }

    // Then convert from text to target encoding
    if (toEncoding === 'binary') {
        return textToBinary(textContent);
    } else if (toEncoding === 'hex') {
        return textToHex(textContent);
    }

    return textContent;
}

export {
    textToBinary,
    binaryToText,
    textToHex,
    hexToText,
    isValidBinary,
    isValidHex,
    convertEncoding
}; 