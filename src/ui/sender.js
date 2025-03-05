/**
 * DialUp Sender UI Module
 * Handles the user interface for sending visual data
 */

import { encode } from '../core/encoder.js';
import { createAnimationController } from '../animations/colorSequence.js';

/**
 * Creates a sender UI controller
 * @param {Object} elements - Required DOM elements
 * @param {HTMLElement} elements.transmissionBar - Element to animate with colors
 * @param {HTMLTextAreaElement} elements.messageInput - Text input for message
 * @param {HTMLSelectElement} elements.speedSelect - Speed selection dropdown
 * @param {HTMLButtonElement} elements.transmitButton - Button to start transmission
 * @param {HTMLElement} elements.statusElement - Element to display status
 * @returns {Object} - Sender UI controller
 */
function createSenderUI({
    transmissionBar,
    messageInput,
    speedSelect,
    transmitButton,
    statusElement
}) {
    // Validate required elements
    if (!transmissionBar || !messageInput || !speedSelect || !transmitButton || !statusElement) {
        throw new Error('Missing required UI elements');
    }

    // Create animation controller
    const animator = createAnimationController(transmissionBar);

    // State
    let isTransmitting = false;
    let messageHistory = [];

    /**
     * Updates the UI based on current state
     * @private
     */
    function updateUI() {
        if (isTransmitting) {
            transmitButton.disabled = true;
            transmitButton.textContent = 'Transmitting...';
            messageInput.disabled = true;
            speedSelect.disabled = true;
        } else {
            transmitButton.disabled = false;
            transmitButton.textContent = 'Start Transmission';
            messageInput.disabled = false;
            speedSelect.disabled = false;
        }
    }

    /**
     * Sets up character counter for message input
     * @private
     */
    function setupCharCounter() {
        const maxLength = messageInput.getAttribute('maxlength') || 256;
        const counterElement = document.getElementById('charCount');

        if (counterElement) {
            // Update counter initially
            counterElement.textContent = messageInput.value.length;

            // Update counter on input
            messageInput.addEventListener('input', () => {
                counterElement.textContent = messageInput.value.length;
            });
        }
    }

    /**
     * Updates the status display
     * @param {string} status - Status message
     * @param {string} [type='info'] - Status type (info, success, error)
     * @private
     */
    function updateStatus(status, type = 'info') {
        statusElement.textContent = status;

        // Remove existing status classes
        statusElement.classList.remove('status-info', 'status-success', 'status-error');

        // Add appropriate class
        statusElement.classList.add(`status-${type}`);
    }

    /**
     * Starts message transmission
     * @returns {Promise<void>}
     */
    async function startTransmission() {
        if (isTransmitting) return;

        const message = messageInput.value.trim();

        if (!message) {
            updateStatus('Please enter a message to transmit', 'error');
            return;
        }

        try {
            // Update state
            isTransmitting = true;
            updateUI();
            updateStatus('Preparing transmission...', 'info');

            // Encode message
            const { colors, metadata } = encode(message);

            // Get transmission speed
            const frameDuration = parseInt(speedSelect.value, 10);

            // Configure animator
            animator
                .setSequence(colors)
                .setFrameDuration(frameDuration)
                .onProgress(({ current, total, progress }) => {
                    const percent = Math.round(progress * 100);
                    updateStatus(`Transmitting: ${percent}% (${current}/${total})`, 'info');
                })
                .onComplete(() => {
                    // Add to history
                    addToHistory(message);

                    // Reset UI
                    isTransmitting = false;
                    updateUI();
                    updateStatus('Transmission complete', 'success');
                });

            // Start animation
            animator.start();

        } catch (error) {
            isTransmitting = false;
            updateUI();
            updateStatus(`Error: ${error.message}`, 'error');
            console.error('Transmission error:', error);
        }
    }

    /**
     * Cancels current transmission
     */
    function cancelTransmission() {
        if (!isTransmitting) return;

        animator.stop();
        isTransmitting = false;
        updateUI();
        updateStatus('Transmission cancelled', 'info');
    }

    /**
     * Adds a message to history
     * @param {string} message - The message to add
     * @private
     */
    function addToHistory(message) {
        const timestamp = new Date().toISOString();
        messageHistory.unshift({ message, timestamp });

        // Keep history limited to recent messages
        if (messageHistory.length > 10) {
            messageHistory.pop();
        }
    }

    /**
     * Gets the message history
     * @returns {Array} - Message history
     */
    function getHistory() {
        return [...messageHistory];
    }

    /**
     * Clears the input field
     */
    function clearInput() {
        messageInput.value = '';
        if (document.getElementById('charCount')) {
            document.getElementById('charCount').textContent = '0';
        }
    }

    /**
     * Initializes the sender UI
     */
    function init() {
        // Set up event listeners
        transmitButton.addEventListener('click', startTransmission);

        // Set up character counter
        setupCharCounter();

        // Initial UI update
        updateUI();
        updateStatus('Ready to transmit', 'info');
    }

    // Return the public API
    return {
        init,
        startTransmission,
        cancelTransmission,
        clearInput,
        getHistory
    };
}

export { createSenderUI }; 