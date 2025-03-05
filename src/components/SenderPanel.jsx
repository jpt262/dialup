import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { startTransmission, stopTransmission, setFrameDuration } from '../store/slices/transmissionSlice';
import { updateDraftMessage, clearDraftMessage, addMessage } from '../store/slices/messageSlice';
import { sendMessageToServer } from '../services/websocket';
import { stopDictationProcess } from '../services/speech';
import { encode } from '../core/encoder';
import { startAudioTransmission, stopAudioTransmission, isAudioTransmissionActive } from '../services/audioService';

const SenderPanel = ({ mode }) => {
  const dispatch = useDispatch();
  const { isTransmitting, frameDuration } = useSelector(state => state.transmission);
  const { draftMessage } = useSelector(state => state.messages);
  const { isListening, transcript } = useSelector(state => state.speech);
  const { isConnected } = useSelector(state => state.websocket);
  
  const [statusMessage, setStatusMessage] = useState('Ready to transmit');
  const [statusType, setStatusType] = useState('info');
  const [isAudioTransmitting, setIsAudioTransmitting] = useState(false);
  const [inputMode, setInputMode] = useState('text'); // 'text', 'binary', or 'hex'
  
  // Update draftMessage when transcript changes during listening
  useEffect(() => {
    if (isListening && transcript) {
      dispatch(updateDraftMessage(transcript));
    }
  }, [isListening, transcript, dispatch]);
  
  // Check audio transmission status
  useEffect(() => {
    const checkAudioStatus = () => {
      const status = isAudioTransmissionActive();
      setIsAudioTransmitting(status);
    };
    
    // Check initially and set up interval
    checkAudioStatus();
    const interval = setInterval(checkAudioStatus, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleInputChange = (e) => {
    dispatch(updateDraftMessage(e.target.value));
  };
  
  const handleSpeedChange = (e) => {
    dispatch(setFrameDuration(parseInt(e.target.value)));
  };
  
  const handleInputModeChange = (e) => {
    setInputMode(e.target.value);
  };
  
  const validateInput = () => {
    if (!draftMessage.trim()) {
      setStatusMessage('Please enter a message to transmit');
      setStatusType('error');
      return false;
    }
    
    // Validate binary input
    if (inputMode === 'binary') {
      if (!/^[01]+$/.test(draftMessage.trim())) {
        setStatusMessage('Binary input must contain only 0s and 1s');
        setStatusType('error');
        return false;
      }
      
      // Check if length is multiple of 8 for proper byte encoding
      if (draftMessage.trim().length % 8 !== 0) {
        setStatusMessage('Binary input length must be a multiple of 8 bits');
        setStatusType('error');
        return false;
      }
    }
    
    // Validate hex input
    if (inputMode === 'hex') {
      if (!/^[0-9A-Fa-f]+$/.test(draftMessage.trim())) {
        setStatusMessage('Hex input must contain only hex characters (0-9, A-F)');
        setStatusType('error');
        return false;
      }
      
      // Check if length is even for proper byte encoding
      if (draftMessage.trim().length % 2 !== 0) {
        setStatusMessage('Hex input length must be even (each byte is 2 hex chars)');
        setStatusType('error');
        return false;
      }
    }
    
    return true;
  };
  
  const handleStartTransmission = () => {
    if (!validateInput()) {
      return;
    }
    
    // Stop any active dictation
    if (isListening) {
      stopDictationProcess(dispatch);
    }
    
    try {
      // Send to WebSocket server if connected
      if (isConnected) {
        const sent = sendMessageToServer(draftMessage);
        if (sent) {
          setStatusMessage('Message sent to server');
        }
      }
      
      // For visual transmission mode
      if (mode === 'visual') {
        const { colors } = encode(draftMessage, inputMode);
        
        dispatch(startTransmission({
          sequence: colors,
        }));
        
        setStatusMessage('Transmitting message visually...');
        setStatusType('info');
        
        // Add to message history
        dispatch(addMessage({
          text: draftMessage,
          sender: 'You (Visual)',
          timestamp: new Date().toISOString(),
        }));
        
        // Clear draft after sending
        dispatch(clearDraftMessage());
      } 
      // For audio mode
      else if (mode === 'audio') {
        setStatusMessage('Transmitting message via audio...');
        setStatusType('info');
        
        startAudioTransmission(
          draftMessage,
          dispatch,
          // onComplete callback
          () => {
            setStatusMessage('Audio transmission complete');
            setStatusType('success');
            setIsAudioTransmitting(false);
          },
          // onError callback
          (errorMessage) => {
            setStatusMessage(`Error: ${errorMessage}`);
            setStatusType('error');
            setIsAudioTransmitting(false);
          }
        );
        
        setIsAudioTransmitting(true);
        
        // Clear draft after sending
        dispatch(clearDraftMessage());
      }
    } catch (error) {
      console.error('Transmission error:', error);
      setStatusMessage(`Error: ${error.message}`);
      setStatusType('error');
    }
  };
  
  const handleCancelTransmission = () => {
    if (mode === 'visual') {
      dispatch(stopTransmission());
    } else if (mode === 'audio') {
      stopAudioTransmission();
      setIsAudioTransmitting(false);
    }
    
    setStatusMessage('Transmission cancelled');
    setStatusType('info');
  };
  
  return (
    <section className="panel">
      <h2>{mode === 'visual' ? 'Visual' : 'Audio'} Transmission</h2>
      
      <div className="form-group">
        <label htmlFor="inputMode">Input mode:</label>
        <select 
          id="inputMode"
          value={inputMode}
          onChange={handleInputModeChange}
          disabled={isTransmitting || isAudioTransmitting}
        >
          <option value="text">Text</option>
          <option value="binary">Binary</option>
          <option value="hex">Hexadecimal</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="messageInput">
          {inputMode === 'text' ? 'Enter message:' : 
           inputMode === 'binary' ? 'Enter binary data (0s and 1s):' : 
           'Enter hexadecimal data:'}
        </label>
        <textarea 
          id="messageInput" 
          rows="4" 
          maxLength="256" 
          placeholder={
            inputMode === 'text' ? 'Type your message here or press spacebar for dictation' :
            inputMode === 'binary' ? 'Enter binary data (e.g., 01001000 01101001)' :
            'Enter hex data (e.g., 48656C6C6F)'
          }
          value={draftMessage}
          onChange={handleInputChange}
          disabled={isTransmitting || isAudioTransmitting}
        ></textarea>
        <div className="char-counter">
          <span id="charCount">{draftMessage.length}</span>/256
        </div>
      </div>
      
      {mode === 'visual' && (
        <div className="form-group">
          <label htmlFor="transmissionSpeed">Transmission speed:</label>
          <select 
            id="transmissionSpeed"
            value={frameDuration}
            onChange={handleSpeedChange}
            disabled={isTransmitting}
          >
            <option value="100">Fast (100ms)</option>
            <option value="200">Medium (200ms)</option>
            <option value="300">Slow (300ms)</option>
            <option value="500">Very Slow (500ms)</option>
          </select>
        </div>
      )}
      
      {(isTransmitting || isAudioTransmitting) ? (
        <button 
          className="primary-btn cancel-btn"
          onClick={handleCancelTransmission}
        >
          Cancel Transmission
        </button>
      ) : (
        <button 
          className="primary-btn"
          onClick={handleStartTransmission}
          disabled={isTransmitting || isAudioTransmitting}
        >
          Start Transmission
        </button>
      )}
      
      <div className={`status-box status-${statusType}`} id="transmitStatus">
        {statusMessage}
      </div>
      
      {isListening && (
        <div className="dictation-indicator">
          <div className="pulse-circle"></div>
          Dictation active - speak now
        </div>
      )}
    </section>
  );
};

export default SenderPanel; 