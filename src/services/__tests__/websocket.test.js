import * as websocketService from '../websocket';
import { setIsConnected, setServerUrl } from '../../store/slices/websocketSlice';
import { addMessage } from '../../store/slices/messageSlice';

// Mock the Redux action creators
jest.mock('../../store/slices/websocketSlice', () => ({
    setIsConnected: jest.fn().mockReturnValue({ type: 'mock_setIsConnected' }),
    setServerUrl: jest.fn().mockReturnValue({ type: 'mock_setServerUrl' }),
    setError: jest.fn().mockReturnValue({ type: 'mock_setError' })
}));

jest.mock('../../store/slices/messageSlice', () => ({
    addMessage: jest.fn().mockReturnValue({ type: 'mock_addMessage' })
}));

describe('websocket service', () => {
    let mockDispatch;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock dispatch function
        mockDispatch = jest.fn();
    });

    describe('initializeWebSocket', () => {
        it('should initialize websocket connection', () => {
            websocketService.initializeWebSocket(mockDispatch);

            // Should dispatch setServerUrl with the server URL
            expect(setServerUrl).toHaveBeenCalled();
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setServerUrl'
            }));
        });

        it('should handle connection open event', () => {
            websocketService.initializeWebSocket(mockDispatch);

            // Get the WebSocket instance and trigger onopen
            const mockWebSocket = global.WebSocket.mock.instances[0];
            mockWebSocket.onopen();

            // Should dispatch setIsConnected with true
            expect(setIsConnected).toHaveBeenCalledWith(true);
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setIsConnected'
            }));
        });

        it('should handle received messages', () => {
            websocketService.initializeWebSocket(mockDispatch);

            // Get the WebSocket instance
            const mockWebSocket = global.WebSocket.mock.instances[0];

            // Simulate receiving a message
            const messageData = JSON.stringify({
                type: 'message',
                text: 'Hello from server',
                sender: 'Server',
                timestamp: '2023-01-01T12:00:00Z'
            });

            mockWebSocket.onmessage({ data: messageData });

            // Should dispatch addMessage with the received message
            expect(addMessage).toHaveBeenCalledWith({
                text: 'Hello from server',
                sender: 'Server',
                timestamp: '2023-01-01T12:00:00Z'
            });

            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_addMessage'
            }));
        });

        it('should handle invalid message data', () => {
            websocketService.initializeWebSocket(mockDispatch);

            // Get the WebSocket instance
            const mockWebSocket = global.WebSocket.mock.instances[0];

            // Simulate receiving invalid JSON
            const invalidData = 'not valid json';

            // This should not throw
            expect(() => {
                mockWebSocket.onmessage({ data: invalidData });
            }).not.toThrow();

            // Should not dispatch addMessage
            expect(addMessage).not.toHaveBeenCalled();
        });

        it('should handle error events', () => {
            websocketService.initializeWebSocket(mockDispatch);

            // Get the WebSocket instance
            const mockWebSocket = global.WebSocket.mock.instances[0];

            // Simulate an error
            const error = new Error('WebSocket error');
            mockWebSocket.onerror(error);

            // Should dispatch setIsConnected with false
            expect(setIsConnected).toHaveBeenCalledWith(false);
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setIsConnected'
            }));
        });

        it('should handle close events', () => {
            websocketService.initializeWebSocket(mockDispatch);

            // Get the WebSocket instance
            const mockWebSocket = global.WebSocket.mock.instances[0];

            // Simulate closing
            mockWebSocket.onclose();

            // Should dispatch setIsConnected with false
            expect(setIsConnected).toHaveBeenCalledWith(false);
            expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'mock_setIsConnected'
            }));
        });
    });

    describe('sendMessageToServer', () => {
        it('should send message to server when connected', () => {
            // Setup WebSocket mock with OPEN state
            const mockSend = jest.fn();
            jest.spyOn(global, 'WebSocket').mockImplementation(() => ({
                readyState: WebSocket.OPEN,
                send: mockSend
            }));

            // Initialize WebSocket
            websocketService.initializeWebSocket(mockDispatch);

            // Send a message
            const message = 'Test message';
            const result = websocketService.sendMessageToServer(message);

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalled();

            // Verify the JSON structure of the sent message
            const sentData = JSON.parse(mockSend.mock.calls[0][0]);
            expect(sentData).toEqual(expect.objectContaining({
                type: 'message',
                text: 'Test message'
            }));
        });

        it('should not send message when not connected', () => {
            // Setup WebSocket mock with CLOSED state
            jest.spyOn(global, 'WebSocket').mockImplementation(() => ({
                readyState: WebSocket.CLOSED
            }));

            // Initialize WebSocket
            websocketService.initializeWebSocket(mockDispatch);

            // Try to send a message
            const message = 'Test message';
            const result = websocketService.sendMessageToServer(message);

            expect(result).toBe(false);
        });

        it('should handle send errors', () => {
            // Setup WebSocket mock with OPEN state but send throws error
            const mockSend = jest.fn().mockImplementation(() => {
                throw new Error('Send error');
            });

            jest.spyOn(global, 'WebSocket').mockImplementation(() => ({
                readyState: WebSocket.OPEN,
                send: mockSend
            }));

            // Initialize WebSocket
            websocketService.initializeWebSocket(mockDispatch);

            // Send a message
            const message = 'Test message';
            const result = websocketService.sendMessageToServer(message);

            expect(result).toBe(false);
        });
    });

    describe('closeWebSocketConnection', () => {
        it('should close WebSocket connection', () => {
            // Setup WebSocket mock
            const mockClose = jest.fn();
            jest.spyOn(global, 'WebSocket').mockImplementation(() => ({
                close: mockClose
            }));

            // Initialize WebSocket
            websocketService.initializeWebSocket(mockDispatch);

            // Close the connection
            websocketService.closeWebSocketConnection();

            expect(mockClose).toHaveBeenCalled();
        });
    });
});
