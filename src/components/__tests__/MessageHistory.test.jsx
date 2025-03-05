import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import MessageHistory from '../MessageHistory';

const mockStore = configureStore([]);

describe('MessageHistory', () => {
  let store;
  
  beforeEach(() => {
    // Mock store with some test messages
    store = mockStore({
      messages: {
        messages: [
          { id: '1', text: 'Hello world', sender: 'Visual Sender', timestamp: '2023-01-01T10:00:00Z' },
          { id: '2', text: 'Testing audio', sender: 'Audio Sender', timestamp: '2023-01-01T10:05:00Z' },
          { id: '3', text: 'My message', sender: 'You (Visual)', timestamp: '2023-01-01T10:10:00Z' },
          { id: '4', text: 'Another test', sender: 'Visual Sender', timestamp: '2023-01-01T10:15:00Z' }
        ]
      }
    });
  });
  
  it('renders the component with all messages when no filter is provided', () => {
    render(
      <Provider store={store}>
        <MessageHistory />
      </Provider>
    );
    
    // Should display all messages
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Testing audio')).toBeInTheDocument();
    expect(screen.getByText('My message')).toBeInTheDocument();
    expect(screen.getByText('Another test')).toBeInTheDocument();
    
    // Should display all senders
    expect(screen.getByText('Visual Sender')).toBeInTheDocument();
    expect(screen.getByText('Audio Sender')).toBeInTheDocument();
    expect(screen.getByText('You (Visual)')).toBeInTheDocument();
    
    // Should display timestamps in the correct format
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('10:05 AM')).toBeInTheDocument();
    expect(screen.getByText('10:10 AM')).toBeInTheDocument();
    expect(screen.getByText('10:15 AM')).toBeInTheDocument();
  });
  
  it('filters out user messages when hideUserMessages is true', () => {
    render(
      <Provider store={store}>
        <MessageHistory hideUserMessages={true} />
      </Provider>
    );
    
    // Should display messages from other senders
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Testing audio')).toBeInTheDocument();
    expect(screen.getByText('Another test')).toBeInTheDocument();
    
    // Should NOT display user's messages
    expect(screen.queryByText('My message')).not.toBeInTheDocument();
    
    // Should still display other senders
    expect(screen.getByText('Visual Sender')).toBeInTheDocument();
    expect(screen.getByText('Audio Sender')).toBeInTheDocument();
    
    // Should NOT display "You (Visual)" as sender
    const senderElements = screen.queryAllByText('You (Visual)');
    expect(senderElements.length).toBe(0);
  });
  
  it('displays "No messages yet" when there are no messages', () => {
    // Mock store with empty messages array
    store = mockStore({
      messages: {
        messages: []
      }
    });
    
    render(
      <Provider store={store}>
        <MessageHistory />
      </Provider>
    );
    
    // Should display no messages text
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });
  
  it('displays only the specified number of messages when maxMessages is provided', () => {
    render(
      <Provider store={store}>
        <MessageHistory maxMessages={2} />
      </Provider>
    );
    
    // Should only display the 2 most recent messages
    expect(screen.queryByText('Hello world')).not.toBeInTheDocument();
    expect(screen.queryByText('Testing audio')).not.toBeInTheDocument();
    expect(screen.getByText('My message')).toBeInTheDocument();
    expect(screen.getByText('Another test')).toBeInTheDocument();
  });
  
  it('applies className to the message history container', () => {
    const { container } = render(
      <Provider store={store}>
        <MessageHistory className="custom-message-history" />
      </Provider>
    );
    
    // Should apply the className to the container
    const messageHistoryElement = container.firstChild;
    expect(messageHistoryElement).toHaveClass('custom-message-history');
  });
  
  it('renders different background colors for different senders', () => {
    const { container } = render(
      <Provider store={store}>
        <MessageHistory />
      </Provider>
    );
    
    // Get all message containers
    const messageElements = container.querySelectorAll('.message-container');
    
    // Check that the messages have different background colors based on sender
    const visualSenderBackground = messageElements[0].querySelector('.message-bubble').className;
    const audioSenderBackground = messageElements[1].querySelector('.message-bubble').className;
    const userBackground = messageElements[2].querySelector('.message-bubble').className;
    
    // Different senders should have different background colors
    expect(visualSenderBackground).not.toBe(audioSenderBackground);
    expect(visualSenderBackground).not.toBe(userBackground);
    expect(audioSenderBackground).not.toBe(userBackground);
  });
  
  it('handles empty message text gracefully', () => {
    // Mock store with an empty message
    store = mockStore({
      messages: {
        messages: [
          { id: '1', text: '', sender: 'Visual Sender', timestamp: '2023-01-01T10:00:00Z' }
        ]
      }
    });
    
    render(
      <Provider store={store}>
        <MessageHistory />
      </Provider>
    );
    
    // Should still render the message container with sender and timestamp
    expect(screen.getByText('Visual Sender')).toBeInTheDocument();
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
  });
}); 