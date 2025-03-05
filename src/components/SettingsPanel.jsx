import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSettings } from '../store/slices/settingsSlice';
import { TransmissionMode } from '../core/multiMode';

/**
 * Settings panel component for configuring application settings
 */
const SettingsPanel = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  
  // Local state for form fields
  const [formValues, setFormValues] = useState({
    transmissionMode: TransmissionMode.VISUAL,
    visualEnabled: true,
    audioEnabled: true,
    inputMode: 'text',
    errorCorrectionMode: 'hamming',
    errorCorrectionStrength: 1,
    adaptiveErrorCorrection: true,
    autoSelectMode: true,
    maxMessageSize: 1024,
    peerDiscoveryEnabled: true,
    peerRelayEnabled: true,
    diagnosticsEnabled: true,
    colorThreshold: 50,
    minChangeTime: 50,
    samplesRequired: 3
  });
  
  // Update local state when settings change
  useEffect(() => {
    setFormValues(prevValues => ({
      ...prevValues,
      ...settings
    }));
  }, [settings]);
  
  /**
   * Handles change events from form inputs
   * @param {Object} e - Event object
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Convert numeric strings to numbers
    const numberTypes = ['errorCorrectionStrength', 'maxMessageSize', 'colorThreshold', 'minChangeTime', 'samplesRequired'];
    
    let processedValue;
    if (type === 'checkbox') {
      processedValue = checked;
    } else if (numberTypes.includes(name)) {
      processedValue = parseInt(value, 10);
    } else {
      processedValue = value;
    }
    
    setFormValues({
      ...formValues,
      [name]: processedValue
    });
  };
  
  /**
   * Saves the settings on form submission
   * @param {Object} e - Event object
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateSettings(formValues));
  };
  
  /**
   * Resets settings to defaults
   */
  const handleReset = () => {
    const defaultSettings = {
      transmissionMode: TransmissionMode.VISUAL,
      visualEnabled: true,
      audioEnabled: true,
      inputMode: 'text',
      errorCorrectionMode: 'hamming',
      errorCorrectionStrength: 1,
      adaptiveErrorCorrection: true,
      autoSelectMode: true,
      maxMessageSize: 1024,
      peerDiscoveryEnabled: true,
      peerRelayEnabled: true,
      diagnosticsEnabled: true,
      colorThreshold: 50,
      minChangeTime: 50,
      samplesRequired: 3
    };
    
    setFormValues(defaultSettings);
    dispatch(updateSettings(defaultSettings));
  };
  
  return (
    <section className="panel">
      <h2>Settings</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="settings-group">
          <h3>Transmission Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="transmissionMode">Transmission Mode:</label>
            <select 
              id="transmissionMode" 
              name="transmissionMode" 
              value={formValues.transmissionMode} 
              onChange={handleInputChange}
              disabled={formValues.autoSelectMode}
            >
              <option value={TransmissionMode.VISUAL}>Visual</option>
              <option value={TransmissionMode.AUDIO}>Audio</option>
              <option value={TransmissionMode.BOTH}>Both</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label htmlFor="autoSelectMode">
              <input 
                type="checkbox" 
                id="autoSelectMode" 
                name="autoSelectMode" 
                checked={formValues.autoSelectMode} 
                onChange={handleInputChange}
              />
              Auto-select optimal mode
            </label>
          </div>
          
          <div className="setting-item">
            <label htmlFor="visualEnabled">
              <input 
                type="checkbox" 
                id="visualEnabled" 
                name="visualEnabled" 
                checked={formValues.visualEnabled} 
                onChange={handleInputChange}
              />
              Enable Visual Channel
            </label>
          </div>
          
          <div className="setting-item">
            <label htmlFor="audioEnabled">
              <input 
                type="checkbox" 
                id="audioEnabled" 
                name="audioEnabled" 
                checked={formValues.audioEnabled} 
                onChange={handleInputChange}
              />
              Enable Audio Channel
            </label>
          </div>
        </div>
        
        <div className="settings-group">
          <h3>Input Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="inputMode">Input Mode:</label>
            <select 
              id="inputMode" 
              name="inputMode" 
              value={formValues.inputMode} 
              onChange={handleInputChange}
            >
              <option value="text">Text</option>
              <option value="binary">Binary</option>
              <option value="hex">Hexadecimal</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label htmlFor="maxMessageSize">Maximum Message Size (bytes):</label>
            <input 
              type="number" 
              id="maxMessageSize" 
              name="maxMessageSize" 
              min="64" 
              max="10240" 
              value={formValues.maxMessageSize} 
              onChange={handleInputChange}
            />
          </div>
        </div>
        
        <div className="settings-group">
          <h3>Error Correction</h3>
          
          <div className="setting-item">
            <label htmlFor="errorCorrectionMode">Error Correction Algorithm:</label>
            <select 
              id="errorCorrectionMode" 
              name="errorCorrectionMode" 
              value={formValues.errorCorrectionMode} 
              onChange={handleInputChange}
            >
              <option value="none">None</option>
              <option value="hamming">Hamming Code</option>
              <option value="reed-solomon">Reed-Solomon</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label htmlFor="errorCorrectionStrength">Error Correction Strength:</label>
            <input 
              type="range" 
              id="errorCorrectionStrength" 
              name="errorCorrectionStrength" 
              min="1" 
              max="8" 
              value={formValues.errorCorrectionStrength} 
              onChange={handleInputChange}
              disabled={formValues.errorCorrectionMode === 'none' || formValues.adaptiveErrorCorrection}
            />
            <span>{formValues.errorCorrectionStrength}</span>
          </div>
          
          <div className="setting-item">
            <label htmlFor="adaptiveErrorCorrection">
              <input 
                type="checkbox" 
                id="adaptiveErrorCorrection" 
                name="adaptiveErrorCorrection" 
                checked={formValues.adaptiveErrorCorrection} 
                onChange={handleInputChange}
                disabled={formValues.errorCorrectionMode === 'none'}
              />
              Adaptive Error Correction
            </label>
          </div>
        </div>
        
        <div className="settings-group">
          <h3>Network Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="peerDiscoveryEnabled">
              <input 
                type="checkbox" 
                id="peerDiscoveryEnabled" 
                name="peerDiscoveryEnabled" 
                checked={formValues.peerDiscoveryEnabled} 
                onChange={handleInputChange}
              />
              Enable Peer Discovery
            </label>
          </div>
          
          <div className="setting-item">
            <label htmlFor="peerRelayEnabled">
              <input 
                type="checkbox" 
                id="peerRelayEnabled" 
                name="peerRelayEnabled" 
                checked={formValues.peerRelayEnabled} 
                onChange={handleInputChange}
              />
              Enable Message Relay (Multi-hop)
            </label>
          </div>
        </div>
        
        <div className="settings-group">
          <h3>Advanced Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="diagnosticsEnabled">
              <input 
                type="checkbox" 
                id="diagnosticsEnabled" 
                name="diagnosticsEnabled" 
                checked={formValues.diagnosticsEnabled} 
                onChange={handleInputChange}
              />
              Enable Performance Monitoring
            </label>
          </div>
          
          <div className="setting-subgroup">
            <h4>Visual Detection Settings</h4>
            
            <div className="setting-item">
              <label htmlFor="colorThreshold">Color Distance Threshold:</label>
              <input 
                type="number" 
                id="colorThreshold" 
                name="colorThreshold" 
                min="10" 
                max="150" 
                value={formValues.colorThreshold} 
                onChange={handleInputChange}
              />
            </div>
            
            <div className="setting-item">
              <label htmlFor="minChangeTime">Minimum Change Time (ms):</label>
              <input 
                type="number" 
                id="minChangeTime" 
                name="minChangeTime" 
                min="10" 
                max="500" 
                value={formValues.minChangeTime} 
                onChange={handleInputChange}
              />
            </div>
            
            <div className="setting-item">
              <label htmlFor="samplesRequired">Samples Required:</label>
              <input 
                type="number" 
                id="samplesRequired" 
                name="samplesRequired" 
                min="1" 
                max="10" 
                value={formValues.samplesRequired} 
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>
        
        <div className="button-group">
          <button type="submit" className="primary-btn">Save Settings</button>
          <button type="button" className="secondary-btn" onClick={handleReset}>Reset to Defaults</button>
        </div>
      </form>
    </section>
  );
};

export default SettingsPanel; 