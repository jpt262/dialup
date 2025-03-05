import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import SenderPanel from '../SenderPanel';
import * as audioService from '../../services/audioService';
import * as websocketService from '../../services/websocket';
import * as speechService from '../../services/speech';
import { startTransmission, stopTransmission } from '../../store/slices/transmissionSlice';
import { updateDraftMessage, clearDraftMessage, addMessage } from '../../store/slices/messageSlice';

// Mock dependencies
jest.mock('../../services/audioService');
jest.mock('../../services/websocket');
jest.mock('../../services/speech');
jest.mock('../../store/slices/transmissionSlice');
jest.mock('../../store/slices/messageSlice');

// Create a mock store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe('SenderPanel', () => {
  let store;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Redux store state
    store = mockStore({
      transmission: {
        isTransmitting: false,
        frameDuration: 200
      },
      messages: {
        draftMessage: 'Test message'
      },
      speech: {
        isListening: false,
        transcript: ''
      },
      websocket: {
        isConnected: true
      }
    });
    
    // Mock action creators
    startTransmission.mockReturnValue({ type: 'mock_startTransmission' });
    stopTransmission.mockReturnValue({ type: 'mock_stopTransmission' });
    updateDraftMessage.mockImplementation(text => ({ 
      type: 'mock_updateDraftMessage',
      payload: text
    }));
    clearDraftMessage.mockReturnValue({ type: 'mock_clearDraftMessage' });
    addMessage.mockImplementation(message => ({
      type: 'mock_addMessage',
      payload: message
    }));
    
    // Mock audioService methods
    audioService.startAudioTransmission.mockImplementation((message, dispatch, onComplete) => {
      onComplete(); // Call the success callback by default
      return Promise.resolve();
    });
    audioService.isAudioTransmissionActive.mockReturnValue(false);
  });
  
  it('renders the SenderPanel component for visual mode', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    // Check for visual mode specific elements
    expect(screen.getByText('Visual Transmission')).toBeInTheDocument();
    expect(screen.getByLabelText('Transmission speed:')).toBeInTheDocument();
  });
  
  it('renders the SenderPanel component for audio mode', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="audio" />
      </Provider>
    );
    
    // Check for audio mode specific elements
    expect(screen.getByText('Audio Transmission')).toBeInTheDocument();
    // Transmission speed should not be present for audio mode
    expect(screen.queryByLabelText('Transmission speed:')).not.toBeInTheDocument();
  });
  
  it('handles input change for the message', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    const textArea = screen.getByPlaceholderText(/Type your message here/i);
    fireEvent.change(textArea, { target: { value: 'New message' } });
    
    // Should dispatch updateDraftMessage action
    expect(updateDraftMessage).toHaveBeenCalledWith('New message');
    expect(store.getActions()).toContainEqual({
      type: 'mock_updateDraftMessage',
      payload: 'New message'
    });
  });
  
  it('handles input mode change', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    const modeSelect = screen.getByLabelText('Input mode:');
    fireEvent.change(modeSelect, { target: { value: 'binary' } });
    
    // The component should reflect the change (internal state)
    expect(modeSelect.value).toBe('binary');
  });
  
  it('handles speed change in visual mode', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    const speedSelect = screen.getByLabelText('Transmission speed:');
    fireEvent.change(speedSelect, { target: { value: '300' } });
    
    // Check if the action was dispatched
    expect(store.getActions()[0]).toEqual({
      type: 'transmission/setFrameDuration',
      payload: 300
    });
  });
  
  it('starts visual transmission when button is clicked', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Transmission');
    fireEvent.click(startButton);
    
    // Should dispatch startTransmission action
    expect(startTransmission).toHaveBeenCalled();
    expect(store.getActions()).toContainEqual({
      type: 'mock_startTransmission'
    });
    
    // Should dispatch addMessage action
    expect(addMessage).toHaveBeenCalled();
    expect(store.getActions()).toContainEqual(expect.objectContaining({
      type: 'mock_addMessage'
    }));
    
    // Should dispatch clearDraftMessage action
    expect(clearDraftMessage).toHaveBeenCalled();
    expect(store.getActions()).toContainEqual({
      type: 'mock_clearDraftMessage'
    });
  });
  
  it('starts audio transmission when button is clicked', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="audio" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Transmission');
    fireEvent.click(startButton);
    
    // Should call startAudioTransmission
    expect(audioService.startAudioTransmission).toHaveBeenCalledWith(
      'Test message',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    
    // Status should be updated
    expect(screen.getByText('Transmitting message via audio...')).toBeInTheDocument();
    
    // Should dispatch clearDraftMessage action
    expect(clearDraftMessage).toHaveBeenCalled();
    expect(store.getActions()).toContainEqual({
      type: 'mock_clearDraftMessage'
    });
  });
  
  it('cancels visual transmission when button is clicked', () => {
    // Change store to reflect ongoing transmission
    store = mockStore({
      transmission: {
        isTransmitting: true,
        frameDuration: 200
      },
      messages: {
        draftMessage: 'Test message'
      },
      speech: {
        isListening: false,
        transcript: ''
      },
      websocket: {
        isConnected: true
      }
    });
    
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    // Should show Cancel button when transmitting
    const cancelButton = screen.getByText('Cancel Transmission');
    fireEvent.click(cancelButton);
    
    // Should dispatch stopTransmission action
    expect(stopTransmission).toHaveBeenCalled();
    expect(store.getActions()).toContainEqual({
      type: 'mock_stopTransmission'
    });
  });
  
  it('cancels audio transmission when button is clicked', () => {
    // Mock isAudioTransmissionActive to return true
    audioService.isAudioTransmissionActive.mockReturnValue(true);
    
    render(
      <Provider store={store}>
        <SenderPanel mode="audio" />
      </Provider>
    );
    
    // Wait for the component to update with the transmission status
    expect(screen.getByText('Cancel Transmission')).toBeInTheDocument();
    
    const cancelButton = screen.getByText('Cancel Transmission');
    fireEvent.click(cancelButton);
    
    // Should call stopAudioTransmission
    expect(audioService.stopAudioTransmission).toHaveBeenCalled();
  });
  
  it('validates binary input', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    // Change input mode to binary
    const modeSelect = screen.getByLabelText('Input mode:');
    fireEvent.change(modeSelect, { target: { value: 'binary' } });
    
    // Update store with invalid binary
    store = mockStore({
      ...store.getState(),
      messages: {
        draftMessage: '01010A'  // Not valid binary (contains 'A')
      }
    });
    
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Transmission');
    fireEvent.click(startButton);
    
    // Should show validation error
    expect(screen.getByText(/Binary input must contain only 0s and 1s/i)).toBeInTheDocument();
    
    // Should not dispatch actions
    expect(startTransmission).not.toHaveBeenCalled();
  });
  
  it('validates hex input', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    // Change input mode to hex
    const modeSelect = screen.getByLabelText('Input mode:');
    fireEvent.change(modeSelect, { target: { value: 'hex' } });
    
    // Update store with invalid hex
    store = mockStore({
      ...store.getState(),
      messages: {
        draftMessage: '01AG'  // Not valid hex (contains 'G')
      }
    });
    
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Transmission');
    fireEvent.click(startButton);
    
    // Should show validation error
    expect(screen.getByText(/Hex input must contain only hex characters/i)).toBeInTheDocument();
    
    // Should not dispatch actions
    expect(startTransmission).not.toHaveBeenCalled();
  });
  
  it('stops dictation if active when starting transmission', () => {
    // Change store to reflect ongoing dictation
    store = mockStore({
      ...store.getState(),
      speech: {
        isListening: true,
        transcript: 'Dictated message'
      }
    });
    
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Transmission');
    fireEvent.click(startButton);
    
    // Should call stopDictationProcess
    expect(speechService.stopDictationProcess).toHaveBeenCalled();
  });
  
  it('handles audio transmission errors', () => {
    // Mock audio transmission to fail
    audioService.startAudioTransmission.mockImplementation((message, dispatch, onComplete, onError) => {
      onError('Transmission failed');
      return Promise.resolve();
    });
    
    render(
      <Provider store={store}>
        <SenderPanel mode="audio" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Transmission');
    fireEvent.click(startButton);
    
    // Should show error message
    expect(screen.getByText(/Error: Transmission failed/i)).toBeInTheDocument();
  });
  
  it('sends message to WebSocket server when connected', () => {
    render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    const startButton = screen.getByText('Start Transmission');
    fireEvent.click(startButton);
    
    // Should call sendMessageToServer
    expect(websocketService.sendMessageToServer).toHaveBeenCalledWith('Test message');
  });
  
  it('updates draft message when transcript changes during listening', () => {
    // Initial render
    const { rerender } = render(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    // Update store with listening state and transcript
    store = mockStore({
      ...store.getState(),
      speech: {
        isListening: true,
        transcript: 'New transcript'
      }
    });
    
    // Re-render with updated store
    rerender(
      <Provider store={store}>
        <SenderPanel mode="visual" />
      </Provider>
    );
    
    // Should dispatch updateDraftMessage with transcript
    expect(updateDraftMessage).toHaveBeenCalledWith('New transcript');
  });
}); 