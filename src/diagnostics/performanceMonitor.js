/**
 * DialUp Performance Monitor
 * Tracks and analyzes system performance metrics
 */

/**
 * Creates a performance monitor for tracking system metrics
 * @param {Object} options - Configuration options
 * @param {number} [options.samplesWindow=100] - Number of samples to keep in the window
 * @param {number} [options.reportInterval=1000] - Interval between reports (ms)
 * @param {function} [options.onReport] - Callback function when metrics are calculated
 * @param {function} [options.onAlert] - Callback function on alert conditions
 * @returns {Object} - Performance monitor object
 */
function createPerformanceMonitor(options = {}) {
    const config = {
        samplesWindow: options.samplesWindow || 100,
        reportInterval: options.reportInterval || 1000,
        onReport: options.onReport || (() => { }),
        onAlert: options.onAlert || (() => { })
    };

    // Metrics collections
    const metrics = {
        visual: {
            snr: [],
            errorRate: [],
            frameRate: [],
            latency: [],
            throughput: []
        },
        audio: {
            snr: [],
            errorRate: [],
            sampleRate: [],
            latency: [],
            throughput: []
        },
        system: {
            memoryUsage: [],
            cpuUsage: [],
            battery: []
        },
        network: {
            messagesSent: [],
            messagesReceived: [],
            bytesTransmitted: [],
            bytesReceived: [],
            roundTripTime: []
        }
    };

    // Aggregated metrics
    let aggregatedMetrics = {};

    // Alert thresholds
    const alertThresholds = {
        visual: {
            snr: { min: 10 },
            errorRate: { max: 0.2 },
            frameRate: { min: 10 }
        },
        audio: {
            snr: { min: 8 },
            errorRate: { max: 0.3 }
        },
        system: {
            battery: { min: 0.2 },
            cpuUsage: { max: 0.9 }
        },
        network: {
            roundTripTime: { max: 1000 }
        }
    };

    // Timer handles
    let reportTimer = null;

    /**
     * Initializes the performance monitor
     */
    function init() {
        reportTimer = setInterval(calculateAndReportMetrics, config.reportInterval);
    }

    /**
     * Adds a metric sample to the appropriate collection
     * @param {string} category - Metric category ('visual', 'audio', 'system', 'network')
     * @param {string} metricName - Name of the metric
     * @param {number} value - Metric value
     */
    function addMetric(category, metricName, value) {
        if (!metrics[category] || !metrics[category][metricName]) {
            console.warn(`Unknown metric: ${category}.${metricName}`);
            return;
        }

        const samples = metrics[category][metricName];

        // Add the new value
        samples.push({
            value,
            timestamp: Date.now()
        });

        // Keep the array within window size
        if (samples.length > config.samplesWindow) {
            samples.shift();
        }

        // Check for alert conditions
        checkAlertCondition(category, metricName, value);
    }

    /**
     * Checks if a metric value triggers an alert condition
     * @param {string} category - Metric category
     * @param {string} metricName - Name of the metric
     * @param {number} value - Current metric value
     * @private
     */
    function checkAlertCondition(category, metricName, value) {
        const threshold = alertThresholds[category]?.[metricName];
        if (!threshold) {
            return;
        }

        let isAlert = false;
        let condition = null;

        if (threshold.min !== undefined && value < threshold.min) {
            isAlert = true;
            condition = `below minimum (${threshold.min})`;
        } else if (threshold.max !== undefined && value > threshold.max) {
            isAlert = true;
            condition = `above maximum (${threshold.max})`;
        }

        if (isAlert) {
            config.onAlert({
                category,
                metric: metricName,
                value,
                condition,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Calculates aggregated metrics and reports them
     * @private
     */
    function calculateAndReportMetrics() {
        aggregatedMetrics = {};

        // Calculate aggregated metrics for each category
        Object.keys(metrics).forEach(category => {
            aggregatedMetrics[category] = {};

            Object.keys(metrics[category]).forEach(metricName => {
                const samples = metrics[category][metricName];
                if (samples.length === 0) {
                    return;
                }

                // Calculate statistics
                const values = samples.map(s => s.value);
                const sum = values.reduce((a, b) => a + b, 0);
                const avg = sum / values.length;
                const min = Math.min(...values);
                const max = Math.max(...values);

                // Sort values for percentiles
                const sortedValues = [...values].sort((a, b) => a - b);
                const median = sortedValues[Math.floor(sortedValues.length / 2)];

                // Calculate standard deviation
                const squareDiffs = values.map(value => {
                    const diff = value - avg;
                    return diff * diff;
                });
                const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
                const stdDev = Math.sqrt(avgSquareDiff);

                // Store aggregated metrics
                aggregatedMetrics[category][metricName] = {
                    avg,
                    min,
                    max,
                    median,
                    stdDev,
                    count: values.length,
                    lastUpdate: samples[samples.length - 1].timestamp
                };
            });
        });

        // Invoke report callback
        config.onReport(aggregatedMetrics);
    }

    /**
     * Sets custom alert thresholds
     * @param {Object} thresholds - New alert thresholds object
     */
    function setAlertThresholds(thresholds) {
        // Deep merge with existing thresholds
        Object.keys(thresholds).forEach(category => {
            if (!alertThresholds[category]) {
                alertThresholds[category] = {};
            }

            Object.keys(thresholds[category]).forEach(metricName => {
                alertThresholds[category][metricName] = {
                    ...alertThresholds[category][metricName],
                    ...thresholds[category][metricName]
                };
            });
        });
    }

    /**
     * Gets the current aggregated metrics
     * @returns {Object} - Current aggregated metrics
     */
    function getMetrics() {
        return JSON.parse(JSON.stringify(aggregatedMetrics));
    }

    /**
     * Gets raw metrics samples for a specific category and metric
     * @param {string} category - Metric category
     * @param {string} metricName - Name of the metric
     * @returns {Array|null} - Array of metric samples or null if not found
     */
    function getRawMetrics(category, metricName) {
        if (!metrics[category] || !metrics[category][metricName]) {
            return null;
        }

        return [...metrics[category][metricName]];
    }

    /**
     * Clears all metrics data
     */
    function clearMetrics() {
        Object.keys(metrics).forEach(category => {
            Object.keys(metrics[category]).forEach(metricName => {
                metrics[category][metricName] = [];
            });
        });

        aggregatedMetrics = {};
    }

    /**
     * Stops the performance monitor and cleans up resources
     */
    function stop() {
        if (reportTimer) {
            clearInterval(reportTimer);
            reportTimer = null;
        }
    }

    // Initialize on creation
    init();

    // Return the public API
    return {
        addMetric,
        getMetrics,
        getRawMetrics,
        setAlertThresholds,
        clearMetrics,
        stop
    };
}

/**
 * Creates a systems stats collector that periodically measures system performance
 * @param {Object} options - Configuration options
 * @param {number} [options.interval=2000] - Collection interval (ms)
 * @param {Object} [options.performanceMonitor] - Performance monitor to report to
 * @returns {Object} - System stats collector object
 */
function createSystemStatsCollector(options = {}) {
    const config = {
        interval: options.interval || 2000,
        performanceMonitor: options.performanceMonitor
    };

    let collectionTimer = null;
    const memoryUsage = {
        lastValue: null,
        lastTimestamp: null
    };

    /**
     * Starts collecting system stats
     */
    function start() {
        if (collectionTimer) {
            return;
        }

        collectionTimer = setInterval(collectSystemStats, config.interval);
        collectSystemStats(); // Initial collection
    }

    /**
     * Collects current system statistics
     * @private
     */
    function collectSystemStats() {
        // In a browser environment, collect what we can
        collectMemoryUsage();
        estimateCpuUsage();
        collectBatteryInfo();
    }

    /**
     * Collects memory usage information
     * @private
     */
    function collectMemoryUsage() {
        if (!window.performance || !window.performance.memory) {
            return; // Not supported
        }

        try {
            const mem = window.performance.memory;
            const usedHeap = mem.usedJSHeapSize / mem.totalJSHeapSize;

            if (config.performanceMonitor) {
                config.performanceMonitor.addMetric('system', 'memoryUsage', usedHeap);
            }
        } catch (e) {
            console.warn('Error collecting memory usage:', e);
        }
    }

    /**
     * Estimates CPU usage based on task timing
     * @private
     */
    function estimateCpuUsage() {
        const now = performance.now();
        const start = now;

        // Perform a CPU-intensive task
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
            result += Math.random() * Math.random();
        }

        const end = performance.now();
        const elapsed = end - start;

        // Estimate CPU usage based on how long it took
        // Higher elapsed time = more CPU availability (lower usage)
        // This is a very rough approximation
        const maxExpected = 500; // ms for this task on an idle system
        const minExpected = 50;  // ms for this task on a busy system

        const range = maxExpected - minExpected;
        const normalizedElapsed = Math.max(minExpected, Math.min(maxExpected, elapsed));
        const cpuUsage = 1 - ((normalizedElapsed - minExpected) / range);

        if (config.performanceMonitor) {
            config.performanceMonitor.addMetric('system', 'cpuUsage', cpuUsage);
        }
    }

    /**
     * Collects battery information if available
     * @private
     */
    function collectBatteryInfo() {
        if (!navigator.getBattery) {
            return; // Not supported
        }

        navigator.getBattery().then(battery => {
            if (config.performanceMonitor) {
                config.performanceMonitor.addMetric('system', 'battery', battery.level);
            }
        }).catch(e => {
            console.warn('Error collecting battery info:', e);
        });
    }

    /**
     * Stops collecting system stats
     */
    function stop() {
        if (collectionTimer) {
            clearInterval(collectionTimer);
            collectionTimer = null;
        }
    }

    // Return the public API
    return {
        start,
        stop
    };
}

export {
    createPerformanceMonitor,
    createSystemStatsCollector
}; 