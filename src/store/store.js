/**
 * DialUp Redux Store
 * Centralizes application state management
 */

import { configureStore } from '@reduxjs/toolkit';
import messageReducer from './slices/messageSlice';
import settingsReducer from './slices/settingsSlice';
import peerReducer from './slices/peerSlice';

/**
 * Redux store configuration
 */
const store = configureStore({
    reducer: {
        messages: messageReducer,
        settings: settingsReducer,
        peers: peerReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore non-serializable values in specific action types
                ignoredActions: ['messages/addMessage/fulfilled']
            }
        })
});

export default store; 