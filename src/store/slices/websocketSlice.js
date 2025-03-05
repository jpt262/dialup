import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isConnected: false,
    connectionError: null,
    serverUrl: 'ws://localhost:8080',
};

export const websocketSlice = createSlice({
    name: 'websocket',
    initialState,
    reducers: {
        connectionEstablished: (state) => {
            state.isConnected = true;
            state.connectionError = null;
        },
        connectionClosed: (state) => {
            state.isConnected = false;
        },
        connectionError: (state, action) => {
            state.isConnected = false;
            state.connectionError = action.payload;
        },
        updateServerUrl: (state, action) => {
            state.serverUrl = action.payload;
        },
    },
});

export const {
    connectionEstablished,
    connectionClosed,
    connectionError,
    updateServerUrl
} = websocketSlice.actions;

export default websocketSlice.reducer; 