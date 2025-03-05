import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isListening: false,
    lastReceivedMessage: null,
    receivedSymbols: [],
    detectedFrequency: 0,
    signalStrength: 0,
};

const receiverSlice = createSlice({
    name: 'receiver',
    initialState,
    reducers: {
        startListening: (state) => {
            state.isListening = true;
        },
        stopListening: (state) => {
            state.isListening = false;
        },
        setLastReceivedMessage: (state, action) => {
            state.lastReceivedMessage = action.payload;
        },
        addReceivedSymbol: (state, action) => {
            state.receivedSymbols.push(action.payload);
        },
        clearReceivedSymbols: (state) => {
            state.receivedSymbols = [];
        },
        updateSignalMetrics: (state, action) => {
            if (action.payload.detectedFrequency !== undefined) {
                state.detectedFrequency = action.payload.detectedFrequency;
            }
            if (action.payload.signalStrength !== undefined) {
                state.signalStrength = action.payload.signalStrength;
            }
        },
    },
});

export const {
    startListening,
    stopListening,
    setLastReceivedMessage,
    addReceivedSymbol,
    clearReceivedSymbols,
    updateSignalMetrics
} = receiverSlice.actions;

export default receiverSlice.reducer; 