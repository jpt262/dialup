// Add Jest extended matchers
import '@testing-library/jest-dom';

// Mock Web Audio API
class MockAudioContext {
    constructor() {
        this.destination = {};
        this.sampleRate = 44100;
        this.state = 'running';
    }

    createOscillator() {
        return {
            type: 'sine',
            frequency: { value: 0, setValueAtTime: jest.fn() },
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            disconnect: jest.fn()
        };
    }

    createGain() {
        return {
            gain: { value: 1, setValueAtTime: jest.fn() },
            connect: jest.fn(),
            disconnect: jest.fn()
        };
    }

    createAnalyser() {
        return {
            fftSize: 2048,
            frequencyBinCount: 1024,
            minDecibels: -100,
            maxDecibels: -30,
            smoothingTimeConstant: 0.8,
            getByteFrequencyData: jest.fn(array => {
                // Default implementation - can be overridden in tests
                for (let i = 0; i < array.length; i++) {
                    array[i] = 0;
                }
                // Simulate a peak at a specific frequency bin
                if (array.length > 100) {
                    array[100] = 255; // Strong signal at bin 100
                }
            }),
            connect: jest.fn(),
            disconnect: jest.fn()
        };
    }

    createBuffer(numChannels, length, sampleRate) {
        const buffer = {
            numberOfChannels: numChannels,
            length: length,
            sampleRate: sampleRate,
            getChannelData: jest.fn().mockReturnValue(new Float32Array(length))
        };
        return buffer;
    }

    createBufferSource() {
        return {
            buffer: null,
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            disconnect: jest.fn(),
            onended: null
        };
    }

    close() {
        this.state = 'closed';
        return Promise.resolve();
    }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock MediaDevices
navigator.mediaDevices = {
    getUserMedia: jest.fn().mockImplementation(() => {
        return Promise.resolve({
            getTracks: () => [
                {
                    stop: jest.fn()
                }
            ]
        });
    })
};

// Mock WebSocket
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = WebSocket.CONNECTING;

        setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            if (this.onopen) this.onopen();
        }, 0);
    }

    send(data) {
        // Implement as needed for tests
    }

    close() {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) this.onclose();
    }
}

MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

global.WebSocket = MockWebSocket;

// Mock SpeechRecognition
class MockSpeechRecognition {
    constructor() {
        this.continuous = false;
        this.interimResults = false;
        this.lang = 'en-US';
        this.isListening = false;
    }

    start() {
        this.isListening = true;
        if (this.onstart) this.onstart();
    }

    stop() {
        this.isListening = false;
        if (this.onend) this.onend();
    }

    abort() {
        this.isListening = false;
        if (this.onend) this.onend();
    }
}

global.SpeechRecognition = MockSpeechRecognition;
global.webkitSpeechRecognition = MockSpeechRecognition;

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn(); 