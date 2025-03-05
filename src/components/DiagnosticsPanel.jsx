import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { createPerformanceMonitor, createSystemStatsCollector } from '../diagnostics/performanceMonitor';

/**
 * DiagnosticsPanel component for displaying system performance metrics
 */
const DiagnosticsPanel = () => {
  const settings = useSelector(state => state.settings);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('visual');
  const performanceMonitorRef = useRef(null);
  const statsCollectorRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize performance monitoring
  useEffect(() => {
    if (settings.diagnosticsEnabled) {
      // Create performance monitor
      const monitor = createPerformanceMonitor({
        samplesWindow: 100,
        reportInterval: 1000,
        onReport: (metrics) => {
          setMetrics(metrics);
          drawMetricsGraph(metrics);
        },
        onAlert: (alert) => {
          setAlerts(prev => [alert, ...prev].slice(0, 10));
        }
      });
      
      // Create system stats collector
      const collector = createSystemStatsCollector({
        interval: 2000,
        performanceMonitor: monitor
      });
      
      // Store refs
      performanceMonitorRef.current = monitor;
      statsCollectorRef.current = collector;
      
      // Start collecting stats
      collector.start();
      
      return () => {
        monitor.stop();
        collector.stop();
      };
    }
  }, [settings.diagnosticsEnabled]);

  /**
   * Draws metrics on the canvas
   * @param {Object} metrics - Performance metrics
   */
  const drawMetricsGraph = (metrics) => {
    if (!canvasRef.current || !metrics) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // Draw metrics for the selected tab
    switch (activeTab) {
      case 'visual':
        drawMetricsByCategory(ctx, metrics.visual, width, height);
        break;
      case 'audio':
        drawMetricsByCategory(ctx, metrics.audio, width, height);
        break;
      case 'system':
        drawMetricsByCategory(ctx, metrics.system, width, height);
        break;
      case 'network':
        drawMetricsByCategory(ctx, metrics.network, width, height);
        break;
      default:
        break;
    }
  };

  /**
   * Draws metrics for a specific category
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} categoryMetrics - Metrics for the category
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  const drawMetricsByCategory = (ctx, categoryMetrics, width, height) => {
    if (!categoryMetrics) return;
    
    // Define metrics and their properties for drawing
    const metricsMappings = {
      visual: [
        { key: 'snr', color: '#4caf50', label: 'SNR (dB)', max: 30 },
        { key: 'errorRate', color: '#f44336', label: 'Error Rate', max: 1 },
        { key: 'frameRate', color: '#2196f3', label: 'Frame Rate', max: 30 }
      ],
      audio: [
        { key: 'snr', color: '#4caf50', label: 'SNR (dB)', max: 30 },
        { key: 'errorRate', color: '#f44336', label: 'Error Rate', max: 1 },
        { key: 'sampleRate', color: '#2196f3', label: 'Sample Rate', max: 44100 }
      ],
      system: [
        { key: 'cpuUsage', color: '#f44336', label: 'CPU Usage', max: 1 },
        { key: 'memoryUsage', color: '#2196f3', label: 'Memory Usage', max: 1 },
        { key: 'battery', color: '#4caf50', label: 'Battery', max: 1 }
      ],
      network: [
        { key: 'roundTripTime', color: '#f44336', label: 'RTT (ms)', max: 1000 },
        { key: 'messagesSent', color: '#2196f3', label: 'Messages Sent', max: 100 },
        { key: 'messagesReceived', color: '#4caf50', label: 'Messages Received', max: 100 }
      ]
    };
    
    const metrics = metricsMappings[activeTab];
    if (!metrics) return;
    
    // Draw grid
    drawGrid(ctx, width, height);
    
    // Draw metrics
    metrics.forEach((metric, index) => {
      if (categoryMetrics[metric.key] && categoryMetrics[metric.key].avg !== undefined) {
        const value = categoryMetrics[metric.key].avg;
        const normalizedValue = value / metric.max;
        const barHeight = normalizedValue * (height - 60);
        
        // Draw bar
        ctx.fillStyle = metric.color;
        ctx.fillRect(
          40 + (index * (width - 80) / metrics.length),
          height - 30 - barHeight,
          ((width - 80) / metrics.length) - 20,
          barHeight
        );
        
        // Draw label
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${metric.label}: ${Math.round(value * 100) / 100}`,
          40 + (index * (width - 80) / metrics.length) + ((width - 80) / metrics.length - 20) / 2,
          height - 10
        );
      }
    });
  };

  /**
   * Draws a grid on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  const drawGrid = (ctx, width, height) => {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // Draw horizontal lines
    for (let i = 0; i < 5; i++) {
      const y = 30 + (i * (height - 60) / 4);
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(width - 30, y);
      ctx.stroke();
      
      // Draw labels
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${100 - i * 25}%`,
        25,
        y + 3
      );
    }
  };

  /**
   * Clears all metrics and alerts
   */
  const handleClearMetrics = () => {
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.clearMetrics();
    }
    setAlerts([]);
  };

  /**
   * Exports metrics as JSON
   */
  const handleExportMetrics = () => {
    if (!metrics) return;
    
    const dataStr = JSON.stringify(metrics, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `dialup-metrics-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!settings.diagnosticsEnabled) {
    return (
      <section className="panel">
        <h2>Diagnostics</h2>
        <div className="info-message">
          Performance monitoring is disabled. Enable it in Settings to view diagnostics.
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Diagnostics</h2>
      
      <div className="tabs">
        <button 
          className={activeTab === 'visual' ? 'active' : ''} 
          onClick={() => setActiveTab('visual')}
        >
          Visual
        </button>
        <button 
          className={activeTab === 'audio' ? 'active' : ''} 
          onClick={() => setActiveTab('audio')}
        >
          Audio
        </button>
        <button 
          className={activeTab === 'system' ? 'active' : ''} 
          onClick={() => setActiveTab('system')}
        >
          System
        </button>
        <button 
          className={activeTab === 'network' ? 'active' : ''} 
          onClick={() => setActiveTab('network')}
        >
          Network
        </button>
      </div>
      
      <div className="metrics-graph">
        <canvas ref={canvasRef} width="600" height="300"></canvas>
      </div>
      
      <div className="metrics-detail">
        <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Metrics</h3>
        
        {metrics && metrics[activeTab] && (
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Average</th>
                <th>Min</th>
                <th>Max</th>
                <th>Std Dev</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics[activeTab]).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{value.avg?.toFixed(2) || 'N/A'}</td>
                  <td>{value.min?.toFixed(2) || 'N/A'}</td>
                  <td>{value.max?.toFixed(2) || 'N/A'}</td>
                  <td>{value.stdDev?.toFixed(2) || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {(!metrics || !metrics[activeTab] || Object.keys(metrics[activeTab]).length === 0) && (
          <div className="info-message">
            No metrics available for {activeTab} yet.
          </div>
        )}
      </div>
      
      <div className="alerts-section">
        <h3>Recent Alerts</h3>
        
        {alerts.length > 0 ? (
          <ul className="alerts-list">
            {alerts.map((alert, index) => (
              <li key={index} className="alert-item">
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
                <span className="alert-category">
                  {alert.category}.{alert.metric}
                </span>
                <span className="alert-message">
                  Value {alert.value.toFixed(2)} is {alert.condition}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="info-message">
            No alerts to display.
          </div>
        )}
      </div>
      
      <div className="button-group">
        <button className="secondary-btn" onClick={handleClearMetrics}>
          Clear Metrics
        </button>
        <button className="primary-btn" onClick={handleExportMetrics}>
          Export Metrics
        </button>
      </div>
    </section>
  );
};

export default DiagnosticsPanel; 