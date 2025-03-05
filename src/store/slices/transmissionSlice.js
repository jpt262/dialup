import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isTransmitting: false,
    colorSequence: [],
    currentIndex: 0,
    frameDuration: 200, // ms
    progress: 0,
    transmissionMode: 'visual', // 'visual' or 'audio'
};

export const transmissionSlice = createSlice({
    name: 'transmission',
    initialState,
    reducers: {
        startTransmission: (state, action) => {
            state.isTransmitting = true;
            state.colorSequence = action.payload.sequence;
            state.currentIndex = 0;
            state.progress = 0;
        },
        stopTransmission: (state) => {
            state.isTransmitting = false;
            state.colorSequence = [];
            state.currentIndex = 0;
            state.progress = 0;
        },
        setTransmissionProgress: (state, action) => {
            state.currentIndex = action.payload.currentIndex;
            state.progress = action.payload.progress;
        },
        setFrameDuration: (state, action) => {
            state.frameDuration = action.payload;
        },
        setTransmissionMode: (state, action) => {
            state.transmissionMode = action.payload;
        }
    },
});

export const {
    startTransmission,
    stopTransmission,
    setTransmissionProgress,
    setFrameDuration,
    setTransmissionMode
} = transmissionSlice.actions;

export default transmissionSlice.reducer; 