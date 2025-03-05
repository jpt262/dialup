/**
 * DialUp Sequencer Module
 * Handles message sequencing, fragmentation, and reassembly
 */

/**
 * Creates a message sequencer for handling message ordering and fragmentation
 * @param {Object} options - Configuration options
 * @param {number} [options.maxSequence=255] - Maximum sequence number (wraps around)
 * @param {number} [options.maxPayloadSize=1024] - Maximum payload size per fragment
 * @returns {Object} - Message sequencer object
 */
function createMessageSequencer(options = {}) {
    const config = {
        maxSequence: options.maxSequence || 255,
        maxPayloadSize: options.maxPayloadSize || 1024
    };

    // Current sequence number
    let currentSequence = 0;

    /**
     * Fragment a message into smaller chunks with sequence information
     * @param {Object} message - Message to fragment
     * @param {string} message.content - Message content
     * @param {string} message.type - Message type ('text', 'binary', 'hex')
     * @param {string} message.encoding - Message encoding ('text', 'binary', 'hex')
     * @returns {Array} - Array of sequenced message fragments
     */
    function fragmentMessage(message) {
        const { content, type, encoding } = message;

        // If message is small enough, no need to fragment
        if (content.length <= config.maxPayloadSize) {
            const sequencedMessage = {
                ...message,
                sequenceNumber: currentSequence,
                fragmentCount: 1,
                fragmentNumber: 0,
                totalLength: content.length,
                isFragment: false
            };

            incrementSequence();
            return [sequencedMessage];
        }

        // Split content into chunks
        const chunks = [];
        for (let i = 0; i < content.length; i += config.maxPayloadSize) {
            chunks.push(content.slice(i, i + config.maxPayloadSize));
        }

        // Create sequenced fragments
        const sequenceNumber = currentSequence;
        incrementSequence();

        return chunks.map((chunk, index) => ({
            content: chunk,
            type,
            encoding,
            sequenceNumber,
            fragmentCount: chunks.length,
            fragmentNumber: index,
            totalLength: content.length,
            isFragment: true
        }));
    }

    /**
     * Increment the sequence number, wrapping around if needed
     * @private
     */
    function incrementSequence() {
        currentSequence = (currentSequence + 1) % (config.maxSequence + 1);
    }

    /**
     * Reset the sequencer state (e.g., when starting a new transmission)
     */
    function reset() {
        currentSequence = 0;
    }

    /**
     * Get the current sequence number
     * @returns {number} - Current sequence number
     */
    function getCurrentSequence() {
        return currentSequence;
    }

    // Return the sequencer object
    return {
        fragmentMessage,
        reset,
        getCurrentSequence
    };
}

/**
 * Creates a message assembler for reassembling fragmented messages
 * @param {Object} options - Configuration options
 * @param {number} [options.bufferSize=100] - Maximum number of message fragments to buffer
 * @param {number} [options.timeout=10000] - Timeout in milliseconds for collecting fragments
 * @returns {Object} - Message assembler object
 */
function createMessageAssembler(options = {}) {
    const config = {
        bufferSize: options.bufferSize || 100,
        timeout: options.timeout || 10000
    };

    // Maps sequence numbers to arrays of fragments and metadata
    const fragments = new Map();
    // Maps sequence numbers to timeout IDs
    const timeouts = new Map();

    /**
     * Add a fragment to the assembler
     * @param {Object} fragment - Message fragment
     * @returns {Object|null} - Reassembled message if complete, null otherwise
     */
    function addFragment(fragment) {
        const { sequenceNumber, fragmentNumber, fragmentCount, isFragment } = fragment;

        // If it's not a fragment, return it directly
        if (!isFragment) {
            return fragment;
        }

        // Initialize fragment array if needed
        if (!fragments.has(sequenceNumber)) {
            fragments.set(sequenceNumber, {
                fragments: new Array(fragmentCount),
                received: 0,
                type: fragment.type,
                encoding: fragment.encoding,
                totalLength: fragment.totalLength
            });

            // Set timeout for this sequence
            const timeoutId = setTimeout(() => {
                cleanupSequence(sequenceNumber);
            }, config.timeout);

            timeouts.set(sequenceNumber, timeoutId);
        }

        const fragmentData = fragments.get(sequenceNumber);

        // Skip if we already have this fragment
        if (fragmentData.fragments[fragmentNumber]) {
            return null;
        }

        // Add the fragment
        fragmentData.fragments[fragmentNumber] = fragment;
        fragmentData.received++;

        // Check if we have all fragments
        if (fragmentData.received === fragmentCount) {
            return assembleMessage(sequenceNumber);
        }

        return null;
    }

    /**
     * Assemble a complete message from its fragments
     * @param {number} sequenceNumber - The sequence number to assemble
     * @returns {Object} - The assembled message
     * @private
     */
    function assembleMessage(sequenceNumber) {
        const fragmentData = fragments.get(sequenceNumber);

        // Concatenate all fragment contents
        const content = fragmentData.fragments
            .map(fragment => fragment.content)
            .join('');

        // Create the assembled message
        const message = {
            content,
            type: fragmentData.type,
            encoding: fragmentData.encoding,
            sequenceNumber,
            isFragment: false,
            wasReassembled: true
        };

        // Clean up
        cleanupSequence(sequenceNumber);

        return message;
    }

    /**
     * Clean up resources for a sequence number
     * @param {number} sequenceNumber - The sequence number to clean up
     * @private
     */
    function cleanupSequence(sequenceNumber) {
        fragments.delete(sequenceNumber);

        if (timeouts.has(sequenceNumber)) {
            clearTimeout(timeouts.get(sequenceNumber));
            timeouts.delete(sequenceNumber);
        }
    }

    /**
     * Reset the assembler state
     */
    function reset() {
        // Clear all timeouts
        for (const timeoutId of timeouts.values()) {
            clearTimeout(timeoutId);
        }

        // Clear collections
        fragments.clear();
        timeouts.clear();
    }

    /**
     * Get stats about the current state of the assembler
     * @returns {Object} - Assembler stats
     */
    function getStats() {
        return {
            activeSequences: fragments.size,
            totalFragmentsBuffered: Array.from(fragments.values())
                .reduce((sum, data) => sum + data.received, 0)
        };
    }

    // Return the assembler object
    return {
        addFragment,
        reset,
        getStats
    };
}

export {
    createMessageSequencer,
    createMessageAssembler
}; 