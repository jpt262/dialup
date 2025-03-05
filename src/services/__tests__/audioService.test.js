import * as audioService from '../audioService';
import * as audioEncoder from '../../audio/audioEncoder';
import { createAudioDecoder } from '../../audio/audioDecoder';
import { addMessage } from '../../store/slices/messageSlice';

// Mock all the imports
jest.mock('../../audio/audioEncoder');
jest.mock('../../audio/audioDecoder');
jest.mock('../../store/slices/messageSlice');

describe('audioService', () => {
    let mockDispatch;
    let mockDecoder;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock dispatch function
        mockDispatch = jest.fn();

        // Mock audio decoder
        mockDecoder = {
            startListening: jest.fn().mockResolvedValue(undefined),
            stopListening: jest.fn(),
            onMessage: jest.fn(),
            onStatusChange: jest.fn(),
            getState: jest.fn().mockReturnValue({
                detectedFrequency: 1000,
                signalStrength: 0.5,
                symbolsDetected: 10
            })
        };

        // Mock createAudioDecoder to return our mock
        createAudioDecoder.mockReturnValue(mockDecoder);

        // Mock audioEncoder functions
        audioEncoder.transmitAudio.mockResolvedValue(true);
    });

    describe('initializeAudioService', () => {
        it('should initialize the audio service', () => {
            audioService.initializeAudioService(mockDispatch);

            // Should create the audio decoder
            expect(createAudioDecoder).toHaveBeenCalled();

            // Should set up the message handler
            expect(mockDecoder.onMessage).toHaveBeenCalled();
        });

        it('should handle received messages', () => {
            audioService.initializeAudioService(mockDispatch);

            // Get the callback function that was registered with onMessage
            const messageCallback = mockDecoder.onMessage.mock.calls[0][0];

            // Simulate receiving a message
            const message = { text: 'Test message', timestamp: '2023-01-01T12:00:00Z' };
            messageCallback(message);

            // Should dispatch the addMessage action with the received message
            expect(mockDispatch).toHaveBeenCalledWith(addMessage({
                text: 'Test message',
                sender: expect.any(String),
                timestamp: '2023-01-01T12:00:00Z'
            }));
        });
    });

    describe('startAudioTransmission', () => {
        it('should start audio transmission', async () => {
            const message = 'Test message';
            const onComplete = jest.fn();
            const onError = jest.fn();

            await audioService.startAudioTransmission(message, mockDispatch, onComplete, onError);

            // Should call transmitAudio with the message
            expect(audioEncoder.transmitAudio).toHaveBeenCalledWith(message);

            // If successful, should call onComplete
            expect(onComplete).toHaveBeenCalled();

            // Should dispatch addMessage
            expect(mockDispatch).toHaveBeenCalledWith(addMessage({
                text: message,
                sender: expect.any(String),
                timestamp: expect.any(String)
            }));
        });

        it('should handle transmission errors', async () => {
            const message = 'Test message';
            const onComplete = jest.fn();
            const onError = jest.fn();

            // Mock transmitAudio to throw an error
            const error = new Error('Transmission failed');
            audioEncoder.transmitAudio.mockRejectedValue(error);

            await audioService.startAudioTransmission(message, mockDispatch, onComplete, onError);

            // Should call onError with the error message
            expect(onError).toHaveBeenCalledWith(error.message);

            // Should not call onComplete
            expect(onComplete).not.toHaveBeenCalled();
        });
    });

    describe('stopAudioTransmission', () => {
        it('should stop audio transmission', () => {
            // We don't have a mockable method for this in audioEncoder,
            // so just verify the function doesn't throw
            expect(() => {
                audioService.stopAudioTransmission();
            }).not.toThrow();
        });
    });

    describe('startAudioReception', () => {
        it('should start audio reception', async () => {
            const onStatusChange = jest.fn();

            await audioService.startAudioReception(mockDispatch, onStatusChange);

            // Should call startListening on the decoder
            expect(mockDecoder.startListening).toHaveBeenCalled();

            // Should set up a status change handler
            expect(mockDecoder.onStatusChange).toHaveBeenCalled();
        });

        it('should handle reception errors', async () => {
            const onStatusChange = jest.fn();

            // Mock startListening to throw an error
            const error = new Error('Reception failed');
            mockDecoder.startListening.mockRejectedValue(error);

            await expect(audioService.startAudioReception(mockDispatch, onStatusChange))
                .rejects.toThrow('Reception failed');

            // Should call onStatusChange with the error
            expect(onStatusChange).toHaveBeenCalledWith('error', expect.stringContaining('failed'));
        });
    });

    describe('stopAudioReception', () => {
        it('should stop audio reception', () => {
            audioService.stopAudioReception();

            // Should call stopListening on the decoder
            expect(mockDecoder.stopListening).toHaveBeenCalled();
        });
    });

    describe('isAudioReceptionActive', () => {
        beforeEach(() => {
            // Initialize the service first
            audioService.initializeAudioService(mockDispatch);
        });

        it('should check if audio reception is active', () => {
            // Mock decoder state
            mockDecoder.getState.mockReturnValue({ isListening: true });

            const result = audioService.isAudioReceptionActive();

            expect(result).toBe(true);
        });

        it('should return false if audio reception is not active', () => {
            // Mock decoder state
            mockDecoder.getState.mockReturnValue({ isListening: false });

            const result = audioService.isAudioReceptionActive();

            expect(result).toBe(false);
        });
    });

    describe('isAudioTransmissionActive', () => {
        it('should check if audio transmission is active', () => {
            // We can't easily test internal state,
            // but we can verify the function returns without error
            expect(() => {
                audioService.isAudioTransmissionActive();
            }).not.toThrow();
        });
    });

    describe('getAudioDecoderState', () => {
        beforeEach(() => {
            // Initialize the service first
            audioService.initializeAudioService(mockDispatch);
        });

        it('should get audio decoder state', () => {
            const state = audioService.getAudioDecoderState();

            expect(state).toEqual({
                detectedFrequency: 1000,
                signalStrength: 0.5,
                symbolsDetected: 10
            });
        });
    });

    describe('cleanupAudioService', () => {
        beforeEach(() => {
            // Initialize the service first
            audioService.initializeAudioService(mockDispatch);
        });

        it('should clean up the audio service', () => {
            audioService.cleanupAudioService();

            // Should call stopListening on the decoder
            expect(mockDecoder.stopListening).toHaveBeenCalled();
        });
    });
}); 