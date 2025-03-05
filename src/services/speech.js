import {
    startListening,
    stopListening,
    updateTranscript,
    recognitionError,
    setWhisperAvailability,
    setUsingWhisper,
    setRecognitionInstance,
    setRecognition,
    setIsListening,
    setTranscript
} from '../store/slices/speechSlice';
import { updateDraftMessage } from '../store/slices/messageSlice';

let recognition = null;

// Load Whisper.js if available
export const checkWhisperAvailability = async (dispatch) => {
    try {
        // Check if the @xenova/transformers package is available
        const { pipeline } = await import('@xenova/transformers');

        // Test if we can load a basic Whisper model
        const whisper = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');

        if (whisper) {
            console.log('Whisper.js is available');
            dispatch(setWhisperAvailability(true));
            return true;
        }
    } catch (error) {
        console.warn('Whisper.js is not available:', error);
        dispatch(setWhisperAvailability(false));
    }

    return false;
};

// Initialize the speech recognition
export const initializeSpeechRecognition = (dispatch) => {
    try {
        // Check if browser supports SpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            dispatch(setIsListening(true));
            dispatch(setTranscript(''));
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');

            dispatch(setTranscript(transcript));
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            dispatch(setIsListening(false));
        };

        recognition.onend = () => {
            dispatch(setIsListening(false));
        };

        // Store recognition instance in Redux
        dispatch(setRecognition(recognition));

        // Add event listener for spacebar to start dictation
        document.addEventListener('keydown', handleKeyDown);

        // Add custom event listener for starting dictation
        document.addEventListener('startDictation', startDictation);

        console.log('Speech recognition initialized');
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
    }
};

const handleKeyDown = (event) => {
    // Only trigger when not in an input field or textarea
    const isInputActive = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (event.code === 'Space' && !event.repeat && !isInputActive) {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('startDictation'));
    }
};

const startDictation = () => {
    if (recognition && !recognition.isListening) {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting dictation:', error);
        }
    }
};

export const stopDictationProcess = (dispatch) => {
    if (recognition) {
        try {
            recognition.stop();
            dispatch(setIsListening(false));
        } catch (error) {
            console.error('Error stopping dictation:', error);
        }
    }
};

export const cleanupSpeechRecognition = () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('startDictation', startDictation);

    if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;

        try {
            recognition.abort();
        } catch (error) {
            console.error('Error cleaning up speech recognition:', error);
        }

        recognition = null;
    }
};

// Setup Whisper.js for speech recognition
const setupWhisperRecognition = async (dispatch) => {
    try {
        const { pipeline } = await import('@xenova/transformers');
        const whisper = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');

        dispatch(setUsingWhisper(true));
        return whisper;
    } catch (error) {
        console.error('Failed to initialize Whisper.js:', error);
        dispatch(recognitionError('Failed to initialize Whisper.js'));
        dispatch(setUsingWhisper(false));
        return null;
    }
};

// Setup browser's native SpeechRecognition API
const setupBrowserSpeechRecognition = (dispatch) => {
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            throw new Error('Speech recognition not supported in this browser');
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            dispatch(startListening());
            console.log('Speech recognition started');
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');

            dispatch(updateTranscript(transcript));
            dispatch(updateDraftMessage(transcript));
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            dispatch(recognitionError(event.error));
        };

        recognition.onend = () => {
            dispatch(stopListening());
            console.log('Speech recognition ended');
        };

        dispatch(setRecognitionInstance(recognition));
        dispatch(setUsingWhisper(false));

        return recognition;
    } catch (error) {
        console.error('Failed to initialize browser speech recognition:', error);
        dispatch(recognitionError(error.message));
        return null;
    }
};

// Start the dictation process
export const startDictationProcess = async (dispatch, useWhisper = false) => {
    dispatch(startListening());

    if (useWhisper) {
        try {
            const { pipeline } = await import('@xenova/transformers');
            const whisper = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');

            // Create a MediaRecorder to capture audio
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.addEventListener('dataavailable', (event) => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', async () => {
                const audioBlob = new Blob(audioChunks);
                const audioUrl = URL.createObjectURL(audioBlob);

                try {
                    // Process the audio with Whisper.js
                    const result = await whisper(audioUrl);
                    const transcript = result.text;

                    dispatch(updateTranscript(transcript));
                    dispatch(updateDraftMessage(transcript));
                } catch (error) {
                    console.error('Whisper.js transcription error:', error);
                    dispatch(recognitionError(error.message));
                } finally {
                    // Clean up
                    stream.getTracks().forEach(track => track.stop());
                    URL.revokeObjectURL(audioUrl);
                    dispatch(stopListening());
                }
            });

            // Start recording
            mediaRecorder.start();

            // Record for 5 seconds (configurable)
            setTimeout(() => {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
            }, 5000);

        } catch (error) {
            console.error('Whisper.js dictation error:', error);
            dispatch(recognitionError(error.message));
            dispatch(stopListening());
        }
    } else {
        // Use browser's SpeechRecognition API
        const recognition = window.speechRecognitionInstance ||
            setupBrowserSpeechRecognition(dispatch);

        if (recognition) {
            try {
                recognition.start();
            } catch (error) {
                console.error('Failed to start speech recognition:', error);
                dispatch(recognitionError(error.message));
                dispatch(stopListening());
            }
        }
    }
}; 