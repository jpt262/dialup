import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage } from '../store/slices/messageSlice';
import { createCameraController } from '../capture/camera';
import { createColorTracker } from '../capture/colorTracker';
import { startListening, stopListening } from '../store/slices/receiverSlice';
import { startAudioReception, stopAudioReception, isAudioReceptionActive, getAudioDecoderState } from '../services/audioService';

const ReceiverPanel = ({ mode }) => {
  const dispatch = useDispatch();
  const { isListening: isVisualListening, lastReceivedMessage } = useSelector(state => state.receiver);
  const { messages } = useSelector(state => state.messages);
  
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to receive');
  const [statusType, setStatusType] = useState('info');
  const [isAudioListening, setIsAudioListening] = useState(false);
  const [audioDecoderState, setAudioDecoderState] = useState({});
  
  const cameraControllerRef = useRef(null);
  const colorTrackerRef = useRef(null);
  
  // Setup camera and tracker
  useEffect(() => {
    if (videoRef.current) {
      // Initialize tracker
      colorTrackerRef.current = createColorTracker();
      
      // Set up tracker callbacks
      if (colorTrackerRef.current) {
        colorTrackerRef.current.onMessage((message) => {
          dispatch(addMessage({
            text: message.text,
            sender: 'Remote',
          }));
        });
        
        colorTrackerRef.current.onStatusChange((statusEvent) => {
          handleTrackerStatus(statusEvent);
        });
      }
    }
    
    return () => {
      // Clean up
      if (cameraControllerRef.current) {
        cameraControllerRef.current.stop();
      }
      if (colorTrackerRef.current) {
        colorTrackerRef.current.reset();
      }
    };
  }, [dispatch]);
  
  // Check audio reception status
  useEffect(() => {
    const checkAudioStatus = () => {
      const status = isAudioReceptionActive();
      setIsAudioListening(status);
      
      if (status) {
        // Get decoder state for UI updates
        const state = getAudioDecoderState();
        setAudioDecoderState(state);
      } else {
        setAudioDecoderState({});
      }
    };
    
    // Check initially and set up interval
    checkAudioStatus();
    const interval = setInterval(checkAudioStatus, 200);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleTrackerStatus = (statusEvent) => {
    const { status, data } = statusEvent;
    
    switch (status) {
      case 'started':
        setStatusMessage('Transmission detected! Receiving...');
        setStatusType('info');
        break;
        
      case 'tracking':
        // Update every 5 colors to avoid too many updates
        if (data.count % 5 === 0) {
          setStatusMessage(`Receiving data: ${data.count} colors received`);
        }
        break;
        
      case 'decoded':
        setStatusMessage('Message received successfully!');
        setStatusType('success');
        break;
        
      case 'error':
        setStatusMessage(`Decoding error: ${data.message}`);
        setStatusType('error');
        break;
        
      case 'timeout':
        setStatusMessage('Reception timed out');
        setStatusType('error');
        break;
        
      case 'reset':
        if (!isCameraActive) {
          setStatusMessage('Ready to receive');
          setStatusType('info');
        }
        break;
        
      default:
        break;
    }
  };
  
  const processFrame = (frame) => {
    if (!cameraControllerRef.current || !colorTrackerRef.current) return;
    
    // Define region of interest (navbar area)
    const roi = {
      x: 0,
      y: 0,
      width: videoRef.current.videoWidth,
      height: Math.min(60, Math.floor(videoRef.current.videoHeight * 0.15)) // Top 15% or 60px
    };
    
    // Get average color in the region
    const avgColor = cameraControllerRef.current.getRegionAverageColor(roi);
    
    if (avgColor && colorTrackerRef.current) {
      // Pass to color tracker
      colorTrackerRef.current.processColor(avgColor);
    }
  };
  
  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  };
  
  const startCamera = async () => {
    try {
      setStatusMessage('Starting camera...');
      setStatusType('info');
      
      // Initialize camera controller
      cameraControllerRef.current = createCameraController(videoRef.current);
      
      // Start camera
      await cameraControllerRef.current.start();
      
      // Reset tracker
      if (colorTrackerRef.current) {
        colorTrackerRef.current.reset();
      }
      
      // Set frame processor
      cameraControllerRef.current.setFrameProcessor(processFrame, 10);
      
      setIsCameraActive(true);
      setStatusMessage('Camera active. Point at transmitting navbar.');
      setStatusType('info');
      
    } catch (error) {
      console.error('Camera error:', error);
      setStatusMessage(`Camera error: ${error.message}`);
      setStatusType('error');
    }
  };
  
  const stopCamera = () => {
    if (cameraControllerRef.current) {
      cameraControllerRef.current.stop();
    }
    
    if (colorTrackerRef.current) {
      colorTrackerRef.current.reset();
    }
    
    setIsCameraActive(false);
    setStatusMessage('Camera stopped');
    setStatusType('info');
  };
  
  const handleStartListening = () => {
    try {
      if (mode === 'visual') {
        dispatch(startListening());
        setStatusMessage('Listening for visual signals...');
        setStatusType('info');
      } else if (mode === 'audio') {
        startAudioReception(
          dispatch,
          // onStatusChange callback
          (status, message) => {
            setStatusMessage(message);
            setStatusType(status === 'error' ? 'error' : 'info');
          }
        );
        setStatusMessage('Listening for audio signals...');
        setStatusType('info');
      }
    } catch (error) {
      console.error('Reception error:', error);
      setStatusMessage(`Error: ${error.message}`);
      setStatusType('error');
    }
  };
  
  const handleStopListening = () => {
    if (mode === 'visual') {
      dispatch(stopListening());
    } else if (mode === 'audio') {
      stopAudioReception();
    }
    
    setStatusMessage('Reception stopped');
    setStatusType('info');
  };
  
  // Get the last 5 received messages
  const recentMessages = [...messages]
    .filter(msg => msg.sender !== 'You (Visual)' && msg.sender !== 'You (Audio)')
    .slice(-5)
    .reverse();
  
  const isCurrentlyListening = mode === 'visual' ? isVisualListening : isAudioListening;
  
  return (
    <section className="panel">
      <h2>{mode === 'visual' ? 'Visual' : 'Audio'} Reception</h2>
      
      {mode === 'visual' && (
        <div className="camera-container">
          <video 
            ref={videoRef} 
            id="cameraFeed" 
            autoPlay 
            playsInline 
            muted
          ></video>
        </div>
      )}
      
      {isCurrentlyListening ? (
        <button 
          className="primary-btn cancel-btn"
          onClick={handleStopListening}
        >
          Stop Listening
        </button>
      ) : (
        <button 
          className="primary-btn"
          onClick={handleStartListening}
        >
          Start Listening
        </button>
      )}
      
      <div className={`status-box status-${statusType}`} id="receiveStatus">
        {statusMessage}
      </div>
      
      {isCurrentlyListening && (
        <div className="reception-indicator">
          <div className="pulse-circle"></div>
          {mode === 'visual' ? 'Visual reception active' : 'Audio reception active'}
          
          {mode === 'audio' && audioDecoderState && (
            <div className="audio-decoder-stats">
              {audioDecoderState.detectedFrequency && (
                <div>Detected frequency: {audioDecoderState.detectedFrequency.toFixed(1)} Hz</div>
              )}
              {audioDecoderState.signalStrength !== undefined && (
                <div>Signal strength: {(audioDecoderState.signalStrength * 100).toFixed(1)}%</div>
              )}
              {audioDecoderState.symbolsDetected !== undefined && (
                <div>Symbols detected: {audioDecoderState.symbolsDetected}</div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="received-messages">
        <h3>Recent Messages</h3>
        {recentMessages.length > 0 ? (
          <ul>
            {recentMessages.map((msg, index) => (
              <li key={index} className="message-item">
                <div className="message-header">
                  <span className="message-sender">{msg.sender}</span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-text">{msg.text}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-messages">No messages received yet</p>
        )}
      </div>
    </section>
  );
};

export default ReceiverPanel; 