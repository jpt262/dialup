import React from 'react';
import { useSelector } from 'react-redux';
import '../styles/Header.css';

const Header = () => {
  const { isConnected } = useSelector(state => state.websocket);
  
  return (
    <header className="app-header">
      <div className="logo">
        <h1>DialUp</h1>
        <p className="tagline">Visual & Audio Data Transmission System</p>
      </div>
      
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
        <span>{isConnected ? 'Connected to server' : 'Offline mode'}</span>
      </div>
      
      <div className="header-actions">
        <button className="help-btn" title="Help">?</button>
      </div>
    </header>
  );
};

export default Header; 