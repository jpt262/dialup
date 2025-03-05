/**
 * DialUp Audio Service
 * Integrates audio encoding/decoding with the application
 */

import { transmitAudio, isChannelBusy } from '../audio/audioEncoder.js';
import { createAudioDecoder } from '../audio/audioDecoder.js';
import { addMessage } from '../store/slices/messageSlice.js';

// Audio service state
let audioDecoder = null;
let isTransmitting = false;
let isReceiving = false;

/**
 * Initializes the audio service
 * @param {function} dispatch - Redux dispatch function
 */
export const initializeAudioService = (dispatch) => {
    // Create audio decoder
    audioDecoder = createAudioDecoder();

    // Set up message handler
    audioDecoder.onMessage((message) => {
        // Add received message to Redux store
        dispatch(addMessage({
            text: message.text,
            sender: 'Remote (Audio)',
            timestamp: new Date().toISOString()
        }));
    });

    // Set up status change handler
    audioDecoder.onStatusChange((statusEvent) => {
        console.log('Audio decoder status:', statusEvent);

        // Could dispatch status updates to Redux if needed
        // dispatch(updateAudioStatus(statusEvent));
    });

    console.log('Audio service initialized');
};

/**
 * Starts audio transmission
 * @param {string} message - Message to transmit
 * @param {function} dispatch - Redux dispatch function
 * @param {function} onComplete - Callback when transmission completes
 * @param {function} onError - Callback when transmission fails
 * @returns {Promise<void>}
 */
export const startAudioTransmission = async (message, dispatch, onComplete, onError) => {
    if (isTransmitting) {
        if (onError) onError('Already transmitting');
        return;
    }

    try {
        isTransmitting = true;

        // Check if channel is busy
        const busy = await isChannelBusy();
        if (busy) {
            throw new Error('Audio channel is busy');
        }

        // Transmit the message
        await transmitAudio(message);

        // Add to message history
        dispatch(addMessage({
            text: message,
            sender: 'You (Audio)',
            timestamp: new Date().toISOString()
        }));

        isTransmitting = false;
        if (onComplete) onComplete();

    } catch (error) {
        console.error('Audio transmission error:', error);
        isTransmitting = false;
        if (onError) onError(error.message);
    }
};

/**
 * Stops audio transmission
 */
export const stopAudioTransmission = () => {
    isTransmitting = false;
    // Any cleanup needed for transmission
};

/**
 * Starts audio reception
 * @param {function} onStatusChange - Callback for status changes
 * @returns {Promise<void>}
 */
export const startAudioReception = async (onStatusChange) => {
    if (isReceiving) {
        return;
    }

    try {
        if (!audioDecoder) {
            throw new Error('Audio decoder not initialized');
        }

        await audioDecoder.startListening();
        isReceiving = true;

        if (onStatusChange) {
            onStatusChange('listening');
        }

    } catch (error) {
        console.error('Failed to start audio reception:', error);
        if (onStatusChange) {
            onStatusChange('error', error.message);
        }
        throw error;
    }
};

/**
 * Stops audio reception
 * @param {function} onStatusChange - Callback for status changes
 */
export const stopAudioReception = (onStatusChange) => {
    if (!isReceiving) {
        return;
    }

    if (audioDecoder) {
        audioDecoder.stopListening();
    }

    isReceiving = false;

    if (onStatusChange) {
        onStatusChange('stopped');
    }
};

/**
 * Checks if audio reception is active
 * @returns {boolean} - Whether audio reception is active
 */
export const isAudioReceptionActive = () => {
    return isReceiving;
};

/**
 * Checks if audio transmission is active
 * @returns {boolean} - Whether audio transmission is active
 */
export const isAudioTransmissionActive = () => {
    return isTransmitting;
};

/**
 * Gets the current audio decoder state
 * @returns {Object|null} - Current decoder state or null if not initialized
 */
export const getAudioDecoderState = () => {
    if (audioDecoder) {
        return audioDecoder.getState();
    }
    return null;
};

/**
 * Cleans up the audio service
 */
export const cleanupAudioService = () => {
    if (isReceiving && audioDecoder) {
        audioDecoder.stopListening();
    }

    isReceiving = false;
    isTransmitting = false;
    audioDecoder = null;
}; 