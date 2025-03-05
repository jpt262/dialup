/**
 * DialUp Color Tracker Module
 * Tracks sequences of colors for visual data reception
 */

import { createFrameAnalyzer } from './frameAnalyzer.js';
import { processReceivedColor } from '../core/decoder.js';
import { START_SIGNAL, END_SIGNAL } from '../core/encoder.js';

/**
 * Color tracker options
 * @typedef {Object} ColorTrackerOptions
 * @property {number} threshold - Color distance threshold for matches (0-255)
 * @property {number} minChangeTime - Minimum time (ms) between color changes
 * @property {number} samplesRequired - Number of consistent samples required to confirm a color
 * @property {number} maxSequenceLength - Maximum sequence length to track (to prevent memory issues)
 * @property {number} timeoutDuration - Duration (ms) after which to reset if no END_SIGNAL is detected
 */

/**
 * Default color tracker options
 * @type {ColorTrackerOptions}
 */
const DEFAULT_OPTIONS = {
    threshold: 50,            // Maximum color distance to consider a match
    minChangeTime: 50,        // Minimum ms between color changes
    samplesRequired: 3,       // Number of consistent samples to confirm a color
    maxSequenceLength: 1000,  // Maximum sequence length to track
    timeoutDuration: 30000    // 30 seconds timeout
};

/**
 * Creates a color tracker for detecting and tracking color sequences
 * @param {Object} [options] - Configuration options
 * @returns {Object} - Color tracker object
 */
function createColorTracker(options = {}) {
    // Merge default options with provided options
    const trackerOptions = { ...DEFAULT_OPTIONS, ...options };

    // Create frame analyzer
    const analyzer = createFrameAnalyzer({
        threshold: trackerOptions.threshold,
        minChangeTime: trackerOptions.minChangeTime,
        samplesRequired: trackerOptions.samplesRequired
    });

    // State variables
    let tracking = false;
    let colorSequence = [];
    let decodingState = null;
    let lastActivityTime = 0;
    let timeoutId = null;
    let onMessageCallback = null;
    let onStatusChangeCallback = null;

    /**
     * Updates tracker status and notifies via callback
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
     * Processes a new RGB color from a frame
     * @param {number[]} rgb - RGB color array [r, g, b]
     * @param {number} timestamp - Current timestamp in ms
     */
    function processColor(rgb, timestamp = Date.now()) {
        lastActivityTime = timestamp;

        // Use frame analyzer to get stable color
        const detectedColor = analyzer.analyzeColor(rgb, timestamp);

        // If a stable color was detected
        if (detectedColor) {
            // Add to color sequence if tracking
            if (tracking) {
                colorSequence.push(detectedColor);

                // Check maximum sequence length
                if (colorSequence.length > trackerOptions.maxSequenceLength) {
                    updateStatus('error', { message: 'Maximum sequence length exceeded' });
                    reset();
                    return;
                }

                // Update status
                updateStatus('tracking', {
                    color: detectedColor,
                    count: colorSequence.length
                });

                // Process the color for decoding
                decodingState = processReceivedColor(decodingState, detectedColor);

                // Check if we've completed a message
                if (decodingState && decodingState.complete) {
                    // Check if decoding was successful
                    if (decodingState.message) {
                        // Notify via callback
                        if (onMessageCallback) {
                            onMessageCallback(decodingState.message);
                        }

                        updateStatus('decoded', { message: decodingState.message });
                    } else {
                        updateStatus('error', { message: decodingState.error });
                    }

                    // Reset for next message
                    reset();
                }

                // Reset timeout timer
                resetTimeout();
            } else if (detectedColor === START_SIGNAL) {
                // Start tracking if we see a start signal
                tracking = true;
                colorSequence = [detectedColor];
                decodingState = processReceivedColor(null, detectedColor);

                updateStatus('started', {
                    timestamp: timestamp
                });

                // Start timeout timer
                startTimeout();
            }
        }
    }

    /**
     * Starts the timeout timer
     * @private
     */
    function startTimeout() {
        // Clear any existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Set new timeout
        timeoutId = setTimeout(() => {
            // If still tracking after timeout duration, reset
            const timeSinceActivity = Date.now() - lastActivityTime;
            if (tracking && timeSinceActivity >= trackerOptions.timeoutDuration) {
                updateStatus('timeout', {
                    duration: trackerOptions.timeoutDuration
                });
                reset();
            }
        }, trackerOptions.timeoutDuration);
    }

    /**
     * Resets the timeout timer
     * @private
     */
    function resetTimeout() {
        if (timeoutId) {
            clearTimeout(timeoutId);
            startTimeout();
        }
    }

    /**
     * Resets the tracker state
     */
    function reset() {
        tracking = false;
        colorSequence = [];
        decodingState = null;

        // Clear timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        // Reset analyzer
        analyzer.reset();

        updateStatus('reset');
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
     * Updates the tracker options
     * @param {ColorTrackerOptions} newOptions - New options
     */
    function setOptions(newOptions) {
        Object.assign(trackerOptions, newOptions);

        // Update analyzer options
        analyzer.setOptions({
            threshold: trackerOptions.threshold,
            minChangeTime: trackerOptions.minChangeTime,
            samplesRequired: trackerOptions.samplesRequired
        });
    }

    /**
     * Gets the current tracker state
     * @returns {Object} - Current state information
     */
    function getState() {
        return {
            tracking,
            sequenceLength: colorSequence.length,
            lastActivity: lastActivityTime,
            options: { ...trackerOptions },
            analyzerState: analyzer.getState()
        };
    }

    // Build and return the tracker object
    return {
        processColor,
        reset,
        onMessage,
        onStatusChange,
        setOptions,
        getState
    };
}

export { createColorTracker }; 