/**
 * DialUp Camera Module
 * Handles webcam access and frame capture for visual data reception
 */

/**
 * Camera controller options
 * @typedef {Object} CameraOptions
 * @property {boolean} facingMode - Camera facing mode ('user' or 'environment')
 * @property {number} width - Requested video width
 * @property {number} height - Requested video height
 */

/**
 * Default camera options
 * @type {CameraOptions}
 */
const DEFAULT_OPTIONS = {
    facingMode: 'environment', // Use back camera by default
    width: 1280,
    height: 720
};

/**
 * Creates a camera controller for webcam access and frame capture
 * @param {HTMLVideoElement} videoElement - Video element to display the camera feed
 * @param {CameraOptions} [options] - Camera configuration options
 * @returns {Object} - Camera controller object
 */
function createCameraController(videoElement, options = {}) {
    if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
        throw new Error('Valid video element is required');
    }

    // Merge default options with provided options
    const cameraOptions = { ...DEFAULT_OPTIONS, ...options };

    // Camera state
    let mediaStream = null;
    let isRunning = false;
    let frameProcessor = null;
    let processingInterval = null;
    let processingFrequency = 10; // Process frames every ~100ms by default

    /**
     * Starts the camera
     * @returns {Promise<void>} - Promise that resolves when camera starts
     */
    async function start() {
        if (isRunning) {
            return; // Already running
        }

        try {
            // Request camera access
            const constraints = {
                video: {
                    facingMode: cameraOptions.facingMode,
                    width: { ideal: cameraOptions.width },
                    height: { ideal: cameraOptions.height }
                }
            };

            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Connect stream to video element
            videoElement.srcObject = mediaStream;
            await videoElement.play();

            isRunning = true;

            // Start frame processing if a processor is set
            if (frameProcessor && !processingInterval) {
                startFrameProcessing();
            }

            return mediaStream;
        } catch (error) {
            throw new Error(`Camera access failed: ${error.message}`);
        }
    }

    /**
     * Stops the camera
     */
    function stop() {
        if (!isRunning) {
            return; // Not running
        }

        // Stop frame processing
        stopFrameProcessing();

        // Stop all tracks in the stream
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        // Clear video element
        videoElement.srcObject = null;

        isRunning = false;
    }

    /**
     * Captures a single frame from the camera
     * @returns {ImageData|null} - The captured frame as ImageData, or null if camera not running
     */
    function captureFrame() {
        if (!isRunning || !mediaStream) {
            return null;
        }

        // Create a canvas to draw the video frame
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Set canvas size to match video dimensions
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        // Draw the current video frame to the canvas
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Get image data
        return context.getImageData(0, 0, canvas.width, canvas.height);
    }

    /**
     * Sets a function to process frames at regular intervals
     * @param {function} processor - Function that receives ImageData and processes it
     * @param {number} [frequency=10] - How many frames per second to process (1-30)
     */
    function setFrameProcessor(processor, frequency = 10) {
        if (typeof processor !== 'function') {
            throw new Error('Frame processor must be a function');
        }

        // Validate frequency
        const validatedFrequency = Math.min(Math.max(1, frequency), 30);
        processingFrequency = validatedFrequency;

        // Set the processor
        frameProcessor = processor;

        // Start processing if camera is already running
        if (isRunning && !processingInterval) {
            startFrameProcessing();
        }
    }

    /**
     * Starts frame processing at the set frequency
     * @private
     */
    function startFrameProcessing() {
        if (!frameProcessor || processingInterval) {
            return; // No processor or already processing
        }

        const interval = Math.floor(1000 / processingFrequency);

        processingInterval = setInterval(() => {
            const frame = captureFrame();
            if (frame) {
                frameProcessor(frame);
            }
        }, interval);
    }

    /**
     * Stops frame processing
     * @private
     */
    function stopFrameProcessing() {
        if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
        }
    }

    /**
     * Gets the average color in a specific region of the video
     * @param {Object} region - Region definition { x, y, width, height }
     * @returns {number[]|null} - RGB array [r, g, b] or null if not available
     */
    function getRegionAverageColor(region) {
        if (!isRunning || !mediaStream) {
            return null;
        }

        // Create a canvas to draw the video frame
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Set canvas size to match the region
        canvas.width = region.width;
        canvas.height = region.height;

        // Draw only the specified region from the video
        context.drawImage(
            videoElement,
            region.x, region.y, region.width, region.height, // Source coordinates
            0, 0, region.width, region.height // Destination coordinates
        );

        // Get image data
        const imageData = context.getImageData(0, 0, region.width, region.height).data;

        // Calculate average RGB
        let totalR = 0, totalG = 0, totalB = 0;
        const pixelCount = imageData.length / 4;

        for (let i = 0; i < imageData.length; i += 4) {
            totalR += imageData[i];
            totalG += imageData[i + 1];
            totalB += imageData[i + 2];
        }

        // Return average RGB values
        return [
            Math.round(totalR / pixelCount),
            Math.round(totalG / pixelCount),
            Math.round(totalB / pixelCount)
        ];
    }

    /**
     * Switches between front and back cameras
     * @returns {Promise<void>} - Promise that resolves when camera switches
     */
    async function switchCamera() {
        const wasRunning = isRunning;

        // Stop current camera
        stop();

        // Toggle facing mode
        cameraOptions.facingMode =
            cameraOptions.facingMode === 'user' ? 'environment' : 'user';

        // Restart if it was running
        if (wasRunning) {
            await start();
        }
    }

    /**
     * Gets the current camera state
     * @returns {Object} - Camera state information
     */
    function getState() {
        return {
            isRunning,
            facingMode: cameraOptions.facingMode,
            resolution: isRunning
                ? { width: videoElement.videoWidth, height: videoElement.videoHeight }
                : { width: 0, height: 0 },
            processing: !!processingInterval,
            processingFrequency
        };
    }

    // Build and return the controller object
    return {
        start,
        stop,
        captureFrame,
        setFrameProcessor,
        getRegionAverageColor,
        switchCamera,
        getState
    };
}

export { createCameraController }; 