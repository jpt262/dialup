/**
 * DialUp Frame Analyzer Module
 * Analyzes video frames to detect colors for visual data reception
 */

import { COLORS } from '../core/encoder.js';

/**
 * Calculates Euclidean distance between two RGB colors
 * @param {number[]} rgb1 - First RGB color [r, g, b]
 * @param {number[]} rgb2 - Second RGB color [r, g, b]
 * @returns {number} - Distance between colors
 */
function colorDistance(rgb1, rgb2) {
    return Math.sqrt(
        Math.pow(rgb1[0] - rgb2[0], 2) +
        Math.pow(rgb1[1] - rgb2[1], 2) +
        Math.pow(rgb1[2] - rgb2[2], 2)
    );
}

/**
 * Converts a hex color code to RGB
 * @param {string} hex - Color in hex format (#RRGGBB)
 * @returns {number[]} - RGB array [r, g, b]
 */
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return [r, g, b];
}

/**
 * Finds the closest matching color from the COLORS array to a given RGB color
 * @param {number[]} rgb - RGB color [r, g, b]
 * @returns {Object} - Object containing the matched color and index
 */
function findClosestColor(rgb) {
    let minDistance = Infinity;
    let closestColor = null;
    let closestIndex = -1;

    // Convert each color in the COLORS array to RGB and find the closest
    COLORS.forEach((color, index) => {
        const colorRgb = hexToRgb(color);
        const distance = colorDistance(rgb, colorRgb);

        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
            closestIndex = index;
        }
    });

    return {
        color: closestColor,
        index: closestIndex,
        distance: minDistance
    };
}

/**
 * Configuration options for color detection
 * @typedef {Object} ColorDetectionOptions
 * @property {number} threshold - Color distance threshold for matches (0-255)
 * @property {number} minChangeTime - Minimum time (ms) between color changes
 * @property {number} samplesRequired - Number of consistent samples required to confirm a color
 */

/**
 * Default color detection options
 * @type {ColorDetectionOptions}
 */
const DEFAULT_OPTIONS = {
    threshold: 50,      // Maximum color distance to consider a match
    minChangeTime: 50,  // Minimum ms between color changes
    samplesRequired: 3  // Number of consistent samples to confirm a color
};

/**
 * Creates a frame analyzer for detecting colors in video frames
 * @param {ColorDetectionOptions} [options] - Configuration options
 * @returns {Object} - Frame analyzer object
 */
function createFrameAnalyzer(options = {}) {
    // Merge default options with provided options
    const analyzerOptions = { ...DEFAULT_OPTIONS, ...options };

    // State variables
    let lastDetectedColor = null;
    let lastChangeTime = 0;
    let stableColorCount = 0;
    let currentSamples = [];
    let onColorDetectedCallback = null;

    /**
     * Analyzes an RGB color value to identify the corresponding color from the predefined set
     * @param {number[]} rgb - RGB color array [r, g, b]
     * @param {number} timestamp - Current timestamp in ms
     * @returns {string|null} - Detected color hex code or null if unstable
     */
    function analyzeColor(rgb, timestamp = Date.now()) {
        // Find the closest matching color
        const match = findClosestColor(rgb);

        // Check if the distance is within threshold
        if (match.distance > analyzerOptions.threshold) {
            // Reset stability counter if color is too far from any expected color
            stableColorCount = 0;
            currentSamples = [];
            return null;
        }

        // Add to current samples
        currentSamples.push(match.color);

        // Keep only the most recent samples
        if (currentSamples.length > analyzerOptions.samplesRequired) {
            currentSamples.shift();
        }

        // Check if all samples are the same color
        const allSamplesMatch = currentSamples.length === analyzerOptions.samplesRequired &&
            currentSamples.every(sample => sample === currentSamples[0]);

        if (allSamplesMatch) {
            const detectedColor = currentSamples[0];

            // Check if this is a new color
            if (detectedColor !== lastDetectedColor) {
                // Check if enough time has passed since the last change
                const timeSinceLastChange = timestamp - lastChangeTime;

                if (timeSinceLastChange >= analyzerOptions.minChangeTime) {
                    // New stable color detected
                    lastDetectedColor = detectedColor;
                    lastChangeTime = timestamp;
                    stableColorCount = 0;

                    // Notify callback if set
                    if (onColorDetectedCallback) {
                        onColorDetectedCallback(detectedColor);
                    }

                    return detectedColor;
                }
            } else {
                // Same as last detected color, increase stability count
                stableColorCount++;
            }
        } else {
            // Reset stability counter if samples don't all match
            stableColorCount = 0;
        }

        return null;
    }

    /**
     * Resets the analyzer state
     */
    function reset() {
        lastDetectedColor = null;
        lastChangeTime = 0;
        stableColorCount = 0;
        currentSamples = [];
    }

    /**
     * Sets a callback function to be called when a new color is detected
     * @param {function} callback - Function to call with detected color
     */
    function onColorDetected(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        onColorDetectedCallback = callback;
    }

    /**
     * Updates the analyzer options
     * @param {ColorDetectionOptions} newOptions - New options
     */
    function setOptions(newOptions) {
        Object.assign(analyzerOptions, newOptions);
    }

    /**
     * Gets the current analyzer state
     * @returns {Object} - Current state information
     */
    function getState() {
        return {
            lastDetectedColor,
            stableColorCount,
            currentSamples: [...currentSamples],
            options: { ...analyzerOptions }
        };
    }

    // Build and return the analyzer object
    return {
        analyzeColor,
        reset,
        onColorDetected,
        setOptions,
        getState
    };
}

export {
    createFrameAnalyzer,
    hexToRgb,
    colorDistance,
    findClosestColor
}; 