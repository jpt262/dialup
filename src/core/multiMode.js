/**
 * DialUp Multi-Mode Manager
 * Manages the selection and switching between audio, visual, or combined transmission modes
 */

/**
 * Enumeration of available transmission modes
 * @type {Object}
 */
const TransmissionMode = {
    VISUAL: 'visual',
    AUDIO: 'audio',
    BOTH: 'both'
};

/**
 * Creates a mode controller for managing transmission modes
 * @param {Object} options - Configuration options
 * @param {function} options.onModeChange - Callback when mode changes
 * @param {string} [options.initialMode=TransmissionMode.VISUAL] - Initial transmission mode
 * @param {boolean} [options.autoSelect=true] - Whether to automatically select the best mode
 * @returns {Object} - Mode controller object
 */
function createModeController(options = {}) {
    const config = {
        onModeChange: options.onModeChange || (() => { }),
        initialMode: options.initialMode || TransmissionMode.VISUAL,
        autoSelect: options.autoSelect !== undefined ? options.autoSelect : true
    };

    // Current mode and mode capabilities
    let currentMode = config.initialMode;
    const capabilities = {
        [TransmissionMode.VISUAL]: {
            available: true,
            maxRate: 20, // bits per second
            reliability: 0.95
        },
        [TransmissionMode.AUDIO]: {
            available: true,
            maxRate: 40, // bits per second
            reliability: 0.9
        },
        [TransmissionMode.BOTH]: {
            available: true,
            maxRate: 60, // bits per second
            reliability: 0.98
        }
    };

    // Channel quality measurements
    const channelQuality = {
        visual: {
            snr: 20, // dB
            errorRate: 0.05,
            lastUpdate: Date.now()
        },
        audio: {
            snr: 15, // dB
            errorRate: 0.1,
            lastUpdate: Date.now()
        }
    };

    /**
     * Updates the quality assessment for a channel
     * @param {string} channel - Channel type ('visual' or 'audio')
     * @param {Object} metrics - Quality metrics
     * @param {number} metrics.snr - Signal-to-noise ratio in dB
     * @param {number} metrics.errorRate - Error rate (0-1)
     */
    function updateChannelQuality(channel, metrics) {
        if (channel !== 'visual' && channel !== 'audio') {
            throw new Error('Invalid channel type');
        }

        channelQuality[channel] = {
            ...channelQuality[channel],
            ...metrics,
            lastUpdate: Date.now()
        };

        // Update mode availability based on quality
        updateModeAvailability();

        // Auto-select optimal mode if enabled
        if (config.autoSelect) {
            selectOptimalMode();
        }
    }

    /**
     * Updates the availability of transmission modes based on channel quality
     * @private
     */
    function updateModeAvailability() {
        // Visual mode available if SNR is above threshold
        capabilities[TransmissionMode.VISUAL].available =
            channelQuality.visual.snr > 10 && channelQuality.visual.errorRate < 0.3;

        // Audio mode available if SNR is above threshold
        capabilities[TransmissionMode.AUDIO].available =
            channelQuality.audio.snr > 8 && channelQuality.audio.errorRate < 0.4;

        // Both mode available if both channels are available
        capabilities[TransmissionMode.BOTH].available =
            capabilities[TransmissionMode.VISUAL].available &&
            capabilities[TransmissionMode.AUDIO].available;

        // Update max rates based on quality
        updateMaxRates();
    }

    /**
     * Updates maximum data rates based on channel quality
     * @private
     */
    function updateMaxRates() {
        // Adjust visual max rate based on SNR
        capabilities[TransmissionMode.VISUAL].maxRate = Math.floor(
            20 * Math.min(1, channelQuality.visual.snr / 20) * (1 - channelQuality.visual.errorRate)
        );

        // Adjust audio max rate based on SNR
        capabilities[TransmissionMode.AUDIO].maxRate = Math.floor(
            40 * Math.min(1, channelQuality.audio.snr / 15) * (1 - channelQuality.audio.errorRate)
        );

        // Combined rate is less than sum to account for overhead
        const combinedRate = capabilities[TransmissionMode.VISUAL].maxRate +
            capabilities[TransmissionMode.AUDIO].maxRate;
        capabilities[TransmissionMode.BOTH].maxRate = Math.floor(combinedRate * 0.9);
    }

    /**
     * Selects the optimal transmission mode based on channel quality
     * @returns {string} - Selected mode
     */
    function selectOptimalMode() {
        let bestMode = TransmissionMode.VISUAL; // Default
        let bestScore = 0;

        // Calculate scores for each mode based on rate and reliability
        Object.keys(capabilities).forEach(mode => {
            const cap = capabilities[mode];
            if (cap.available) {
                const score = cap.maxRate * cap.reliability;
                if (score > bestScore) {
                    bestScore = score;
                    bestMode = mode;
                }
            }
        });

        // Switch to best mode if different
        if (bestMode !== currentMode) {
            setMode(bestMode);
        }

        return bestMode;
    }

    /**
     * Sets the current transmission mode
     * @param {string} mode - Mode to set
     * @returns {boolean} - Whether the mode was successfully set
     */
    function setMode(mode) {
        if (!Object.values(TransmissionMode).includes(mode)) {
            throw new Error('Invalid transmission mode');
        }

        if (!capabilities[mode].available) {
            console.warn(`Transmission mode ${mode} is not currently available`);
            return false;
        }

        const previousMode = currentMode;
        currentMode = mode;

        // Notify of mode change
        config.onModeChange({
            previousMode,
            currentMode,
            capabilities: capabilities[mode]
        });

        return true;
    }

    /**
     * Gets the current transmission mode and its capabilities
     * @returns {Object} - Mode information
     */
    function getCurrentMode() {
        return {
            mode: currentMode,
            capabilities: { ...capabilities[currentMode] },
            allModes: Object.keys(capabilities).reduce((modes, mode) => {
                modes[mode] = { ...capabilities[mode] };
                return modes;
            }, {})
        };
    }

    /**
     * Gets the current quality assessment for all channels
     * @returns {Object} - Channel quality information
     */
    function getChannelQuality() {
        return JSON.parse(JSON.stringify(channelQuality));
    }

    /**
     * Updates the mode controller configuration
     * @param {Object} newConfig - New configuration options
     */
    function updateConfig(newConfig) {
        if (newConfig.onModeChange !== undefined) {
            config.onModeChange = newConfig.onModeChange;
        }
        if (newConfig.autoSelect !== undefined) {
            config.autoSelect = newConfig.autoSelect;
            if (config.autoSelect) {
                selectOptimalMode();
            }
        }
    }

    // Initialize with configured mode
    if (config.initialMode && !capabilities[config.initialMode].available) {
        selectOptimalMode();
    }

    // Return the mode controller
    return {
        setMode,
        getCurrentMode,
        updateChannelQuality,
        getChannelQuality,
        updateConfig,
        selectOptimalMode,
        TransmissionMode
    };
}

export {
    TransmissionMode,
    createModeController
}; 