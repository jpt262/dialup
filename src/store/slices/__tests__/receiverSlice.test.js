import receiverReducer, {
    startListening,
    stopListening,
    setLastReceivedMessage,
    addReceivedSymbol,
    clearReceivedSymbols,
    updateSignalMetrics,
    updateDecoderState,
    receiveSymbol,
    receiveMessage,
    setStatus,
    initialState
} from '../receiverSlice';

describe('receiver slice', () => {
    const initialState = {
        isListening: false,
        lastReceivedMessage: null,
        receivedSymbols: [],
        detectedFrequency: 0,
        signalStrength: 0,
    };

    it('should return the initial state', () => {
        expect(receiverReducer(undefined, { type: undefined })).toEqual(initialState);
    });

    it('should handle startListening', () => {
        const nextState = receiverReducer(initialState, startListening());
        expect(nextState.isListening).toBe(true);
    });

    it('should handle stopListening', () => {
        const stateWhileListening = {
            ...initialState,
            isListening: true,
        };
        const nextState = receiverReducer(stateWhileListening, stopListening());
        expect(nextState.isListening).toBe(false);
    });

    it('should handle setLastReceivedMessage', () => {
        const message = {
            text: 'Test message',
            sender: 'Receiver',
            timestamp: '2023-01-01T12:00:00Z',
        };
        const nextState = receiverReducer(initialState, setLastReceivedMessage(message));
        expect(nextState.lastReceivedMessage).toEqual(message);
    });

    it('should handle addReceivedSymbol', () => {
        const symbol = 1;
        const nextState = receiverReducer(initialState, addReceivedSymbol(symbol));
        expect(nextState.receivedSymbols).toEqual([symbol]);

        // Test adding a second symbol
        const nextState2 = receiverReducer(nextState, addReceivedSymbol(2));
        expect(nextState2.receivedSymbols).toEqual([symbol, 2]);
    });

    it('should handle clearReceivedSymbols', () => {
        const stateWithSymbols = {
            ...initialState,
            receivedSymbols: [1, 0, 1, 1],
        };
        const nextState = receiverReducer(stateWithSymbols, clearReceivedSymbols());
        expect(nextState.receivedSymbols).toEqual([]);
    });

    it('should handle updateSignalMetrics with only frequency', () => {
        const payload = {
            detectedFrequency: 1200
        };
        const nextState = receiverReducer(initialState, updateSignalMetrics(payload));
        expect(nextState.detectedFrequency).toBe(1200);
        expect(nextState.signalStrength).toBe(0); // Should not change
    });

    it('should handle updateSignalMetrics with only signal strength', () => {
        const payload = {
            signalStrength: 0.75
        };
        const nextState = receiverReducer(initialState, updateSignalMetrics(payload));
        expect(nextState.detectedFrequency).toBe(0); // Should not change
        expect(nextState.signalStrength).toBe(0.75);
    });

    it('should handle updateSignalMetrics with both values', () => {
        const payload = {
            detectedFrequency: 1200,
            signalStrength: 0.75
        };
        const nextState = receiverReducer(initialState, updateSignalMetrics(payload));
        expect(nextState.detectedFrequency).toBe(1200);
        expect(nextState.signalStrength).toBe(0.75);
    });

    it('should return the initial state when no state is provided', () => {
        expect(receiverReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    describe('startListening action', () => {
        it('should update status to listening and reset other state values', () => {
            const existingState = {
                ...initialState,
                status: 'idle',
                isListening: false,
                receivedSymbols: ['1', '0', '1'],
                lastReceivedMessage: 'Previous message'
            };

            const action = startListening();
            const state = receiverReducer(existingState, action);

            expect(state.status).toBe('listening');
            expect(state.isListening).toBe(true);
            expect(state.receivedSymbols).toEqual([]);
            expect(state.lastReceivedMessage).toBeNull();
        });
    });

    describe('stopListening action', () => {
        it('should update status to idle and set isListening to false', () => {
            const existingState = {
                ...initialState,
                status: 'listening',
                isListening: true
            };

            const action = stopListening();
            const state = receiverReducer(existingState, action);

            expect(state.status).toBe('idle');
            expect(state.isListening).toBe(false);
        });

        it('should preserve received symbols and last received message', () => {
            const existingState = {
                ...initialState,
                status: 'listening',
                isListening: true,
                receivedSymbols: ['1', '0', '1'],
                lastReceivedMessage: 'Test message'
            };

            const action = stopListening();
            const state = receiverReducer(existingState, action);

            expect(state.receivedSymbols).toEqual(['1', '0', '1']);
            expect(state.lastReceivedMessage).toBe('Test message');
        });
    });

    describe('updateDecoderState action', () => {
        it('should update decoder state properties', () => {
            const decoderState = {
                detectedFrequency: 1000,
                signalStrength: 0.75,
                symbolsDetected: 10
            };

            const action = updateDecoderState(decoderState);
            const state = receiverReducer(initialState, action);

            expect(state.detectedFrequency).toBe(1000);
            expect(state.signalStrength).toBe(0.75);
            expect(state.symbolsDetected).toBe(10);
        });

        it('should not affect other state properties', () => {
            const existingState = {
                ...initialState,
                status: 'listening',
                isListening: true,
                receivedSymbols: ['1', '0']
            };

            const decoderState = {
                detectedFrequency: 1000,
                signalStrength: 0.75
            };

            const action = updateDecoderState(decoderState);
            const state = receiverReducer(existingState, action);

            expect(state.detectedFrequency).toBe(1000);
            expect(state.signalStrength).toBe(0.75);
            expect(state.status).toBe('listening');
            expect(state.isListening).toBe(true);
            expect(state.receivedSymbols).toEqual(['1', '0']);
        });
    });

    describe('receiveSymbol action', () => {
        it('should add a symbol to the receivedSymbols array', () => {
            const existingState = {
                ...initialState,
                receivedSymbols: ['1', '0']
            };

            const action = receiveSymbol('1');
            const state = receiverReducer(existingState, action);

            expect(state.receivedSymbols).toEqual(['1', '0', '1']);
        });

        it('should start a new array if receivedSymbols is null', () => {
            const existingState = {
                ...initialState,
                receivedSymbols: null
            };

            const action = receiveSymbol('1');
            const state = receiverReducer(existingState, action);

            expect(state.receivedSymbols).toEqual(['1']);
        });

        it('should not affect other state properties', () => {
            const existingState = {
                ...initialState,
                status: 'listening',
                isListening: true,
                detectedFrequency: 1000
            };

            const action = receiveSymbol('1');
            const state = receiverReducer(existingState, action);

            expect(state.status).toBe('listening');
            expect(state.isListening).toBe(true);
            expect(state.detectedFrequency).toBe(1000);
        });
    });

    describe('receiveMessage action', () => {
        it('should update lastReceivedMessage and set status to received', () => {
            const message = {
                text: 'Test message',
                sender: 'Test Sender'
            };

            const action = receiveMessage(message);
            const state = receiverReducer(initialState, action);

            expect(state.lastReceivedMessage).toEqual(message);
            expect(state.status).toBe('received');
        });

        it('should clear receivedSymbols after receiving a message', () => {
            const existingState = {
                ...initialState,
                receivedSymbols: ['1', '0', '1', '0']
            };

            const message = {
                text: 'Test message',
                sender: 'Test Sender'
            };

            const action = receiveMessage(message);
            const state = receiverReducer(existingState, action);

            expect(state.receivedSymbols).toEqual([]);
        });

        it('should preserve isListening state', () => {
            const existingState = {
                ...initialState,
                isListening: true
            };

            const message = {
                text: 'Test message',
                sender: 'Test Sender'
            };

            const action = receiveMessage(message);
            const state = receiverReducer(existingState, action);

            expect(state.isListening).toBe(true);
        });
    });

    describe('setStatus action', () => {
        it('should update the status', () => {
            const action = setStatus('error');
            const state = receiverReducer(initialState, action);

            expect(state.status).toBe('error');
        });

        it('should not affect other state properties', () => {
            const existingState = {
                ...initialState,
                isListening: true,
                receivedSymbols: ['1', '0'],
                lastReceivedMessage: 'Test message'
            };

            const action = setStatus('idle');
            const state = receiverReducer(existingState, action);

            expect(state.status).toBe('idle');
            expect(state.isListening).toBe(true);
            expect(state.receivedSymbols).toEqual(['1', '0']);
            expect(state.lastReceivedMessage).toBe('Test message');
        });
    });
}); 