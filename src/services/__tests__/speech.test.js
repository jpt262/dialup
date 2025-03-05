import * as speechService from '../speech';
import {
    setIsListening,
    setTranscript,
    setRecognition
} from '../../store/slices/speechSlice';

// Mock Redux actions
jest.mock('../../store/slices/speechSlice', () => ({
    setIsListening: jest.fn().mockReturnValue({ type: 'mock_setIsListening' }),
    setTranscript: jest.fn().mockReturnValue({ type: 'mock_setTranscript' }),
    setRecognition: jest.fn().mockReturnValue({ type: 'mock_setRecognition' }),
    clearTranscript: jest.fn().mockReturnValue({ type: 'mock_clearTranscript' })
}));

describe('speech service', () => {
    let mockDispatch;
    let originalSpeechRecognition;
    let mockSpeechRecognition;
    let mockRecognitionInstance;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock dispatch function
        mockDispatch = jest.fn();

        // Save original SpeechRecognition
        originalSpeechRecognition = global.SpeechRecognition;

        // Create mock recognition instance
        mockRecognitionInstance = {
            continuous: false,
            interimResults: false,
            lang: 'en-US',
            isListening: false,
            start: jest.fn(() => {
                mockRecognitionInstance.isListening = true;
                if (mockRecognitionInstance.onstart) {
                    mockRecognitionInstance.onstart();
                }
            }),
            stop: jest.fn(() => {
                mockRecognitionInstance.isListening = false;
                if (mockRecognitionInstance.onend) {
                    mockRecognitionInstance.onend();
                }
            }),
            abort: jest.fn(() => {
                mockRecognitionInstance.isListening = false;
                if (mockRecognitionInstance.onend) {
                    mockRecognitionInstance.onend();
                }
            }),
            onstart: null,
            onresult: null,
            onerror: null,
            onend: null
        };

        // Mock SpeechRecognition constructor
        mockSpeechRecognition = jest.fn(() => mockRecognitionInstance);

        // Replace global.SpeechRecognition with mock
        global.SpeechRecognition = mockSpeechRecognition;
        global.webkitSpeechRecognition = mockSpeechRecognition;
    });

    afterEach(() => {
        // Restore original SpeechRecognition
        global.SpeechRecognition = originalSpeechRecognition;
        global.webkitSpeechRecognition = originalSpeechRecognition;

        // Clean up event listeners
        speechService.cleanupSpeechRecognition();
    });

    describe('initializeSpeechRecognition', () => {
        it('should initialize speech recognition', () => {
            speechService.initializeSpeechRecognition(mockDispatch);

            // Should create a SpeechRecognition instance
            expect(mockSpeechRecognition).toHaveBeenCalled();

            // Should set continuous to false
            expect(mockRecognitionInstance.continuous).toBe(false);

            // Should set interimResults to true
            expect(mockRecognitionInstance.interimResults).toBe(true);

            // Should set language to 'en-US'
            expect(mockRecognitionInstance.lang).toBe('en-US');

            // Should register event handlers
            expect(mockRecognitionInstance.onstart).toBeDefined();
            expect(mockRecognitionInstance.onresult).toBeDefined();
            expect(mockRecognitionInstance.onerror).toBeDefined();
            expect(mockRecognitionInstance.onend).toBeDefined();

            // Should store the recognition instance in Redux
            expect(setRecognition).toHaveBeenCalledWith(mockRecognitionInstance);
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setRecognition'
            }));
        });

        it('should handle onstart event', () => {
            speechService.initializeSpeechRecognition(mockDispatch);

            // Trigger onstart
            mockRecognitionInstance.onstart();

            // Should dispatch setIsListening(true)
            expect(setIsListening).toHaveBeenCalledWith(true);
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setIsListening'
            }));

            // Should dispatch setTranscript('')
            expect(setTranscript).toHaveBeenCalledWith('');
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setTranscript'
            }));
        });

        it('should handle onresult event', () => {
            speechService.initializeSpeechRecognition(mockDispatch);

            // Mock recognition result
            const mockEvent = {
                results: [
                    [{ transcript: 'Hello ' }],
                    [{ transcript: 'world' }]
                ]
            };

            // Trigger onresult
            mockRecognitionInstance.onresult(mockEvent);

            // Should dispatch setTranscript with the combined transcript
            expect(setTranscript).toHaveBeenCalledWith('Hello world');
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setTranscript'
            }));
        });

        it('should handle onerror event', () => {
            speechService.initializeSpeechRecognition(mockDispatch);

            // Mock error event
            const mockEvent = { error: 'no-speech' };

            // Trigger onerror
            mockRecognitionInstance.onerror(mockEvent);

            // Should dispatch setIsListening(false)
            expect(setIsListening).toHaveBeenCalledWith(false);
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setIsListening'
            }));
        });

        it('should handle onend event', () => {
            speechService.initializeSpeechRecognition(mockDispatch);

            // Trigger onend
            mockRecognitionInstance.onend();

            // Should dispatch setIsListening(false)
            expect(setIsListening).toHaveBeenCalledWith(false);
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setIsListening'
            }));
        });
    });

    describe('startDictation', () => {
        beforeEach(() => {
            // Initialize speech recognition
            speechService.initializeSpeechRecognition(mockDispatch);
        });

        it('should start dictation when triggered by a custom event', () => {
            // Dispatch startDictation event
            document.dispatchEvent(new CustomEvent('startDictation'));

            // Should call start on the recognition instance
            expect(mockRecognitionInstance.start).toHaveBeenCalled();
        });

        it('should handle spacebar keydown', () => {
            // Create a keydown event for spacebar
            const keyEvent = new KeyboardEvent('keydown', {
                code: 'Space',
                repeat: false
            });

            // Simulate keydown on the document
            document.dispatchEvent(keyEvent);

            // Should call start on the recognition instance via startDictation event
            expect(mockRecognitionInstance.start).toHaveBeenCalled();
        });

        it('should not start dictation if recognition is already listening', () => {
            // Set recognition as already listening
            mockRecognitionInstance.isListening = true;

            // Dispatch startDictation event
            document.dispatchEvent(new CustomEvent('startDictation'));

            // Should not call start again
            expect(mockRecognitionInstance.start).not.toHaveBeenCalled();
        });
    });

    describe('stopDictationProcess', () => {
        beforeEach(() => {
            // Initialize speech recognition
            speechService.initializeSpeechRecognition(mockDispatch);
        });

        it('should stop dictation process', () => {
            // Stop dictation
            speechService.stopDictationProcess(mockDispatch);

            // Should call stop on the recognition instance
            expect(mockRecognitionInstance.stop).toHaveBeenCalled();

            // Should dispatch setIsListening(false)
            expect(setIsListening).toHaveBeenCalledWith(false);
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setIsListening'
            }));
        });

        it('should handle errors when stopping dictation', () => {
            // Mock stop to throw an error
            mockRecognitionInstance.stop.mockImplementation(() => {
                throw new Error('Stop error');
            });

            // This should not throw
            expect(() => {
                speechService.stopDictationProcess(mockDispatch);
            }).not.toThrow();
        });
    });

    describe('cleanupSpeechRecognition', () => {
        beforeEach(() => {
            // Initialize speech recognition
            speechService.initializeSpeechRecognition(mockDispatch);
        });

        it('should clean up speech recognition', () => {
            // Add event listener spies
            const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

            // Clean up
            speechService.cleanupSpeechRecognition();

            // Should clear event handlers
            expect(mockRecognitionInstance.onstart).toBeNull();
            expect(mockRecognitionInstance.onresult).toBeNull();
            expect(mockRecognitionInstance.onerror).toBeNull();
            expect(mockRecognitionInstance.onend).toBeNull();

            // Should remove event listeners
            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                'keydown',
                expect.any(Function)
            );
            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                'startDictation',
                expect.any(Function)
            );

            // Should abort recognition
            expect(mockRecognitionInstance.abort).toHaveBeenCalled();
        });
    });
}); 