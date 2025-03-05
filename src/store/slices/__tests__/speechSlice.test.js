import speechReducer, {
    setIsListening,
    setTranscript,
    setRecognition,
    clearTranscript
} from '../speechSlice';

describe('speech slice', () => {
    const initialState = {
        isListening: false,
        transcript: '',
        recognition: null,
    };

    it('should return the initial state', () => {
        expect(speechReducer(undefined, { type: undefined })).toEqual(initialState);
    });

    it('should handle setIsListening', () => {
        // Test setting to true
        const nextState = speechReducer(initialState, setIsListening(true));
        expect(nextState.isListening).toBe(true);

        // Test setting to false
        const nextState2 = speechReducer(nextState, setIsListening(false));
        expect(nextState2.isListening).toBe(false);
    });

    it('should handle setTranscript', () => {
        const transcript = 'This is a test transcript';
        const nextState = speechReducer(initialState, setTranscript(transcript));
        expect(nextState.transcript).toBe(transcript);

        // Test updating transcript
        const updatedTranscript = 'This is an updated transcript';
        const nextState2 = speechReducer(nextState, setTranscript(updatedTranscript));
        expect(nextState2.transcript).toBe(updatedTranscript);
    });

    it('should handle setRecognition', () => {
        const mockRecognition = { name: 'MockSpeechRecognition' };
        const nextState = speechReducer(initialState, setRecognition(mockRecognition));
        expect(nextState.recognition).toEqual(mockRecognition);
    });

    it('should handle clearTranscript', () => {
        const stateWithTranscript = {
            ...initialState,
            transcript: 'This should be cleared',
        };
        const nextState = speechReducer(stateWithTranscript, clearTranscript());
        expect(nextState.transcript).toBe('');
    });
}); 