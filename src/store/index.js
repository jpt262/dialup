import { configureStore } from '@reduxjs/toolkit';
import transmissionReducer from './slices/transmissionSlice';
import messageReducer from './slices/messageSlice';
import websocketReducer from './slices/websocketSlice';
import speechReducer from './slices/speechSlice';
import receiverReducer from './slices/receiverSlice';

const store = configureStore({
    reducer: {
        transmission: transmissionReducer,
        messages: messageReducer,
        websocket: websocketReducer,
        speech: speechReducer,
        receiver: receiverReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types
                ignoredActions: ['speech/setRecognition'],
                // Ignore these field paths in all actions
                ignoredActionPaths: ['payload.recognition'],
                // Ignore these paths in the state
                ignoredPaths: ['speech.recognition'],
            },
        }),
});

export default store; 