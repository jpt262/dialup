/**
 * DialUp Settings Slice
 * Redux slice for application settings management
 */

import { createSlice } from '@reduxjs/toolkit';
import { TransmissionMode } from '../../core/multiMode';

/**
 * Default application settings
 */
const defaultSettings = {
    // Transmission Settings
    transmissionMode: TransmissionMode.VISUAL,
    visualEnabled: true,
    audioEnabled: true,
    autoSelectMode: true,

    // Input Settings
    inputMode: 'text', // 'text', 'binary', 'hex'
    maxMessageSize: 1024,

    // Error Correction
    errorCorrectionMode: 'hamming', // 'none', 'hamming', 'reed-solomon'
    errorCorrectionStrength: 1,
    adaptiveErrorCorrection: true,

    // Network Settings
    peerDiscoveryEnabled: true,
    peerRelayEnabled: true,

    // Advanced Settings
    diagnosticsEnabled: true,
    colorThreshold: 50,
    minChangeTime: 50,
    samplesRequired: 3
};

/**
 * Settings slice for Redux state
 */
const settingsSlice = createSlice({
    name: 'settings',
    initialState: defaultSettings,
    reducers: {
        /**
         * Updates settings with new values
         * @param {Object} state - Current state
         * @param {Object} action - Action with settings payload
         */
        updateSettings: (state, action) => {
            return {
                ...state,
                ...action.payload
            };
        },

        /**
         * Updates a single setting
         * @param {Object} state - Current state
         * @param {Object} action - Action with setting key and value
         */
        updateSetting: (state, action) => {
            const { key, value } = action.payload;
            state[key] = value;

            // Handle special cases and dependencies
            if (key === 'transmissionMode') {
                // If visual mode is selected, ensure visual is enabled
                if (value === TransmissionMode.VISUAL) {
                    state.visualEnabled = true;
                }
                // If audio mode is selected, ensure audio is enabled
                else if (value === TransmissionMode.AUDIO) {
                    state.audioEnabled = true;
                }
                // If both mode is selected, ensure both are enabled
                else if (value === TransmissionMode.BOTH) {
                    state.visualEnabled = true;
                    state.audioEnabled = true;
                }
            }
            // If auto-select is enabled, disable manual mode selection
            else if (key === 'autoSelectMode' && value === true) {
                // Don't change transmissionMode, mode controller will handle it
            }
            // If visual is disabled, ensure we're not in visual-only mode
            else if (key === 'visualEnabled' && value === false) {
                if (state.transmissionMode === TransmissionMode.VISUAL) {
                    state.transmissionMode = state.audioEnabled
                        ? TransmissionMode.AUDIO
                        : TransmissionMode.VISUAL; // Keep visual if audio is also disabled
                }
                else if (state.transmissionMode === TransmissionMode.BOTH) {
                    state.transmissionMode = TransmissionMode.AUDIO;
                }
            }
            // If audio is disabled, ensure we're not in audio-only mode
            else if (key === 'audioEnabled' && value === false) {
                if (state.transmissionMode === TransmissionMode.AUDIO) {
                    state.transmissionMode = state.visualEnabled
                        ? TransmissionMode.VISUAL
                        : TransmissionMode.AUDIO; // Keep audio if visual is also disabled
                }
                else if (state.transmissionMode === TransmissionMode.BOTH) {
                    state.transmissionMode = TransmissionMode.VISUAL;
                }
            }
            // If error correction mode is none, disable strength and adaptive
            else if (key === 'errorCorrectionMode' && value === 'none') {
                state.adaptiveErrorCorrection = false;
                state.errorCorrectionStrength = 1;
            }
        },

        /**
         * Resets all settings to defaults
         */
        resetSettings: () => {
            return { ...defaultSettings };
        }
    }
});

// Export actions
export const { updateSettings, updateSetting, resetSettings } = settingsSlice.actions;

// Export settings selectors
export const selectSettings = (state) => state.settings;
export const selectTransmissionMode = (state) => state.settings.transmissionMode;
export const selectInputMode = (state) => state.settings.inputMode;
export const selectErrorCorrectionMode = (state) => state.settings.errorCorrectionMode;

// Export reducer
export default settingsSlice.reducer; 