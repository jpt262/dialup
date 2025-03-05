import messagesReducer, {
    addMessage,
    clearMessages,
    initialState
} from '../messagesSlice';

describe('messagesSlice', () => {
    it('should return the initial state when no state is provided', () => {
        expect(messagesReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    describe('addMessage action', () => {
        it('should add a new message to an empty messages array', () => {
            const message = {
                text: 'Test message',
                sender: 'Test Sender',
                timestamp: '2023-01-01T10:00:00Z'
            };

            const action = addMessage(message);
            const state = messagesReducer(initialState, action);

            expect(state.messages.length).toBe(1);
            expect(state.messages[0].text).toBe('Test message');
            expect(state.messages[0].sender).toBe('Test Sender');
            expect(state.messages[0].timestamp).toBe('2023-01-01T10:00:00Z');
            expect(state.messages[0].id).toBeDefined(); // ID should be auto-generated
        });

        it('should add a new message to an existing messages array', () => {
            const existingState = {
                messages: [
                    {
                        id: '1',
                        text: 'Existing message',
                        sender: 'Existing Sender',
                        timestamp: '2023-01-01T09:00:00Z'
                    }
                ]
            };

            const message = {
                text: 'Test message',
                sender: 'Test Sender',
                timestamp: '2023-01-01T10:00:00Z'
            };

            const action = addMessage(message);
            const state = messagesReducer(existingState, action);

            expect(state.messages.length).toBe(2);
            expect(state.messages[0].text).toBe('Existing message');
            expect(state.messages[1].text).toBe('Test message');
        });

        it('should generate a unique ID for each message', () => {
            const message1 = {
                text: 'First message',
                sender: 'Test Sender',
                timestamp: '2023-01-01T10:00:00Z'
            };

            const message2 = {
                text: 'Second message',
                sender: 'Test Sender',
                timestamp: '2023-01-01T10:05:00Z'
            };

            let state = messagesReducer(initialState, addMessage(message1));
            state = messagesReducer(state, addMessage(message2));

            expect(state.messages.length).toBe(2);
            expect(state.messages[0].id).not.toBe(state.messages[1].id);
        });

        it('should use provided ID if one is included in the message', () => {
            const message = {
                id: 'custom-id',
                text: 'Test message',
                sender: 'Test Sender',
                timestamp: '2023-01-01T10:00:00Z'
            };

            const action = addMessage(message);
            const state = messagesReducer(initialState, action);

            expect(state.messages.length).toBe(1);
            expect(state.messages[0].id).toBe('custom-id');
        });

        it('should generate a timestamp if one is not provided', () => {
            const message = {
                text: 'Test message',
                sender: 'Test Sender'
            };

            const action = addMessage(message);
            const state = messagesReducer(initialState, action);

            expect(state.messages.length).toBe(1);
            expect(state.messages[0].timestamp).toBeDefined();
            expect(new Date(state.messages[0].timestamp)).toBeInstanceOf(Date);
        });
    });

    describe('clearMessages action', () => {
        it('should clear all messages', () => {
            const existingState = {
                messages: [
                    {
                        id: '1',
                        text: 'Existing message',
                        sender: 'Existing Sender',
                        timestamp: '2023-01-01T09:00:00Z'
                    },
                    {
                        id: '2',
                        text: 'Another message',
                        sender: 'Another Sender',
                        timestamp: '2023-01-01T10:00:00Z'
                    }
                ]
            };

            const action = clearMessages();
            const state = messagesReducer(existingState, action);

            expect(state.messages.length).toBe(0);
        });

        it('should not affect other state properties if they exist', () => {
            const existingState = {
                messages: [
                    {
                        id: '1',
                        text: 'Existing message',
                        sender: 'Existing Sender',
                        timestamp: '2023-01-01T09:00:00Z'
                    }
                ],
                otherProperty: 'should remain unchanged'
            };

            const action = clearMessages();
            const state = messagesReducer(existingState, action);

            expect(state.messages.length).toBe(0);
            expect(state.otherProperty).toBe('should remain unchanged');
        });
    });

    describe('message sorting', () => {
        it('should maintain messages in chronological order', () => {
            let state = initialState;

            const message1 = {
                text: 'First message',
                sender: 'Test Sender',
                timestamp: '2023-01-01T10:00:00Z'
            };

            const message2 = {
                text: 'Second message',
                sender: 'Test Sender',
                timestamp: '2023-01-01T11:00:00Z'
            };

            const message3 = {
                text: 'Earlier message',
                sender: 'Test Sender',
                timestamp: '2023-01-01T09:00:00Z'
            };

            state = messagesReducer(state, addMessage(message1));
            state = messagesReducer(state, addMessage(message2));
            state = messagesReducer(state, addMessage(message3));

            expect(state.messages.length).toBe(3);
            expect(state.messages[0].text).toBe('Earlier message');
            expect(state.messages[1].text).toBe('First message');
            expect(state.messages[2].text).toBe('Second message');
        });
    });
}); 