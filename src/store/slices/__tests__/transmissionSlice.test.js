import transmissionReducer, {
    setMessage,
    setInputMode,
    startTransmission,
    updateProgress,
    cancelTransmission,
    setTransmissionError,
    setVisualSpeed,
    initialState
} from '../transmissionSlice';

describe('transmissionSlice', () => {
    it('should return the initial state when no state is provided', () => {
        expect(transmissionReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    describe('setMessage action', () => {
        it('should update the message in the state', () => {
            const action = setMessage('New test message');
            const state = transmissionReducer(initialState, action);

            expect(state.message).toBe('New test message');
        });

        it('should not affect other state properties', () => {
            const existingState = {
                ...initialState,
                status: 'transmitting',
                inputMode: 'binary'
            };

            const action = setMessage('New test message');
            const state = transmissionReducer(existingState, action);

            expect(state.message).toBe('New test message');
            expect(state.status).toBe('transmitting');
            expect(state.inputMode).toBe('binary');
        });
    });

    describe('setInputMode action', () => {
        it('should update the input mode in the state', () => {
            const action = setInputMode('binary');
            const state = transmissionReducer(initialState, action);

            expect(state.inputMode).toBe('binary');
        });

        it('should not affect other state properties', () => {
            const existingState = {
                ...initialState,
                message: 'Test message',
                status: 'idle'
            };

            const action = setInputMode('hex');
            const state = transmissionReducer(existingState, action);

            expect(state.inputMode).toBe('hex');
            expect(state.message).toBe('Test message');
            expect(state.status).toBe('idle');
        });
    });

    describe('startTransmission action', () => {
        it('should update the status to transmitting and reset progress and error', () => {
            const existingState = {
                ...initialState,
                message: 'Test message',
                status: 'idle',
                progress: 50,
                error: 'Previous error'
            };

            const action = startTransmission();
            const state = transmissionReducer(existingState, action);

            expect(state.status).toBe('transmitting');
            expect(state.progress).toBe(0);
            expect(state.error).toBeNull();
            expect(state.message).toBe('Test message'); // Should not affect message
        });
    });

    describe('updateProgress action', () => {
        it('should update the progress percentage', () => {
            const existingState = {
                ...initialState,
                status: 'transmitting',
                progress: 25
            };

            const action = updateProgress(75);
            const state = transmissionReducer(existingState, action);

            expect(state.progress).toBe(75);
            expect(state.status).toBe('transmitting'); // Should not affect status
        });

        it('should set status to completed when progress reaches 100', () => {
            const existingState = {
                ...initialState,
                status: 'transmitting',
                progress: 95
            };

            const action = updateProgress(100);
            const state = transmissionReducer(existingState, action);

            expect(state.progress).toBe(100);
            expect(state.status).toBe('completed');
        });

        it('should clamp progress values below 0 to 0', () => {
            const existingState = {
                ...initialState,
                status: 'transmitting',
                progress: 10
            };

            const action = updateProgress(-10);
            const state = transmissionReducer(existingState, action);

            expect(state.progress).toBe(0);
        });

        it('should clamp progress values above 100 to 100', () => {
            const existingState = {
                ...initialState,
                status: 'transmitting',
                progress: 90
            };

            const action = updateProgress(110);
            const state = transmissionReducer(existingState, action);

            expect(state.progress).toBe(100);
            expect(state.status).toBe('completed');
        });
    });

    describe('cancelTransmission action', () => {
        it('should reset the transmission state to idle', () => {
            const existingState = {
                ...initialState,
                status: 'transmitting',
                progress: 50,
                error: 'Some error'
            };

            const action = cancelTransmission();
            const state = transmissionReducer(existingState, action);

            expect(state.status).toBe('idle');
            expect(state.progress).toBe(0);
            expect(state.error).toBeNull();
        });

        it('should not affect message or inputMode', () => {
            const existingState = {
                ...initialState,
                message: 'Test message',
                inputMode: 'binary',
                status: 'transmitting',
                progress: 50
            };

            const action = cancelTransmission();
            const state = transmissionReducer(existingState, action);

            expect(state.message).toBe('Test message');
            expect(state.inputMode).toBe('binary');
        });
    });

    describe('setTransmissionError action', () => {
        it('should set the error message and update status to error', () => {
            const existingState = {
                ...initialState,
                status: 'transmitting',
                progress: 50,
                error: null
            };

            const action = setTransmissionError('Test error message');
            const state = transmissionReducer(existingState, action);

            expect(state.error).toBe('Test error message');
            expect(state.status).toBe('error');
        });

        it('should not affect other state properties', () => {
            const existingState = {
                ...initialState,
                message: 'Test message',
                inputMode: 'text',
                progress: 50
            };

            const action = setTransmissionError('Test error message');
            const state = transmissionReducer(existingState, action);

            expect(state.message).toBe('Test message');
            expect(state.inputMode).toBe('text');
            expect(state.progress).toBe(50);
        });
    });

    describe('setVisualSpeed action', () => {
        it('should update the visual transmission speed', () => {
            const action = setVisualSpeed(100);
            const state = transmissionReducer(initialState, action);

            expect(state.visualSpeed).toBe(100);
        });

        it('should not affect other state properties', () => {
            const existingState = {
                ...initialState,
                message: 'Test message',
                status: 'idle',
                inputMode: 'text'
            };

            const action = setVisualSpeed(200);
            const state = transmissionReducer(existingState, action);

            expect(state.visualSpeed).toBe(200);
            expect(state.message).toBe('Test message');
            expect(state.status).toBe('idle');
            expect(state.inputMode).toBe('text');
        });

        it('should clamp speed value to minimum if provided value is too low', () => {
            const action = setVisualSpeed(-10);
            const state = transmissionReducer(initialState, action);

            // Assuming minimum speed is defined in the slice
            expect(state.visualSpeed).toBeGreaterThan(0);
        });

        it('should clamp speed value to maximum if provided value is too high', () => {
            const action = setVisualSpeed(10000);
            const state = transmissionReducer(initialState, action);

            // Assuming maximum speed is defined in the slice
            expect(state.visualSpeed).toBeLessThan(1000);
        });
    });
}); 