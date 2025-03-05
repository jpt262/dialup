import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isListening: false,
    transcript: '',
    recognition: null,
};

const speechSlice = createSlice({
    name: 'speech',
    initialState,
    reducers: {
        setIsListening: (state, action) => {
            state.isListening = action.payload;
        },
        setTranscript: (state, action) => {
            state.transcript = action.payload;
        },
        setRecognition: (state, action) => {
            state.recognition = action.payload;
        },
        clearTranscript: (state) => {
            state.transcript = '';
        },
    },
});

export const {
    setIsListening,
    setTranscript,
    setRecognition,
    clearTranscript
} = speechSlice.actions;

export default speechSlice.reducer;