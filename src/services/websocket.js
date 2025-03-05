import { setIsConnected, setServerUrl } from '../store/slices/websocketSlice';
import { addMessage } from '../store/slices/messageSlice';

let socket = null;
const SERVER_URL = 'wss://dialup-server.example.com'; // Replace with actual server URL

export const initializeWebSocket = (dispatch) => {
    try {
        // Set server URL in Redux
        dispatch(setServerUrl(SERVER_URL));

        // Create WebSocket connection
        socket = new WebSocket(SERVER_URL);

        socket.onopen = () => {
            console.log('WebSocket connection established');
            dispatch(setIsConnected(true));
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'message') {
                    dispatch(addMessage({
                        text: data.text,
                        sender: data.sender || 'Server',
                        timestamp: data.timestamp || new Date().toISOString(),
                    }));
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            dispatch(setIsConnected(false));
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
            dispatch(setIsConnected(false));

            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                if (socket.readyState === WebSocket.CLOSED) {
                    initializeWebSocket(dispatch);
                }
            }, 5000);
        };
    } catch (error) {
        console.error('Error initializing WebSocket:', error);
        dispatch(setIsConnected(false));
    }
};

export const sendMessageToServer = (message) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not connected, cannot send message');
        return false;
    }

    try {
        const payload = JSON.stringify({
            type: 'message',
            text: message,
            timestamp: new Date().toISOString(),
        });

        socket.send(payload);
        return true;
    } catch (error) {
        console.error('Error sending message to server:', error);
        return false;
    }
};

export const closeWebSocketConnection = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
}; 