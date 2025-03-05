import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Header from './components/Header';
import SenderPanel from './components/SenderPanel';
import ReceiverPanel from './components/ReceiverPanel';
import MessageHistory from './components/MessageHistory';
import Footer from './components/Footer';
import { initializeWebSocket } from './services/websocket';
import { initializeSpeechRecognition } from './services/speech';
import { initializeAudioService, cleanupAudioService } from './services/audioService';
import './styles/App.css';

function App() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('transmit');
  const [transmissionMode, setTransmissionMode] = useState('visual'); // 'visual' or 'audio'
  
  useEffect(() => {
    // Initialize services
    initializeWebSocket(dispatch);
    initializeSpeechRecognition(dispatch);
    initializeAudioService(dispatch);
    
    // Cleanup on unmount
    return () => {
      cleanupAudioService();
    };
  }, [dispatch]);
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  const handleModeChange = (mode) => {
    setTransmissionMode(mode);
  };
  
  return (
    <div className="app-container">
      <Header />
      
      <main className="main-content">
        <div className="mode-selector">
          <label>Transmission Mode:</label>
          <div className="mode-buttons">
            <button 
              className={`mode-btn ${transmissionMode === 'visual' ? 'active' : ''}`}
              onClick={() => handleModeChange('visual')}
            >
              Visual
            </button>
            <button 
              className={`mode-btn ${transmissionMode === 'audio' ? 'active' : ''}`}
              onClick={() => handleModeChange('audio')}
            >
              Audio
            </button>
          </div>
        </div>
        
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'transmit' ? 'active' : ''}`}
            onClick={() => handleTabChange('transmit')}
          >
            Transmit
          </button>
          <button 
            className={`tab-btn ${activeTab === 'receive' ? 'active' : ''}`}
            onClick={() => handleTabChange('receive')}
          >
            Receive
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            History
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'transmit' && <SenderPanel mode={transmissionMode} />}
          {activeTab === 'receive' && <ReceiverPanel mode={transmissionMode} />}
          {activeTab === 'history' && <MessageHistory />}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App; 