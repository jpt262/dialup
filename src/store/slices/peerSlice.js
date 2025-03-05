/**
 * DialUp Peer Slice
 * Redux slice for peer discovery and network management
 */

import { createSlice } from '@reduxjs/toolkit';

/**
 * Initial state for the peers slice
 */
const initialState = {
    localPeerId: null,
    peers: [],
    routes: [],
    connectedPeers: [],
    discoveryState: 'idle', // 'idle', 'searching', 'complete'
    networkReady: false,
    lastNetworkActivity: null,
    networkMetrics: {
        messagesReceived: 0,
        messagesSent: 0,
        bytesReceived: 0,
        bytesSent: 0,
        failedMessages: 0,
        retransmissions: 0,
        roundTripTimes: [] // Last 10 RTTs
    }
};

/**
 * Peers slice for Redux state
 */
const peerSlice = createSlice({
    name: 'peers',
    initialState,
    reducers: {
        /**
         * Sets the local peer ID
         * @param {Object} state - Current state
         * @param {Object} action - Action with local peer ID payload
         */
        setLocalPeerId: (state, action) => {
            state.localPeerId = action.payload;
        },

        /**
         * Adds a new discovered peer
         * @param {Object} state - Current state
         * @param {Object} action - Action with peer information payload
         */
        addPeer: (state, action) => {
            const peer = action.payload;
            const existingIndex = state.peers.findIndex(p => p.id === peer.id);

            if (existingIndex >= 0) {
                // Update existing peer
                state.peers[existingIndex] = {
                    ...state.peers[existingIndex],
                    ...peer,
                    lastSeen: Date.now()
                };
            } else {
                // Add new peer
                state.peers.push({
                    ...peer,
                    lastSeen: Date.now(),
                    firstSeen: Date.now(),
                    messageCount: 0
                });
            }

            // Update connected peers
            if (peer.directlyConnected) {
                if (!state.connectedPeers.includes(peer.id)) {
                    state.connectedPeers.push(peer.id);
                }
            }

            // Update network ready state
            state.networkReady = state.connectedPeers.length > 0;
            state.lastNetworkActivity = Date.now();
        },

        /**
         * Removes a peer
         * @param {Object} state - Current state
         * @param {Object} action - Action with peer ID payload
         */
        removePeer: (state, action) => {
            const peerId = action.payload;

            // Remove from peers array
            state.peers = state.peers.filter(p => p.id !== peerId);

            // Remove from connected peers
            state.connectedPeers = state.connectedPeers.filter(id => id !== peerId);

            // Remove routes that use this peer
            state.routes = state.routes.filter(r => r.nextHop !== peerId);

            // Update network ready state
            state.networkReady = state.connectedPeers.length > 0;
        },

        /**
         * Updates the discovery state
         * @param {Object} state - Current state
         * @param {Object} action - Action with discovery state payload
         */
        updateDiscoveryState: (state, action) => {
            state.discoveryState = action.payload;
            state.lastNetworkActivity = Date.now();
        },

        /**
         * Adds or updates a route
         * @param {Object} state - Current state
         * @param {Object} action - Action with route information payload
         */
        updateRoute: (state, action) => {
            const route = action.payload;
            const existingIndex = state.routes.findIndex(r => r.destination === route.destination);

            if (existingIndex >= 0) {
                state.routes[existingIndex] = {
                    ...state.routes[existingIndex],
                    ...route,
                    timestamp: Date.now()
                };
            } else {
                state.routes.push({
                    ...route,
                    timestamp: Date.now()
                });
            }

            state.lastNetworkActivity = Date.now();
        },

        /**
         * Removes a route
         * @param {Object} state - Current state
         * @param {Object} action - Action with destination ID payload
         */
        removeRoute: (state, action) => {
            const destination = action.payload;
            state.routes = state.routes.filter(r => r.destination !== destination);
        },

        /**
         * Records a message sent to a peer
         * @param {Object} state - Current state
         * @param {Object} action - Action with message info payload
         */
        recordMessageSent: (state, action) => {
            const { peerId, size, messageId } = action.payload;

            // Update overall metrics
            state.networkMetrics.messagesSent++;
            state.networkMetrics.bytesSent += size || 0;

            // Update peer message count
            const peerIndex = state.peers.findIndex(p => p.id === peerId);
            if (peerIndex >= 0) {
                state.peers[peerIndex].messageCount = (state.peers[peerIndex].messageCount || 0) + 1;
            }

            state.lastNetworkActivity = Date.now();
        },

        /**
         * Records a message received from a peer
         * @param {Object} state - Current state
         * @param {Object} action - Action with message info payload
         */
        recordMessageReceived: (state, action) => {
            const { peerId, size, messageId } = action.payload;

            // Update overall metrics
            state.networkMetrics.messagesReceived++;
            state.networkMetrics.bytesReceived += size || 0;

            // Update peer last seen time
            const peerIndex = state.peers.findIndex(p => p.id === peerId);
            if (peerIndex >= 0) {
                state.peers[peerIndex].lastSeen = Date.now();
            }

            state.lastNetworkActivity = Date.now();
        },

        /**
         * Records a round trip time measurement
         * @param {Object} state - Current state
         * @param {Object} action - Action with RTT info payload
         */
        recordRoundTripTime: (state, action) => {
            const { rtt, peerId } = action.payload;

            // Add RTT to the array (limited to last 10)
            state.networkMetrics.roundTripTimes.push({
                rtt,
                peerId,
                timestamp: Date.now()
            });

            // Keep only the last 10 RTTs
            if (state.networkMetrics.roundTripTimes.length > 10) {
                state.networkMetrics.roundTripTimes.shift();
            }
        },

        /**
         * Records a failed message
         * @param {Object} state - Current state
         * @param {Object} action - Action with failed message info payload
         */
        recordFailedMessage: (state, action) => {
            state.networkMetrics.failedMessages++;
        },

        /**
         * Records a message retransmission
         * @param {Object} state - Current state
         * @param {Object} action - Action with retransmission info payload
         */
        recordRetransmission: (state, action) => {
            state.networkMetrics.retransmissions++;
        },

        /**
         * Clears all peer and network data
         * @param {Object} state - Current state
         */
        clearNetworkData: (state) => {
            state.peers = [];
            state.routes = [];
            state.connectedPeers = [];
            state.discoveryState = 'idle';
            state.networkReady = false;
            state.lastNetworkActivity = null;
            state.networkMetrics = {
                messagesReceived: 0,
                messagesSent: 0,
                bytesReceived: 0,
                bytesSent: 0,
                failedMessages: 0,
                retransmissions: 0,
                roundTripTimes: []
            };
        }
    }
});

// Export actions
export const {
    setLocalPeerId,
    addPeer,
    removePeer,
    updateDiscoveryState,
    updateRoute,
    removeRoute,
    recordMessageSent,
    recordMessageReceived,
    recordRoundTripTime,
    recordFailedMessage,
    recordRetransmission,
    clearNetworkData
} = peerSlice.actions;

// Export selectors
export const selectLocalPeerId = (state) => state.peers.localPeerId;
export const selectPeers = (state) => state.peers.peers;
export const selectConnectedPeers = (state) => state.peers.connectedPeers;
export const selectRoutes = (state) => state.peers.routes;
export const selectNetworkReady = (state) => state.peers.networkReady;
export const selectNetworkMetrics = (state) => state.peers.networkMetrics;

export default peerSlice.reducer; 