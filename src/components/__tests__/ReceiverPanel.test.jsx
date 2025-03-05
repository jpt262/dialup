import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import ReceiverPanel from '../ReceiverPanel';
import * as audioService from '../../services/audioService';
import { startListening, stopListening } from '../../store/slices/receiverSlice';

// Mock dependencies
jest.mock('../../services/audioService');
jest.mock('../../store/slices/receiverSlice');

// Create a mock store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe('ReceiverPanel', () => {
  let store;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Redux store state
    store = mockStore({
      receiver: {
        isListening: false,
        lastReceivedMessage: null,
        receivedSymbols: [],
        detectedFrequency: 0,
        signalStrength: 0
      },
      messages: {
        messages: [
          { id: '1', text: 'First message', sender: 'Visual Sender', timestamp: '2023-01-01T10:00:00Z' },
          { id: '2', text: 'Second message', sender: 'Audio Sender', timestamp: '2023-01-01T11:00:00Z' },
          { id: '3', text: 'You (Visual): Test message', sender: 'You (Visual)', timestamp: '2023-01-01T12:00:00Z' }
        ]
      }
    });
    
    // Mock action creators
    startListening.mockReturnValue({ type: 'mock_startListening' });
    stopListening.mockReturnValue({ type: 'mock_stopListening' });
    
    // Mock audioService methods
    audioService.startAudioReception.mockImplementation((dispatch, onStatusChange) => {
      // Call the status change callback with initial status
      if (onStatusChange) {
        onStatusChange('info', 'Listening for audio signals...');
      }
      return Promise.resolve();
    });
    audioService.isAudioReceptionActive.mockReturnValue(false);
    audioService.getAudioDecoderState.mockReturnValue({
      detectedFrequency: 1000,
      signalStrength: 0.5,
      symbolsDetected: 10
    });
  });
  
  it('renders the ReceiverPanel component for visual mode', () => {
    render(
      <Provider store={store}>
        <ReceiverPanel mode="visual" />
      </Provider>
    );
    
    // Check for visual mode specific elements
    expect(screen.getByText('Visual Reception')).toBeInTheDocument();
    expect(screen.getByText('Start Listening')).toBeInTheDocument();
  });
  
  it('renders the ReceiverPanel component for audio mode', () => {
    render(
      <Provider store={store}>
        <ReceiverPanel mode="audio" />
      </Provider>
    );
    
    // Check for audio mode specific elements
    expect(screen.getByText('Audio Reception')).toBeInTheDocument();
    expect(screen.getByText('Start Listening')).toBeInTheDocument();
  });
  
  it('displays recent messages', () => {
    render(
      <Provider store={store}>
        <ReceiverPanel mode="visual" />
      </Provider>
    );
    
    // Should display the messages except for those sent by the user
    expect(screen.getByText('Recent Messages')).toBeInTheDocument();
    expect(screen.getByText('Visual Sender')).toBeInTheDocument();
    expect(screen.getByText('Audio Sender')).toBeInTheDocument();
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
    
    // Should not display messages sent by the user
    expect(screen.queryByText('You (Visual): Test message')).not.toBeInTheDocument();
  });
  
  it('starts visual listening when Start Listening button is clicked', () => {
    render(
      <Provider store={store}>
        <ReceiverPanel mode="visual" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Listening');
    fireEvent.click(startButton);
    
    // Should dispatch startListening action
    expect(startListening).toHaveBeenCalled();
    expect(store.getActions()).toContainEqual({
      type: 'mock_startListening'
    });
    
    // Status should be updated
    expect(screen.getByText('Listening for visual signals...')).toBeInTheDocument();
  });
  
  it('starts audio listening when Start Listening button is clicked', () => {
    render(
      <Provider store={store}>
        <ReceiverPanel mode="audio" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Listening');
    fireEvent.click(startButton);
    
    // Should call startAudioReception
    expect(audioService.startAudioReception).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function)
    );
    
    // Status should be updated
    expect(screen.getByText('Listening for audio signals...')).toBeInTheDocument();
  });
  
  it('stops visual listening when Stop Listening button is clicked', () => {
    // Update store to show listening state
    store = mockStore({
      ...store.getState(),
      receiver: {
        ...store.getState().receiver,
        isListening: true
      }
    });
    
    render(
      <Provider store={store}>
        <ReceiverPanel mode="visual" />
      </Provider>
    );
    
    // Should show Stop button when listening
    const stopButton = screen.getByText('Stop Listening');
    fireEvent.click(stopButton);
    
    // Should dispatch stopListening action
    expect(stopListening).toHaveBeenCalled();
    expect(store.getActions()).toContainEqual({
      type: 'mock_stopListening'
    });
    
    // Status should be updated
    expect(screen.getByText('Reception stopped')).toBeInTheDocument();
  });
  
  it('stops audio listening when Stop Listening button is clicked', () => {
    // Mock isAudioReceptionActive to return true
    audioService.isAudioReceptionActive.mockReturnValue(true);
    
    render(
      <Provider store={store}>
        <ReceiverPanel mode="audio" />
      </Provider>
    );
    
    // Should show Stop button when listening
    const stopButton = screen.getByText('Stop Listening');
    fireEvent.click(stopButton);
    
    // Should call stopAudioReception
    expect(audioService.stopAudioReception).toHaveBeenCalled();
    
    // Status should be updated
    expect(screen.getByText('Reception stopped')).toBeInTheDocument();
  });
  
  it('shows audio decoder stats when listening to audio', () => {
    // Mock isAudioReceptionActive to return true
    audioService.isAudioReceptionActive.mockReturnValue(true);
    
    render(
      <Provider store={store}>
        <ReceiverPanel mode="audio" />
      </Provider>
    );
    
    // Should show audio reception indicator
    expect(screen.getByText('Audio reception active')).toBeInTheDocument();
    
    // Should show decoder stats
    expect(screen.getByText('Detected frequency: 1000.0 Hz')).toBeInTheDocument();
    expect(screen.getByText('Signal strength: 50.0%')).toBeInTheDocument();
    expect(screen.getByText('Symbols detected: 10')).toBeInTheDocument();
  });
  
  it('shows visual reception indicator when listening visually', () => {
    // Update store to show listening state
    store = mockStore({
      ...store.getState(),
      receiver: {
        ...store.getState().receiver,
        isListening: true
      }
    });
    
    render(
      <Provider store={store}>
        <ReceiverPanel mode="visual" />
      </Provider>
    );
    
    // Should show visual reception indicator
    expect(screen.getByText('Visual reception active')).toBeInTheDocument();
  });
  
  it('shows "No messages received yet" when there are no messages', () => {
    // Update store to have no messages
    store = mockStore({
      ...store.getState(),
      messages: {
        messages: []
      }
    });
    
    render(
      <Provider store={store}>
        <ReceiverPanel mode="visual" />
      </Provider>
    );
    
    // Should show no messages text
    expect(screen.getByText('No messages received yet')).toBeInTheDocument();
  });
  
  it('handles audio reception errors', async () => {
    // Mock startAudioReception to throw an error
    audioService.startAudioReception.mockImplementation((dispatch, onStatusChange) => {
      // Call the status change callback with error status
      if (onStatusChange) {
        onStatusChange('error', 'Failed to access microphone');
      }
      return Promise.reject(new Error('Failed to access microphone'));
    });
    
    render(
      <Provider store={store}>
        <ReceiverPanel mode="audio" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Listening');
    fireEvent.click(startButton);
    
    // Status should show error
    expect(screen.getByText('Failed to access microphone')).toBeInTheDocument();
  });
}); 