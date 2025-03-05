import messageReducer, {
    addMessage,
    updateDraftMessage,
    clearDraftMessage,
    clearAllMessages
} from '../messageSlice';

describe('message slice', () => {
    const initialState = {
        messages: [],
        draftMessage: '',
    };

    it('should return the initial state', () => {
        expect(messageReducer(undefined, { type: undefined })).toEqual(initialState);
    });

    it('should handle addMessage', () => {
        const mockDate = new Date('2023-01-01T12:00:00Z').toISOString();
        const payload = {
            text: 'Test message',
            sender: 'Tester',
            timestamp: mockDate,
        };

        // Set a fixed value for Date.now() to make the test deterministic
        jest.spyOn(Date, 'now').mockImplementation(() => 1234567890);

        const nextState = messageReducer(initialState, addMessage(payload));

        expect(nextState.messages).toHaveLength(1);
        expect(nextState.messages[0]).toEqual({
            id: '1234567890',
            text: 'Test message',
            sender: 'Tester',
            timestamp: mockDate,
        });

        // Clean up
        jest.restoreAllMocks();
    });

    it('should generate timestamp if not provided in addMessage', () => {
        const mockDate = new Date('2023-01-01T12:00:00Z').toISOString();
        const originalDate = global.Date;
        global.Date = class extends Date {
            constructor() {
                super();
            }
            toISOString() {
                return mockDate;
            }
        };

        const payload = {
            text: 'Test message',
            sender: 'Tester',
        };

        jest.spyOn(Date, 'now').mockImplementation(() => 1234567890);

        const nextState = messageReducer(initialState, addMessage(payload));

        expect(nextState.messages).toHaveLength(1);
        expect(nextState.messages[0].timestamp).toEqual(mockDate);

        // Clean up
        global.Date = originalDate;
        jest.restoreAllMocks();
    });

    it('should handle updateDraftMessage', () => {
        const nextState = messageReducer(initialState, updateDraftMessage('New draft'));
        expect(nextState.draftMessage).toEqual('New draft');
    });

    it('should handle clearDraftMessage', () => {
        const stateWithDraft = {
            ...initialState,
            draftMessage: 'Current draft',
        };
        const nextState = messageReducer(stateWithDraft, clearDraftMessage());
        expect(nextState.draftMessage).toEqual('');
    });

    it('should handle clearAllMessages', () => {
        const stateWithMessages = {
            ...initialState,
            messages: [
                { id: '1', text: 'First message', sender: 'Tester1', timestamp: '2023-01-01T10:00:00Z' },
                { id: '2', text: 'Second message', sender: 'Tester2', timestamp: '2023-01-01T11:00:00Z' },
            ],
        };
        const nextState = messageReducer(stateWithMessages, clearAllMessages());
        expect(nextState.messages).toEqual([]);
    });
});
