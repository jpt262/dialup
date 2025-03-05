/**
 * DialUp Color Sequence Animator
 * Handles animation of color sequences for visual data transmission
 */

/**
 * Animation state object
 * @typedef {Object} AnimationState
 * @property {boolean} isRunning - Whether animation is currently running
 * @property {number} currentIndex - Current position in the sequence
 * @property {number|null} intervalId - ID of the running interval (or null if not running)
 * @property {function|null} onComplete - Callback for animation completion
 * @property {function|null} onProgress - Callback for animation progress updates
 */

/**
 * Creates an animation controller for a specific element
 * @param {HTMLElement} element - The element to animate
 * @returns {Object} - Animation controller object
 */
function createAnimationController(element) {
    if (!element) {
        throw new Error('No element provided for animation');
    }

    /** @type {AnimationState} */
    const state = {
        isRunning: false,
        currentIndex: 0,
        intervalId: null,
        onComplete: null,
        onProgress: null
    };

    let sequence = [];
    let frameDuration = 200; // Default frame duration in ms

    /**
     * Sets the color sequence to animate
     * @param {string[]} colorSequence - Array of color hex codes
     * @returns {Object} - The controller (for chaining)
     */
    function setSequence(colorSequence) {
        if (!Array.isArray(colorSequence) || colorSequence.length === 0) {
            throw new Error('Invalid color sequence');
        }

        // If currently animating, stop
        if (state.isRunning) {
            stop();
        }

        sequence = [...colorSequence];
        state.currentIndex = 0;

        return controller; // Return for chaining
    }

    /**
     * Sets the duration of each frame in the animation
     * @param {number} duration - Duration in milliseconds
     * @returns {Object} - The controller (for chaining)
     */
    function setFrameDuration(duration) {
        if (typeof duration !== 'number' || duration <= 0) {
            throw new Error('Invalid frame duration');
        }

        frameDuration = duration;
        return controller; // Return for chaining
    }

    /**
     * Sets callback for animation completion
     * @param {function} callback - Function to call when animation completes
     * @returns {Object} - The controller (for chaining)
     */
    function onComplete(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        state.onComplete = callback;
        return controller; // Return for chaining
    }

    /**
     * Sets callback for animation progress updates
     * @param {function} callback - Function to call on each frame
     * @returns {Object} - The controller (for chaining)
     */
    function onProgress(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        state.onProgress = callback;
        return controller; // Return for chaining
    }

    /**
     * Starts the animation
     * @returns {Object} - The controller (for chaining)
     */
    function start() {
        if (state.isRunning) {
            return controller; // Already running
        }

        if (sequence.length === 0) {
            throw new Error('No sequence set for animation');
        }

        state.isRunning = true;
        state.currentIndex = 0;

        // Show the first color immediately
        updateColor(sequence[state.currentIndex]);

        // Report initial progress
        if (state.onProgress) {
            state.onProgress({
                current: state.currentIndex,
                total: sequence.length,
                progress: 0,
                color: sequence[state.currentIndex]
            });
        }

        // Start interval for subsequent colors
        state.intervalId = setInterval(() => {
            state.currentIndex++;

            // Check if we've reached the end
            if (state.currentIndex >= sequence.length) {
                stop();

                // Call completion callback if set
                if (state.onComplete) {
                    state.onComplete();
                }

                return;
            }

            // Update color
            updateColor(sequence[state.currentIndex]);

            // Report progress
            if (state.onProgress) {
                state.onProgress({
                    current: state.currentIndex,
                    total: sequence.length,
                    progress: state.currentIndex / sequence.length,
                    color: sequence[state.currentIndex]
                });
            }
        }, frameDuration);

        return controller; // Return for chaining
    }

    /**
     * Stops the animation
     * @returns {Object} - The controller (for chaining)
     */
    function stop() {
        if (!state.isRunning) {
            return controller; // Not running
        }

        if (state.intervalId !== null) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }

        state.isRunning = false;

        return controller; // Return for chaining
    }

    /**
     * Pauses the animation
     * @returns {Object} - The controller (for chaining)
     */
    function pause() {
        if (!state.isRunning) {
            return controller; // Not running
        }

        if (state.intervalId !== null) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }

        state.isRunning = false;

        return controller; // Return for chaining
    }

    /**
     * Resumes a paused animation
     * @returns {Object} - The controller (for chaining)
     */
    function resume() {
        if (state.isRunning) {
            return controller; // Already running
        }

        if (sequence.length === 0) {
            throw new Error('No sequence set for animation');
        }

        if (state.currentIndex >= sequence.length) {
            state.currentIndex = 0; // Reset to beginning if at end
        }

        state.isRunning = true;

        // Show the current color immediately
        updateColor(sequence[state.currentIndex]);

        // Start interval for subsequent colors
        state.intervalId = setInterval(() => {
            state.currentIndex++;

            // Check if we've reached the end
            if (state.currentIndex >= sequence.length) {
                stop();

                // Call completion callback if set
                if (state.onComplete) {
                    state.onComplete();
                }

                return;
            }

            // Update color
            updateColor(sequence[state.currentIndex]);

            // Report progress
            if (state.onProgress) {
                state.onProgress({
                    current: state.currentIndex,
                    total: sequence.length,
                    progress: state.currentIndex / sequence.length,
                    color: sequence[state.currentIndex]
                });
            }
        }, frameDuration);

        return controller; // Return for chaining
    }

    /**
     * Resets the animation to the beginning
     * @returns {Object} - The controller (for chaining)
     */
    function reset() {
        stop();
        state.currentIndex = 0;

        // Reset element to its original color
        element.style.backgroundColor = '';

        return controller; // Return for chaining
    }

    /**
     * Gets current animation state
     * @returns {Object} - Animation state information
     */
    function getState() {
        return {
            isRunning: state.isRunning,
            currentIndex: state.currentIndex,
            totalFrames: sequence.length,
            progress: sequence.length ? state.currentIndex / sequence.length : 0,
            frameDuration
        };
    }

    /**
     * Updates the element's color
     * @param {string} color - The color to display
     * @private
     */
    function updateColor(color) {
        element.style.backgroundColor = color;
    }

    // Build and return the controller object
    const controller = {
        setSequence,
        setFrameDuration,
        onComplete,
        onProgress,
        start,
        stop,
        pause,
        resume,
        reset,
        getState
    };

    return controller;
}

export { createAnimationController }; 