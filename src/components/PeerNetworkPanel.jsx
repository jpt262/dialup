import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  updateDiscoveryState, 
  addPeer, 
  removePeer, 
  clearNetworkData
} from '../store/slices/peerSlice';

/**
 * PeerNetworkPanel component for displaying and managing network peers
 */
const PeerNetworkPanel = () => {
  const dispatch = useDispatch();
  const localPeerId = useSelector(state => state.peers.localPeerId);
  const peers = useSelector(state => state.peers.peers);
  const routes = useSelector(state => state.peers.routes);
  const connectedPeers = useSelector(state => state.peers.connectedPeers);
  const networkMetrics = useSelector(state => state.peers.networkMetrics);
  const discoveryState = useSelector(state => state.peers.discoveryState);
  const settings = useSelector(state => state.settings);
  
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [viewMode, setViewMode] = useState('peers'); // 'peers', 'routes', 'metrics'
  
  // Function to calculate time elapsed
  const getTimeElapsed = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };
  
  // Start peer discovery
  const handleStartDiscovery = () => {
    if (!settings.peerDiscoveryEnabled) return;
    
    dispatch(updateDiscoveryState('searching'));
    
    // Simulated peer discovery for demo purposes
    // In a real implementation, this would use the NetworkManager
    setTimeout(() => {
      // Discovery complete
      dispatch(updateDiscoveryState('complete'));
      
      // Add some mock peers for demonstration
      dispatch(addPeer({
        id: 'peer1',
        name: 'Device Alpha',
        directlyConnected: true,
        transports: ['visual', 'audio'],
        version: '1.0',
        quality: 0.95
      }));
      
      dispatch(addPeer({
        id: 'peer2',
        name: 'Device Beta',
        directlyConnected: true,
        transports: ['visual'],
        version: '1.0',
        quality: 0.85
      }));
      
      dispatch(addPeer({
        id: 'peer3',
        name: 'Device Gamma',
        directlyConnected: false, // Remote peer
        transports: ['audio'],
        version: '1.0',
        quality: 0.7
      }));
    }, 2000);
  };
  
  // Reset peer discovery and clear all network data
  const handleReset = () => {
    dispatch(clearNetworkData());
  };
  
  // Remove a peer from the network
  const handleRemovePeer = (peerId) => {
    dispatch(removePeer(peerId));
    if (selectedPeer === peerId) {
      setSelectedPeer(null);
    }
  };
  
  return (
    <section className="panel">
      <h2>Peer Network</h2>
      
      <div className="local-device-info">
        <h3>Local Device</h3>
        <p>ID: {localPeerId || 'Not initialized'}</p>
        <p>Status: {discoveryState === 'idle' ? 'Idle' : discoveryState === 'searching' ? 'Discovering peers...' : 'Connected'}</p>
        <p>Connected Peers: {connectedPeers.length}</p>
      </div>
      
      <div className="tabs network-tabs">
        <button 
          className={viewMode === 'peers' ? 'active' : ''} 
          onClick={() => setViewMode('peers')}
        >
          Peers ({peers.length})
        </button>
        <button 
          className={viewMode === 'routes' ? 'active' : ''} 
          onClick={() => setViewMode('routes')}
        >
          Routes ({routes.length})
        </button>
        <button 
          className={viewMode === 'metrics' ? 'active' : ''} 
          onClick={() => setViewMode('metrics')}
        >
          Metrics
        </button>
      </div>
      
      <div className="tab-content">
        {viewMode === 'peers' && (
          <div className="peers-list">
            {peers.length > 0 ? (
              <table className="network-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Connection</th>
                    <th>Transports</th>
                    <th>Last Seen</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {peers.map(peer => (
                    <tr 
                      key={peer.id} 
                      className={`${selectedPeer === peer.id ? 'selected' : ''} ${connectedPeers.includes(peer.id) ? 'connected' : ''}`}
                      onClick={() => setSelectedPeer(peer.id === selectedPeer ? null : peer.id)}
                    >
                      <td>{peer.name || peer.id}</td>
                      <td>{peer.directlyConnected ? 'Direct' : 'Relay'}</td>
                      <td>{peer.transports?.join(', ') || '-'}</td>
                      <td>{getTimeElapsed(peer.lastSeen)}</td>
                      <td>
                        <button 
                          className="small-btn danger-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePeer(peer.id);
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="info-message">
                No peers discovered. Start discovery to find peers.
              </div>
            )}
            
            {selectedPeer && (
              <div className="peer-details">
                <h4>Peer Details</h4>
                {peers.find(p => p.id === selectedPeer) && (
                  <div className="peer-detail-content">
                    <p><strong>ID:</strong> {selectedPeer}</p>
                    <p><strong>Name:</strong> {peers.find(p => p.id === selectedPeer).name || 'Unnamed'}</p>
                    <p><strong>Connection:</strong> {peers.find(p => p.id === selectedPeer).directlyConnected ? 'Direct' : 'Relay'}</p>
                    <p><strong>Transports:</strong> {peers.find(p => p.id === selectedPeer).transports?.join(', ') || '-'}</p>
                    <p><strong>First Seen:</strong> {getTimeElapsed(peers.find(p => p.id === selectedPeer).firstSeen)}</p>
                    <p><strong>Message Count:</strong> {peers.find(p => p.id === selectedPeer).messageCount || 0}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {viewMode === 'routes' && (
          <div className="routes-list">
            {routes.length > 0 ? (
              <table className="network-table">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Next Hop</th>
                    <th>Hop Count</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map(route => (
                    <tr key={route.destination}>
                      <td>{peers.find(p => p.id === route.destination)?.name || route.destination}</td>
                      <td>{peers.find(p => p.id === route.nextHop)?.name || route.nextHop}</td>
                      <td>{route.hopCount}</td>
                      <td>{getTimeElapsed(route.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="info-message">
                No routes available. Routes will appear when multiple peers are connected.
              </div>
            )}
          </div>
        )}
        
        {viewMode === 'metrics' && (
          <div className="network-metrics">
            <div className="metrics-overview">
              <div className="metric-card">
                <span className="metric-value">{networkMetrics.messagesSent}</span>
                <span className="metric-label">Messages Sent</span>
              </div>
              
              <div className="metric-card">
                <span className="metric-value">{networkMetrics.messagesReceived}</span>
                <span className="metric-label">Messages Received</span>
              </div>
              
              <div className="metric-card">
                <span className="metric-value">{(networkMetrics.bytesSent / 1024).toFixed(2)} KB</span>
                <span className="metric-label">Data Sent</span>
              </div>
              
              <div className="metric-card">
                <span className="metric-value">{(networkMetrics.bytesReceived / 1024).toFixed(2)} KB</span>
                <span className="metric-label">Data Received</span>
              </div>
            </div>
            
            <div className="metrics-detail">
              <h4>Round Trip Times</h4>
              {networkMetrics.roundTripTimes.length > 0 ? (
                <table className="network-table">
                  <thead>
                    <tr>
                      <th>Peer</th>
                      <th>RTT (ms)</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkMetrics.roundTripTimes.map((rtt, index) => (
                      <tr key={index}>
                        <td>{peers.find(p => p.id === rtt.peerId)?.name || rtt.peerId}</td>
                        <td>{rtt.rtt}</td>
                        <td>{getTimeElapsed(rtt.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="info-message">
                  No round trip times measured yet.
                </div>
              )}
              
              <h4>Error Metrics</h4>
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Failed Messages:</span>
                  <span className="metric-value">{networkMetrics.failedMessages}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Retransmissions:</span>
                  <span className="metric-value">{networkMetrics.retransmissions}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="button-group">
        <button 
          className="primary-btn" 
          onClick={handleStartDiscovery}
          disabled={!settings.peerDiscoveryEnabled || discoveryState === 'searching'}
        >
          {discoveryState === 'searching' ? 'Discovering...' : 'Start Discovery'}
        </button>
        
        <button 
          className="secondary-btn" 
          onClick={handleReset}
        >
          Reset Network
        </button>
      </div>
      
      {!settings.peerDiscoveryEnabled && (
        <div className="warning-message">
          Peer discovery is disabled in settings. Enable it to discover peers.
        </div>
      )}
    </section>
  );
};

export default PeerNetworkPanel; 