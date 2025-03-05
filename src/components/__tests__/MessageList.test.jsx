import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import MessageList from '../MessageList';

// Create a mock store
const mockStore = configureStore([]);

describe('MessageList', () => {
  let store;
  
  beforeEach(() => {
    // Set up a default mock store
    store = mockStore({
      messages: {
        messages: [
          { id: '1', text: 'Hello world', sender: 'Visual Sender', timestamp: '2023-01-01T10:00:00Z' },
          { id: '2', text: 'Testing audio', sender: 'Audio Sender', timestamp: '2023-01-01T10:05:00Z' },
          { id: '3', text: 'My visual message', sender: 'You (Visual)', timestamp: '2023-01-01T10:10:00Z' },
          { id: '4', text: 'My audio message', sender: 'You (Audio)', timestamp: '2023-01-01T10:15:00Z' }
        ]
      },
      transmission: {
        status: 'idle',
        progress: 0,
        error: null
      },
      receiver: {
        status: 'idle',
        lastReceivedMessage: null
      },
      websocket: {
        isConnected: true,
        serverUrl: 'ws://localhost:8080'
      }
    });
  });
  
  it('renders the component with message history', () => {
    render(
      <Provider store={store}>
        <MessageList />
      </Provider>
    );
    
    // Should display all messages
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Testing audio')).toBeInTheDocument();
    expect(screen.getByText('My visual message')).toBeInTheDocument();
    expect(screen.getByText('My audio message')).toBeInTheDocument();
    
    // Should display all senders
    expect(screen.getByText('Visual Sender')).toBeInTheDocument();
    expect(screen.getByText('Audio Sender')).toBeInTheDocument();
    expect(screen.getByText('You (Visual)')).toBeInTheDocument();
    expect(screen.getByText('You (Audio)')).toBeInTheDocument();
  });
  
  it('displays the websocket connection status when connected', () => {
    render(
      <Provider store={store}>
        <MessageList />
      </Provider>
    );
    
    // Should display connected status
    expect(screen.getByText('Connected to: ws://localhost:8080')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status-indicator')).toHaveClass('connected');
  });
  
  it('displays the websocket connection status when disconnected', () => {
    // Update store to show disconnected state
    store = mockStore({
      ...store.getState(),
      websocket: {
        isConnected: false,
        serverUrl: 'ws://localhost:8080'
      }
    });
    
    render(
      <Provider store={store}>
        <MessageList />
      </Provider>
    );
    
    // Should display disconnected status
    expect(screen.getByText('Disconnected from: ws://localhost:8080')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status-indicator')).toHaveClass('disconnected');
  });
  
  it('displays transmission status when transmitting', () => {
    // Update store to show transmitting state
    store = mockStore({
      ...store.getState(),
      transmission: {
        status: 'transmitting',
        progress: 50,
        error: null
      }
    });
    
    render(
      <Provider store={store}>
        <MessageList />
      </Provider>
    );
    
    // Should display transmitting status and progress
    expect(screen.getByText('Transmitting... 50%')).toBeInTheDocument();
    
    // Progress bar should be visible and have correct value
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('value', '50');
  });
  
  it('displays receiver status when listening', () => {
    // Update store to show listening state
    store = mockStore({
      ...store.getState(),
      receiver: {
        status: 'listening',
        lastReceivedMessage: null
      }
    });
    
    render(
      <Provider store={store}>
        <MessageList />
      </Provider>
    );
    
    // Should display listening status
    expect(screen.getByText('Listening for incoming signals...')).toBeInTheDocument();
  });
  
  it('displays transmission error when there is one', () => {
    // Update store to show error state
    store = mockStore({
      ...store.getState(),
      transmission: {
        status: 'error',
        progress: 0,
        error: 'Failed to transmit message'
      }
    });
    
    render(
      <Provider store={store}>
        <MessageList />
      </Provider>
    );
    
    // Should display error message
    expect(screen.getByText('Error: Failed to transmit message')).toBeInTheDocument();
    expect(screen.getByTestId('error-indicator')).toBeInTheDocument();
  });
  
  it('displays "No messages yet" when there are no messages', () => {
    // Update store to have empty messages array
    store = mockStore({
      ...store.getState(),
      messages: {
        messages: []
      }
    });
    
    render(
      <Provider store={store}>
        <MessageList />
      </Provider>
    );
    
    // Should display no messages text
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });
  
  it('displays newly received message with highlighting', () => {
    // Update store to show a newly received message
    store = mockStore({
      ...store.getState(),
      receiver: {
        status: 'received',
        lastReceivedMessage: { 
          id: '5', 
          text: 'New received message', 
          sender: 'Visual Sender', 
          timestamp: '2023-01-01T10:20:00Z'
        }
      }
    });
    
    render(
      <Provider store={store}>
        <MessageList />
      </Provider>
    );
    
    // Should display the new message
    expect(screen.getByText('New received message')).toBeInTheDocument();
    
    // The new message container should have a highlight class
    const highlightedElements = document.querySelectorAll('.highlight-new-message');
    expect(highlightedElements.length).toBeGreaterThan(0);
  });
  
  it('applies custom className when provided', () => {
    const { container } = render(
      <Provider store={store}>
        <MessageList className="custom-message-list" />
      </Provider>
    );
    
    // Should apply the className to the container
    const messageListElement = container.firstChild;
    expect(messageListElement).toHaveClass('custom-message-list');
  });
}); 