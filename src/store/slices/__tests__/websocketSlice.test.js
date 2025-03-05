import websocketReducer, {
    setIsConnected,
    setServerUrl,
    setError,
    clearError,
    initialState
} from '../websocketSlice';

describe('websocket slice', () => {
    it('should return the initial state when no state is provided', () => {
        expect(websocketReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    describe('setIsConnected action', () => {
        it('should update the isConnected state', () => {
            // Test setting to true
            let action = setIsConnected(true);
            let state = websocketReducer(initialState, action);

            expect(state.isConnected).toBe(true);

            // Test setting to false
            action = setIsConnected(false);
            state = websocketReducer(state, action);

            expect(state.isConnected).toBe(false);
        });

        it('should not affect other state properties', () => {
            const existingState = {
                ...initialState,
                serverUrl: 'ws://example.com'
            };

            const action = setIsConnected(true);
            const state = websocketReducer(existingState, action);

            expect(state.isConnected).toBe(true);
            expect(state.serverUrl).toBe('ws://example.com');
        });
    });

    describe('setServerUrl action', () => {
        it('should update the serverUrl state', () => {
            const action = setServerUrl('ws://example.com:8080');
            const state = websocketReducer(initialState, action);

            expect(state.serverUrl).toBe('ws://example.com:8080');
        });

        it('should not affect other state properties', () => {
            const existingState = {
                ...initialState,
                isConnected: true
            };

            const action = setServerUrl('ws://example.com:8080');
            const state = websocketReducer(existingState, action);

            expect(state.serverUrl).toBe('ws://example.com:8080');
            expect(state.isConnected).toBe(true);
        });

        it('should handle empty or null URLs gracefully', () => {
            // Test with empty string
            let action = setServerUrl('');
            let state = websocketReducer(initialState, action);

            expect(state.serverUrl).toBe('');

            // Test with null
            action = setServerUrl(null);
            state = websocketReducer(initialState, action);

            // Implementation-specific: Some reducers might convert null to empty string
            expect(state.serverUrl === null || state.serverUrl === '').toBeTruthy();
        });
    });

    describe('combined state changes', () => {
        it('should handle multiple actions correctly', () => {
            // Start with initial state
            let state = initialState;

            // Set the server URL
            state = websocketReducer(state, setServerUrl('ws://test.com'));
            expect(state.serverUrl).toBe('ws://test.com');
            expect(state.isConnected).toBe(false); // Should still be false (initial value)

            // Connect to the server
            state = websocketReducer(state, setIsConnected(true));
            expect(state.serverUrl).toBe('ws://test.com'); // Should still be the same
            expect(state.isConnected).toBe(true);

            // Change server URL while connected
            state = websocketReducer(state, setServerUrl('ws://new-server.com'));
            expect(state.serverUrl).toBe('ws://new-server.com');
            expect(state.isConnected).toBe(true); // Connection state should be preserved

            // Disconnect
            state = websocketReducer(state, setIsConnected(false));
            expect(state.serverUrl).toBe('ws://new-server.com'); // Server URL should be preserved
            expect(state.isConnected).toBe(false);
        });
    });

    it('should handle setError', () => {
        const error = 'Connection failed';
        const nextState = websocketReducer(initialState, setError(error));
        expect(nextState.error).toBe(error);
        expect(nextState.isConnected).toBe(false); // Should set isConnected to false
    });

    it('should handle clearError', () => {
        const stateWithError = {
            ...initialState,
            error: 'Previous error',
        };
        const nextState = websocketReducer(stateWithError, clearError());
        expect(nextState.error).toBeNull();
    });

    it('should clear error when connected', () => {
        const stateWithError = {
            ...initialState,
            error: 'Previous error',
        };
        const nextState = websocketReducer(stateWithError, setIsConnected(true));
        expect(nextState.error).toBeNull();
        expect(nextState.isConnected).toBe(true);
    });
}); 