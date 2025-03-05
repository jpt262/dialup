import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage } from '../store/slices/messageSlice';
import { convertEncoding, isValidBinary, isValidHex } from '../core/binaryHexConverter';

/**
 * Input panel component for message input with encoding support
 */
const InputPanel = ({ onSend }) => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  const [message, setMessage] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');
  
  // Validate input based on selected input mode
  useEffect(() => {
    validateInput(message);
  }, [message, settings.inputMode]);
  
  /**
   * Validates input based on current input mode
   * @param {string} input - Input to validate
   */
  const validateInput = (input) => {
    if (!input) {
      setIsValid(true);
      setValidationMessage('');
      return;
    }
    
    switch (settings.inputMode) {
      case 'binary':
        const validBinary = isValidBinary(input);
        setIsValid(validBinary);
        setValidationMessage(validBinary ? '' : 'Invalid binary format (must contain only 0s and 1s)');
        break;
        
      case 'hex':
        const validHex = isValidHex(input);
        setIsValid(validHex);
        setValidationMessage(validHex ? '' : 'Invalid hexadecimal format (must contain only 0-9, A-F)');
        break;
        
      default:
        setIsValid(true);
        setValidationMessage('');
    }
  };
  
  /**
   * Handles message submission
   * @param {Event} e - Event object
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim() || !isValid) {
      return;
    }
    
    try {
      // Convert if needed
      const normalizedMessage = settings.inputMode === 'text' ? 
        message : 
        convertEncoding(message, settings.inputMode, 'text');
      
      // Create message object
      const newMessage = {
        id: Date.now().toString(),
        text: normalizedMessage,
        originalText: message,
        encoding: settings.inputMode,
        timestamp: Date.now(),
        sender: 'Local'
      };
      
      // Add to messages store
      dispatch(addMessage(newMessage));
      
      // Call parent handler
      if (onSend) {
        onSend(newMessage);
      }
      
      // Clear input
      setMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      setValidationMessage(`Error: ${error.message}`);
    }
  };
  
  /**
   * Handles change of input value
   * @param {Event} e - Event object
   */
  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };
  
  /**
   * Converts the current message to a different encoding
   * @param {string} targetEncoding - Target encoding ('text', 'binary', 'hex')
   */
  const handleConvertEncoding = (targetEncoding) => {
    if (!message.trim() || !isValid || targetEncoding === settings.inputMode) {
      return;
    }
    
    try {
      const converted = convertEncoding(message, settings.inputMode, targetEncoding);
      setMessage(converted);
    } catch (error) {
      console.error('Error converting encoding:', error);
      setValidationMessage(`Conversion error: ${error.message}`);
    }
  };
  
  /**
   * Gets the placeholder text based on input mode
   * @returns {string} Placeholder text
   */
  const getPlaceholderText = () => {
    switch (settings.inputMode) {
      case 'binary':
        return 'Type binary data (0s and 1s)...';
      case 'hex':
        return 'Type hexadecimal data (0-9, A-F)...';
      default:
        return 'Type your message...';
    }
  };
  
  return (
    <div className="input-panel">
      <div className="input-mode-selector">
        <label>Input Mode:</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="inputMode"
              value="text"
              checked={settings.inputMode === 'text'}
              onChange={() => handleConvertEncoding('text')}
            />
            Text
          </label>
          <label>
            <input
              type="radio"
              name="inputMode"
              value="binary"
              checked={settings.inputMode === 'binary'}
              onChange={() => handleConvertEncoding('binary')}
            />
            Binary
          </label>
          <label>
            <input
              type="radio"
              name="inputMode"
              value="hex"
              checked={settings.inputMode === 'hex'}
              onChange={() => handleConvertEncoding('hex')}
            />
            Hex
          </label>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="message-form">
        <div className="input-container">
          <textarea
            value={message}
            onChange={handleInputChange}
            placeholder={getPlaceholderText()}
            rows="3"
            className={`message-input ${!isValid ? 'invalid' : ''}`}
          />
          
          {validationMessage && (
            <div className="validation-message">
              {validationMessage}
            </div>
          )}
        </div>
        
        <div className="button-container">
          <button 
            type="submit" 
            className="send-button"
            disabled={!message.trim() || !isValid}
          >
            Send
          </button>
          
          <button 
            type="button" 
            className="clear-button"
            onClick={() => setMessage('')}
          >
            Clear
          </button>
        </div>
      </form>
      
      <div className="message-info">
        {message && (
          <div className="character-count">
            {settings.inputMode === 'text' ? (
              <span>{message.length} characters</span>
            ) : settings.inputMode === 'binary' ? (
              <span>{message.length} bits ({Math.ceil(message.length / 8)} bytes)</span>
            ) : (
              <span>{message.length} hex chars ({Math.ceil(message.length / 2)} bytes)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InputPanel; 