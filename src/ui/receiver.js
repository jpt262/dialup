/**
 * DialUp Receiver UI Module
 * Handles the user interface for receiving visual data
 */

import { createCameraController } from '../capture/camera.js';
import { createColorTracker } from '../capture/colorTracker.js';

/**
 * Creates a receiver UI controller
 * @param {Object} elements - Required DOM elements
 * @param {HTMLVideoElement} elements.videoElement - Video element for camera feed
 * @param {HTMLButtonElement} elements.startButton - Button to start camera
 * @param {HTMLElement} elements.statusElement - Element to display status
 * @param {HTMLElement} elements.messagesList - Element to display received messages
 * @returns {Object} - Receiver UI controller
 */
function createReceiverUI({
    videoElement,
    startButton,
    statusElement,
    messagesList
}) {
    // Validate required elements
    if (!videoElement || !startButton || !statusElement || !messagesList) {
        throw new Error('Missing required UI elements');
    }

    // Create camera controller
    const camera = createCameraController(videoElement);

    // Create color tracker
    const tracker = createColorTracker();

    // State
    let isCameraActive = false;
    let messageHistory = [];

    /**
     * Defines the region of interest in the video frame
     * @private
     * @returns {Object} - Region coordinates
     */
    function getRegionOfInterest() {
        // Default to top area of video (where navbar would be)
        const videoWidth = videoElement.videoWidth || 640;
        const videoHeight = videoElement.videoHeight || 480;

        return {
            x: 0,
            y: 0,
            width: videoWidth,
            height: Math.min(60, Math.floor(videoHeight * 0.15)) // Top 15% or 60px
        };
    }

    /**
     * Updates the UI based on current state
     * @private
     */
    function updateUI() {
        if (isCameraActive) {
            startButton.textContent = 'Stop Camera';
        } else {
            startButton.textContent = 'Start Camera';
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
     * Processes frames from the camera
     * @param {ImageData} frame - Video frame data
     * @private
     */
    function processFrame(frame) {
        // Get region of interest for color detection
        const roi = getRegionOfInterest();

        // Get average color in the region
        const avgColor = camera.getRegionAverageColor(roi);

        if (avgColor) {
            // Pass to color tracker
            tracker.processColor(avgColor);
        }
    }

    /**
     * Handles status updates from the color tracker
     * @param {Object} statusEvent - Status event data
     * @private
     */
    function handleTrackerStatus(statusEvent) {
        const { status, data } = statusEvent;

        switch (status) {
            case 'started':
                updateStatus('Transmission detected! Receiving...', 'info');
                break;

            case 'tracking':
                // Update every 5 colors to avoid too many updates
                if (data.count % 5 === 0) {
                    updateStatus(`Receiving data: ${data.count} colors received`, 'info');
                }
                break;

            case 'decoded':
                updateStatus('Message received successfully!', 'success');
                break;

            case 'error':
                updateStatus(`Decoding error: ${data.message}`, 'error');
                break;

            case 'timeout':
                updateStatus('Reception timed out', 'error');
                break;

            case 'reset':
                // Don't update UI for resets unless we're not active
                if (!isCameraActive) {
                    updateStatus('Ready to receive', 'info');
                }
                break;
        }
    }

    /**
     * Handles received messages from the color tracker
     * @param {Object} message - Decoded message
     * @private
     */
    function handleReceivedMessage(message) {
        // Add to history
        addToHistory(message.text);

        // Update messages list
        displayMessages();
    }

    /**
     * Adds a message to history
     * @param {string} message - The message to add
     * @private
     */
    function addToHistory(message) {
        const timestamp = new Date().toISOString();
        messageHistory.unshift({ message, timestamp, received: true });

        // Keep history limited to recent messages
        if (messageHistory.length > 20) {
            messageHistory.pop();
        }
    }

    /**
     * Displays messages in the UI
     * @private
     */
    function displayMessages() {
        // Clear existing messages
        messagesList.innerHTML = '';

        // Add each message
        messageHistory.forEach(item => {
            const messageItem = document.createElement('div');
            messageItem.className = 'message-item';

            const timeElement = document.createElement('div');
            timeElement.className = 'message-time';

            // Format timestamp
            const time = new Date(item.timestamp);
            timeElement.textContent = time.toLocaleTimeString();

            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.textContent = item.message;

            messageItem.appendChild(timeElement);
            messageItem.appendChild(messageContent);

            messagesList.appendChild(messageItem);
        });
    }

    /**
     * Toggles the camera state
     * @returns {Promise<void>}
     */
    async function toggleCamera() {
        if (isCameraActive) {
            stopCamera();
        } else {
            await startCamera();
        }
    }

    /**
     * Starts the camera and begins processing
     * @returns {Promise<void>}
     */
    async function startCamera() {
        if (isCameraActive) return;

        try {
            updateStatus('Starting camera...', 'info');

            // Start camera
            await camera.start();

            // Set up tracker
            tracker.reset();
            tracker.onMessage(handleReceivedMessage);
            tracker.onStatusChange(handleTrackerStatus);

            // Set frame processor
            camera.setFrameProcessor(processFrame, 10); // Process 10 frames per second

            isCameraActive = true;
            updateUI();
            updateStatus('Camera active. Point at transmitting navbar.', 'info');

        } catch (error) {
            updateStatus(`Camera error: ${error.message}`, 'error');
            console.error('Camera error:', error);
        }
    }

    /**
     * Stops the camera and processing
     */
    function stopCamera() {
        if (!isCameraActive) return;

        // Stop camera
        camera.stop();

        // Reset tracker
        tracker.reset();

        isCameraActive = false;
        updateUI();
        updateStatus('Camera stopped', 'info');
    }

    /**
     * Gets the message history
     * @returns {Array} - Message history
     */
    function getHistory() {
        return [...messageHistory];
    }

    /**
     * Clears the message history
     */
    function clearHistory() {
        messageHistory = [];
        displayMessages();
    }

    /**
     * Initializes the receiver UI
     */
    function init() {
        // Set up event listeners
        startButton.addEventListener('click', toggleCamera);

        // Initial UI update
        updateUI();
        updateStatus('Ready to receive', 'info');
    }

    // Return the public API
    return {
        init,
        toggleCamera,
        startCamera,
        stopCamera,
        getHistory,
        clearHistory
    };
}

export { createReceiverUI }; 