import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearAllMessages } from '../store/slices/messageSlice';
import '../styles/MessageHistory.css';

const MessageHistory = () => {
  const dispatch = useDispatch();
  const { messages } = useSelector(state => state.messages);
  const [filter, setFilter] = useState('all'); // 'all', 'visual', 'audio'
  
  const handleClearMessages = () => {
    if (window.confirm('Are you sure you want to clear all message history?')) {
      dispatch(clearAllMessages());
    }
  };
  
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };
  
  // Apply filters
  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true;
    if (filter === 'visual') return msg.sender.toLowerCase().includes('visual');
    if (filter === 'audio') return msg.sender.toLowerCase().includes('audio');
    return true;
  });
  
  // Group messages by date
  const groupedMessages = filteredMessages.reduce((groups, message) => {
    const date = new Date(message.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});
  
  return (
    <section className="message-history-panel">
      <div className="message-history-header">
        <h2>Message History</h2>
        
        <div className="message-controls">
          <div className="filter-control">
            <label htmlFor="messageFilter">Filter:</label>
            <select 
              id="messageFilter" 
              value={filter} 
              onChange={handleFilterChange}
            >
              <option value="all">All Messages</option>
              <option value="visual">Visual Only</option>
              <option value="audio">Audio Only</option>
            </select>
          </div>
          
          <button 
            className="clear-btn" 
            onClick={handleClearMessages}
            disabled={messages.length === 0}
          >
            Clear History
          </button>
        </div>
      </div>
      
      {Object.keys(groupedMessages).length > 0 ? (
        <div className="message-groups">
          {Object.entries(groupedMessages)
            .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
            .map(([date, messagesForDate]) => (
              <div key={date} className="message-date-group">
                <div className="date-header">{date}</div>
                
                <div className="messages-for-date">
                  {messagesForDate
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .map((message, index) => (
                      <div key={index} className="history-message-item">
                        <div className="message-meta">
                          <span className="message-sender">{message.sender}</span>
                          <span className="message-time">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="message-content">{message.text}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            ))
          }
        </div>
      ) : (
        <div className="no-messages-history">
          <p>No messages in history</p>
        </div>
      )}
    </section>
  );
};

export default MessageHistory; 