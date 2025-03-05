/**
 * DialUp Network Manager
 * Manages peer discovery, routing, and multi-hop relay capabilities
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a network manager for peer discovery and message routing
 * @param {Object} options - Configuration options
 * @param {string} [options.peerId] - Local peer ID (generated if not provided)
 * @param {number} [options.discoveryInterval=10000] - Peer discovery broadcast interval (ms)
 * @param {number} [options.routeTimeout=30000] - Route timeout (ms)
 * @param {function} [options.onPeerDiscovered] - Callback when new peer is discovered
 * @param {function} [options.onPeerLost] - Callback when peer is lost
 * @param {function} [options.onRouteChanged] - Callback when routing table changes
 * @param {function} [options.onMessageReceived] - Callback when message is received
 * @param {function} [options.sendMessage] - Function to send messages using transport layer
 * @returns {Object} - Network manager object
 */
function createNetworkManager(options = {}) {
    // Configuration with defaults
    const config = {
        peerId: options.peerId || uuidv4(),
        discoveryInterval: options.discoveryInterval || 10000,
        routeTimeout: options.routeTimeout || 30000,
        onPeerDiscovered: options.onPeerDiscovered || (() => { }),
        onPeerLost: options.onPeerLost || (() => { }),
        onRouteChanged: options.onRouteChanged || (() => { }),
        onMessageReceived: options.onMessageReceived || (() => { }),
        sendMessage: options.sendMessage || (() => {
            console.warn('No sendMessage function provided to NetworkManager');
        })
    };

    // Peer information storage
    const peers = new Map();
    // Route information (destination -> next hop)
    const routes = new Map();
    // Received message cache to prevent duplicates
    const messageCache = new Map();
    // Timer handles
    let discoveryTimer = null;
    let cleanupTimer = null;

    /**
     * Message types used by the network protocol
     * @private
     */
    const MessageType = {
        DISCOVERY: 'discovery',
        DISCOVERY_RESPONSE: 'discovery_response',
        ROUTE: 'route',
        DATA: 'data',
        ACK: 'ack'
    };

    /**
     * Initializes the network manager
     */
    function init() {
        // Start timers
        discoveryTimer = setInterval(broadcastDiscovery, config.discoveryInterval);
        cleanupTimer = setInterval(cleanupStaleEntries, config.routeTimeout);

        // Broadcast initial discovery
        broadcastDiscovery();
    }

    /**
     * Broadcasts a discovery message to find peers
     */
    function broadcastDiscovery() {
        const discovery = {
            type: MessageType.DISCOVERY,
            sender: config.peerId,
            timestamp: Date.now(),
            ttl: 3, // Time to live (max hops)
            transports: ['visual', 'audio'], // Supported transports
            version: '1.0'
        };

        broadcastMessage(discovery);
    }

    /**
     * Handles an incoming discovery message
     * @param {Object} message - Discovery message
     * @param {string} receivedFrom - Peer ID message was received from
     * @private
     */
    function handleDiscovery(message, receivedFrom) {
        const { sender, timestamp, ttl } = message;

        // Don't process our own discovery messages
        if (sender === config.peerId) {
            return;
        }

        // Add or update peer information
        updatePeer(sender, {
            lastSeen: Date.now(),
            directlyConnected: receivedFrom === sender,
            transports: message.transports || [],
            version: message.version || '1.0'
        });

        // Send discovery response
        if (message.type === MessageType.DISCOVERY) {
            const response = {
                type: MessageType.DISCOVERY_RESPONSE,
                sender: config.peerId,
                receiver: sender,
                timestamp: Date.now(),
                ttl: 3,
                transports: ['visual', 'audio'],
                version: '1.0'
            };

            sendMessage(response, sender);
        }

        // Relay discovery messages to other peers if TTL allows
        if (ttl > 1 && message.type === MessageType.DISCOVERY) {
            const relayMessage = {
                ...message,
                ttl: ttl - 1
            };

            // Send to all peers except the one we received from
            for (const [peerId, peer] of peers.entries()) {
                if (peerId !== receivedFrom && peer.directlyConnected) {
                    sendMessage(relayMessage, peerId);
                }
            }
        }

        // Update routing table
        updateRoute(sender, receivedFrom, 1); // Direct connection = 1 hop
    }

    /**
     * Updates information about a peer
     * @param {string} peerId - ID of the peer to update
     * @param {Object} info - Updated peer information
     * @private
     */
    function updatePeer(peerId, info) {
        const isNewPeer = !peers.has(peerId);

        // Create or update peer info
        peers.set(peerId, {
            ...(peers.get(peerId) || {}),
            ...info,
            id: peerId
        });

        // Invoke callback for new peers
        if (isNewPeer) {
            config.onPeerDiscovered(peers.get(peerId));
        }
    }

    /**
     * Updates a route in the routing table
     * @param {string} destination - Destination peer ID
     * @param {string} nextHop - Next hop peer ID
     * @param {number} hopCount - Number of hops to destination
     * @private
     */
    function updateRoute(destination, nextHop, hopCount) {
        // Don't need a route to ourselves
        if (destination === config.peerId) {
            return;
        }

        const existingRoute = routes.get(destination);
        const shouldUpdate = !existingRoute ||
            hopCount < existingRoute.hopCount ||
            (hopCount === existingRoute.hopCount && Date.now() - existingRoute.timestamp > 5000);

        if (shouldUpdate) {
            routes.set(destination, {
                nextHop,
                hopCount,
                timestamp: Date.now()
            });

            // Broadcast route update to neighbors
            broadcastRoute(destination, hopCount);

            // Notify of route change
            config.onRouteChanged({
                destination,
                nextHop,
                hopCount
            });
        }
    }

    /**
     * Broadcasts a route update to neighbors
     * @param {string} destination - Destination peer ID
     * @param {number} hopCount - Hop count to destination
     * @private
     */
    function broadcastRoute(destination, hopCount) {
        const routeMessage = {
            type: MessageType.ROUTE,
            sender: config.peerId,
            timestamp: Date.now(),
            ttl: 2,
            route: {
                destination,
                hopCount: hopCount + 1 // Increment hop count for neighbors
            }
        };

        // Only send to directly connected peers
        for (const [peerId, peer] of peers.entries()) {
            if (peer.directlyConnected) {
                sendMessage(routeMessage, peerId);
            }
        }
    }

    /**
     * Handles an incoming route update message
     * @param {Object} message - Route message
     * @param {string} receivedFrom - Peer ID message was received from
     * @private
     */
    function handleRoute(message, receivedFrom) {
        const { route, ttl } = message;

        // Update route to the destination through the next hop
        updateRoute(route.destination, receivedFrom, route.hopCount);

        // Relay route message if TTL allows
        if (ttl > 1) {
            const relayMessage = {
                ...message,
                ttl: ttl - 1
            };

            // Send to all directly connected peers except the one we received from
            for (const [peerId, peer] of peers.entries()) {
                if (peerId !== receivedFrom && peer.directlyConnected) {
                    sendMessage(relayMessage, peerId);
                }
            }
        }
    }

    /**
     * Broadcasts a message to all directly connected peers
     * @param {Object} message - Message to broadcast
     * @private
     */
    function broadcastMessage(message) {
        // Send to all directly connected peers
        for (const [peerId, peer] of peers.entries()) {
            if (peer.directlyConnected) {
                sendMessage(message, peerId);
            }
        }
    }

    /**
     * Sends a message to a specific peer, using routing if necessary
     * @param {Object} message - Message to send
     * @param {string} destinationId - Destination peer ID
     * @returns {boolean} - Whether the message was sent
     */
    function sendMessage(message, destinationId) {
        // If peer is directly connected, send directly
        const peer = peers.get(destinationId);
        if (peer && peer.directlyConnected) {
            return sendDirectMessage(message, destinationId);
        }

        // Otherwise, use routing
        const route = routes.get(destinationId);
        if (route) {
            const routedMessage = {
                ...message,
                originalSender: message.sender || config.peerId,
                sender: config.peerId,
                finalDestination: destinationId,
                routed: true
            };

            return sendDirectMessage(routedMessage, route.nextHop);
        }

        // No route available
        console.warn(`No route to peer ${destinationId}`);
        return false;
    }

    /**
     * Sends a message directly to a connected peer using the transport layer
     * @param {Object} message - Message to send
     * @param {string} peerId - Destination peer ID
     * @returns {boolean} - Whether the message was sent
     * @private
     */
    function sendDirectMessage(message, peerId) {
        try {
            // Add message ID if not present
            if (!message.id) {
                message.id = uuidv4();
            }

            // Use the provided sendMessage function
            config.sendMessage(message, peerId);
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }

    /**
     * Processes an incoming message from the transport layer
     * @param {Object} message - Received message
     * @param {string} receivedFrom - Peer ID message was received from
     */
    function processMessage(message, receivedFrom) {
        // Check for duplicate messages (using message ID)
        if (message.id) {
            if (messageCache.has(message.id)) {
                return; // Already processed this message
            }

            // Add to cache
            messageCache.set(message.id, {
                timestamp: Date.now(),
                receivedFrom
            });
        }

        // Process based on message type
        switch (message.type) {
            case MessageType.DISCOVERY:
            case MessageType.DISCOVERY_RESPONSE:
                handleDiscovery(message, receivedFrom);
                break;

            case MessageType.ROUTE:
                handleRoute(message, receivedFrom);
                break;

            case MessageType.DATA:
                handleDataMessage(message, receivedFrom);
                break;

            case MessageType.ACK:
                handleAcknowledgment(message);
                break;

            default:
                // Handle as regular message
                handleDataMessage(message, receivedFrom);
        }
    }

    /**
     * Handles a data message (possibly routed)
     * @param {Object} message - Data message
     * @param {string} receivedFrom - Peer ID message was received from
     * @private
     */
    function handleDataMessage(message, receivedFrom) {
        // If message is routed and we're not the final destination, relay it
        if (message.routed && message.finalDestination && message.finalDestination !== config.peerId) {
            relayMessage(message);
            return;
        }

        // Update peer info for the sender
        updatePeer(message.originalSender || message.sender, {
            lastSeen: Date.now()
        });

        // Deliver message to application
        config.onMessageReceived(message, message.originalSender || message.sender);

        // Send acknowledgment if needed
        if (message.requireAck) {
            sendAcknowledgment(message);
        }
    }

    /**
     * Relays a message to its final destination
     * @param {Object} message - Message to relay
     * @private
     */
    function relayMessage(message) {
        const finalDestination = message.finalDestination;

        // Find route to final destination
        const route = routes.get(finalDestination);
        if (route) {
            // Forward the message
            sendDirectMessage(message, route.nextHop);
        } else {
            console.warn(`Cannot relay message: no route to ${finalDestination}`);
        }
    }

    /**
     * Sends an acknowledgment for a received message
     * @param {Object} message - Message to acknowledge
     * @private
     */
    function sendAcknowledgment(message) {
        const ack = {
            type: MessageType.ACK,
            sender: config.peerId,
            referencedMessageId: message.id,
            timestamp: Date.now()
        };

        sendMessage(ack, message.originalSender || message.sender);
    }

    /**
     * Handles an acknowledgment message
     * @param {Object} message - Acknowledgment message
     * @private
     */
    function handleAcknowledgment(message) {
        // In a full implementation, this would trigger completion of pending message deliveries
        // and notify the application about successful delivery
    }

    /**
     * Cleans up stale peer entries and routes
     * @private
     */
    function cleanupStaleEntries() {
        const now = Date.now();

        // Clean up stale peers
        for (const [peerId, peer] of peers.entries()) {
            if (now - peer.lastSeen > config.routeTimeout) {
                peers.delete(peerId);
                config.onPeerLost(peer);
            }
        }

        // Clean up stale routes
        for (const [destination, route] of routes.entries()) {
            if (now - route.timestamp > config.routeTimeout) {
                routes.delete(destination);

                // Notify of route change (deletion)
                config.onRouteChanged({
                    destination,
                    nextHop: null,
                    hopCount: Infinity
                });
            }
        }

        // Clean up message cache
        for (const [messageId, entry] of messageCache.entries()) {
            if (now - entry.timestamp > 60000) { // 1 minute cache
                messageCache.delete(messageId);
            }
        }
    }

    /**
     * Gets all known peers
     * @returns {Array} - Array of peer objects
     */
    function getAllPeers() {
        return Array.from(peers.values());
    }

    /**
     * Gets all known routes
     * @returns {Array} - Array of route objects
     */
    function getAllRoutes() {
        return Array.from(routes.entries()).map(([destination, route]) => ({
            destination,
            ...route
        }));
    }

    /**
     * Gets the local peer ID
     * @returns {string} - Local peer ID
     */
    function getLocalPeerId() {
        return config.peerId;
    }

    /**
     * Stops the network manager and cleans up resources
     */
    function stop() {
        if (discoveryTimer) {
            clearInterval(discoveryTimer);
            discoveryTimer = null;
        }

        if (cleanupTimer) {
            clearInterval(cleanupTimer);
            cleanupTimer = null;
        }

        // Clear all collections
        peers.clear();
        routes.clear();
        messageCache.clear();
    }

    // Initialize on creation
    init();

    // Return the public API
    return {
        processMessage,
        sendMessage,
        broadcastMessage,
        getAllPeers,
        getAllRoutes,
        getLocalPeerId,
        stop
    };
}

export {
    createNetworkManager
}; 