import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    messages: [],
    draftMessage: '',
};

export const messageSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        addMessage: (state, action) => {
            const { text, sender, timestamp = new Date().toISOString() } = action.payload;
            state.messages.push({
                id: Date.now().toString(),
                text,
                sender,
                timestamp,
            });
        },
        clearMessages: (state) => {
            state.messages = [];
        },
        updateDraftMessage: (state, action) => {
            state.draftMessage = action.payload;
        },
        clearDraftMessage: (state) => {
            state.draftMessage = '';
        }
    },
});

export const {
    addMessage,
    clearMessages,
    updateDraftMessage,
    clearDraftMessage
} = messageSlice.actions;

export default messageSlice.reducer; 