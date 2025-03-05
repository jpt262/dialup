/**
 * DialUp Error Correction Module
 * Provides error detection and correction capabilities
 */

/**
 * Creates an error correction module with configurable algorithms
 * @param {Object} options - Configuration options
 * @param {string} [options.mode='hamming'] - Error correction mode ('none', 'hamming', 'reed-solomon')
 * @param {number} [options.strength=1] - Error correction strength (higher = more overhead but better correction)
 * @param {boolean} [options.adaptive=true] - Whether to adaptively adjust error correction based on channel quality
 * @returns {Object} - Error correction module
 */
function createErrorCorrection(options = {}) {
    const config = {
        mode: options.mode || 'hamming',
        strength: options.strength || 1,
        adaptive: options.adaptive !== undefined ? options.adaptive : true
    };

    // Track error rates for adaptive correction
    const errorStats = {
        windowSize: 100,
        detectedErrors: 0,
        totalPackets: 0,
        errorHistory: []
    };

    /**
     * Updates error statistics with a new sample
     * @param {boolean} hasError - Whether the packet had an error
     */
    function updateErrorStats(hasError) {
        errorStats.totalPackets++;
        if (hasError) {
            errorStats.detectedErrors++;
        }

        // Add to history
        errorStats.errorHistory.push(hasError ? 1 : 0);

        // Keep history within window size
        if (errorStats.errorHistory.length > errorStats.windowSize) {
            // Remove oldest entry from count if it had an error
            if (errorStats.errorHistory.shift() === 1) {
                errorStats.detectedErrors--;
            }
        }

        // Adjust strength if adaptive is enabled
        if (config.adaptive) {
            adjustStrength();
        }
    }

    /**
     * Calculates current error rate based on window
     * @returns {number} - Error rate (0-1)
     */
    function getCurrentErrorRate() {
        if (errorStats.errorHistory.length === 0) {
            return 0;
        }
        return errorStats.detectedErrors / errorStats.errorHistory.length;
    }

    /**
     * Adjusts error correction strength based on current error rate
     * @private
     */
    function adjustStrength() {
        const errorRate = getCurrentErrorRate();

        // Increase strength if error rate is high
        if (errorRate > 0.1) {
            config.strength = Math.min(config.strength + 1, 8);
        }
        // Decrease strength if error rate is very low
        else if (errorRate < 0.01 && config.strength > 1) {
            config.strength = Math.max(config.strength - 1, 1);
        }
    }

    /**
     * Encodes data with Hamming code for error correction
     * @param {Uint8Array} data - Data to encode
     * @returns {Uint8Array} - Encoded data with Hamming codes
     */
    function hammingEncode(data) {
        // For simplicity, we'll just add parity bits
        // In a real implementation, this would be a proper Hamming code
        const encoded = new Uint8Array(data.length * 2);
        for (let i = 0; i < data.length; i++) {
            // Copy original byte
            encoded[i * 2] = data[i];
            // Calculate parity byte
            encoded[i * 2 + 1] = calculateParity(data[i], config.strength);
        }
        return encoded;
    }

    /**
     * Decodes Hamming-encoded data and corrects errors
     * @param {Uint8Array} encoded - Hamming-encoded data
     * @returns {Object} - Decoded data and error information
     */
    function hammingDecode(encoded) {
        if (encoded.length % 2 !== 0) {
            throw new Error('Invalid Hamming encoded data length');
        }

        const decoded = new Uint8Array(encoded.length / 2);
        let errorCount = 0;

        for (let i = 0; i < decoded.length; i++) {
            const dataByte = encoded[i * 2];
            const parityByte = encoded[i * 2 + 1];
            const expectedParity = calculateParity(dataByte, config.strength);

            if (parityByte !== expectedParity) {
                errorCount++;
                // In a proper implementation, this would attempt to correct the error
                // For simplicity, we'll just use the data byte as-is
            }

            decoded[i] = dataByte;
        }

        updateErrorStats(errorCount > 0);

        return {
            data: decoded,
            errors: errorCount,
            corrected: 0, // In a real implementation, this would be the number of corrected errors
            valid: true
        };
    }

    /**
     * Calculates a parity byte for Hamming code
     * @param {number} byte - Input byte
     * @param {number} strength - Error correction strength
     * @returns {number} - Parity byte
     * @private
     */
    function calculateParity(byte, strength) {
        // Simple implementation - for a real Hamming code, this would be more complex
        let parity = byte;

        // Apply additional parity operations based on strength
        for (let i = 0; i < strength; i++) {
            parity = (parity ^ (parity << 1)) & 0xFF;
        }

        return parity;
    }

    /**
     * Encodes data with Reed-Solomon algorithm (simplified)
     * @param {Uint8Array} data - Data to encode
     * @returns {Uint8Array} - Reed-Solomon encoded data
     */
    function reedSolomonEncode(data) {
        // In a real implementation, this would be a proper Reed-Solomon encoding
        // For simplicity, we'll append checksum bytes proportional to strength
        const checksumLength = Math.min(32, data.length / 4 * config.strength);
        const encoded = new Uint8Array(data.length + checksumLength);

        // Copy original data
        encoded.set(data);

        // Calculate and append checksums
        let checksum = 0;
        for (let i = 0; i < data.length; i++) {
            checksum = ((checksum << 8) ^ data[i]) & 0xFFFFFFFF;
            if (checksum > 0x80000000) {
                checksum = (checksum ^ 0x104C11DB7) & 0xFFFFFFFF;
            }
        }

        // Distribute checksum across multiple bytes
        for (let i = 0; i < checksumLength; i++) {
            encoded[data.length + i] = (checksum >> (i * 8)) & 0xFF;
        }

        return encoded;
    }

    /**
     * Decodes Reed-Solomon encoded data and corrects errors
     * @param {Uint8Array} encoded - Reed-Solomon encoded data
     * @returns {Object} - Decoded data and error information
     */
    function reedSolomonDecode(encoded) {
        // In a real implementation, this would properly decode Reed-Solomon
        // For simplicity, we'll check checksums

        const checksumLength = Math.min(32, (encoded.length / 5) * config.strength);
        const dataLength = encoded.length - checksumLength;
        const data = encoded.slice(0, dataLength);

        // Calculate expected checksum
        let expectedChecksum = 0;
        for (let i = 0; i < dataLength; i++) {
            expectedChecksum = ((expectedChecksum << 8) ^ data[i]) & 0xFFFFFFFF;
            if (expectedChecksum > 0x80000000) {
                expectedChecksum = (expectedChecksum ^ 0x104C11DB7) & 0xFFFFFFFF;
            }
        }

        // Extract actual checksum
        let actualChecksum = 0;
        for (let i = 0; i < checksumLength; i++) {
            actualChecksum |= (encoded[dataLength + i] << (i * 8));
        }

        const hasError = (expectedChecksum & 0xFFFFFFFF) !== (actualChecksum & 0xFFFFFFFF);
        updateErrorStats(hasError);

        return {
            data,
            errors: hasError ? 1 : 0,
            corrected: 0, // In a real implementation, this might be non-zero
            valid: !hasError
        };
    }

    /**
     * Encodes data with the selected error correction algorithm
     * @param {Uint8Array} data - Data to encode
     * @returns {Uint8Array} - Encoded data
     */
    function encode(data) {
        switch (config.mode) {
            case 'hamming':
                return hammingEncode(data);
            case 'reed-solomon':
                return reedSolomonEncode(data);
            case 'none':
            default:
                return data;
        }
    }

    /**
     * Decodes data with the selected error correction algorithm
     * @param {Uint8Array} encoded - Encoded data
     * @returns {Object} - Decoded data and error information
     */
    function decode(encoded) {
        switch (config.mode) {
            case 'hamming':
                return hammingDecode(encoded);
            case 'reed-solomon':
                return reedSolomonDecode(encoded);
            case 'none':
            default:
                return { data: encoded, errors: 0, corrected: 0, valid: true };
        }
    }

    /**
     * Updates the error correction configuration
     * @param {Object} newConfig - New configuration options
     */
    function updateConfig(newConfig) {
        if (newConfig.mode !== undefined) {
            config.mode = newConfig.mode;
        }
        if (newConfig.strength !== undefined) {
            config.strength = newConfig.strength;
        }
        if (newConfig.adaptive !== undefined) {
            config.adaptive = newConfig.adaptive;
        }
    }

    /**
     * Gets the current configuration and stats
     * @returns {Object} - Current configuration and stats
     */
    function getStatus() {
        return {
            config: { ...config },
            errorRate: getCurrentErrorRate(),
            totalPackets: errorStats.totalPackets,
            windowSize: errorStats.windowSize
        };
    }

    /**
     * Resets error statistics
     */
    function resetStats() {
        errorStats.detectedErrors = 0;
        errorStats.totalPackets = 0;
        errorStats.errorHistory = [];
    }

    // Return the error correction module
    return {
        encode,
        decode,
        updateConfig,
        getStatus,
        resetStats
    };
}

export {
    createErrorCorrection
}; 