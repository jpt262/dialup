# DialUp

DialUp is a multi-modal data transmission system that encodes messages into visual signals (sequences of colors displayed on a screen) or audio signals (frequency-shift keying modulation), which can then be captured and decoded by another device's camera or microphone. It reimagines the concept of dial-up modems for the modern era, using both visual and audio signals for device-to-device communication.

## Overview

This application allows devices to communicate without traditional network connectivity by using visual light signals or audio tones. The transmitting device can display a sequence of colored frames on its screen (in the navigation bar) or emit a series of audio tones, while the receiving device uses its camera or microphone to capture and decode these signals back into the original message.

## Features

- **Dual-Mode Transmission**: Choose between visual or audio transmission methods
- **Visual Encoding/Decoding**: Convert text messages to color sequences and back
- **Audio Encoding/Decoding**: Convert text to audio tones using FSK modulation
- **Navbar Transmission**: Use the top navigation bar as the visual transmission medium
- **Webcam Reception**: Capture and analyze color sequences with device camera
- **Microphone Reception**: Capture and analyze audio tones with device microphone
- **Channel Busy Detection**: Detect if the audio channel is already in use
- **Speech Recognition**: Trigger dictation mode with spacebar using Whisper.js or browser API
- **WebSocket Integration**: Real-time messaging via WebSocket server
- **Redux State Management**: Centralized application state with Redux
- **Adjustable Speed**: Control transmission speed for different environments
- **Error Detection**: Built-in checksums to validate message integrity
- **Responsive Design**: Works on various device sizes
- **Comprehensive Testing**: Extensive unit test coverage for all major components

## Getting Started

### Prerequisites

- Modern web browser with camera and microphone access (Chrome, Firefox, Safari, Edge)
- Device with webcam for receiving visual messages
- Device with microphone for receiving audio messages
- Node.js 16+ and npm for development
- (Optional) WebSocket server for real-time messaging

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/jpt262/dialup.git
   cd dialup
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser at `http://localhost:3000`

### WebSocket Server (Optional)

For real-time messaging functionality, you can set up a simple WebSocket server:

1. Create a server.js file:
   ```javascript
   import { createServer } from 'http';
   import { Server } from 'socket.io';

   const httpServer = createServer();
   const io = new Server(httpServer, {
     cors: {
       origin: "http://localhost:3000",
       methods: ["GET", "POST"]
     }
   });

   io.on('connection', (socket) => {
     console.log('Client connected:', socket.id);
     
     socket.on('message', (data) => {
       console.log('Message received:', data);
       io.emit('message', data); // Broadcast to all clients
     });
     
     socket.on('disconnect', () => {
       console.log('Client disconnected:', socket.id);
     });
   });

   httpServer.listen(8080);
   console.log('WebSocket server running on ws://localhost:8080');
   ```

2. Run the server:
   ```
   node server.js
   ```

### Usage

#### Sending a Message

##### Visual Transmission
1. Select "Visual" transmission mode
2. Enter text in the message input field (or use speech recognition by pressing spacebar)
3. Select transmission speed (slower is more reliable in challenging conditions)
4. Click "Start Transmission"
5. The navbar will begin cycling through colors to transmit the message

##### Audio Transmission
1. Select "Audio" transmission mode
2. Enter text in the message input field (or use speech recognition)
3. Click "Start Transmission"
4. The device will emit audio tones to transmit the message
5. If the audio channel is busy, the system will indicate and prevent transmission

#### Using Speech Recognition

1. Press the spacebar anywhere (except in input fields) to activate dictation
2. Speak your message - it will be transcribed into the input field
3. The system will use Whisper.js if available, or fall back to the browser's built-in speech recognition API

#### Receiving a Message

##### Visual Reception
1. Switch to "Receive" mode and select "Visual" reception
2. Click "Start Listening" to activate webcam
3. Point your camera at the navbar of the transmitting device
4. When transmission begins, the app will automatically detect and decode the message

##### Audio Reception
1. Switch to "Receive" mode and select "Audio" reception
2. Click "Start Listening" to activate microphone
3. When audio transmission begins, the app will automatically detect and decode the message
4. The interface will display the detected frequency, signal strength, and symbols as they are received

5. Received messages appear in the messages list

## Technical Details

DialUp uses the following technologies and techniques:

- **React & Redux**: Modern reactive UI with centralized state management
- **Vite**: Fast build tooling and development server
- **Text to Binary Conversion**: Messages are converted to binary (UTF-8 encoding)
- **Visual Encoding**: Binary chunks are mapped to distinct colors
- **Audio Encoding**: Binary chunks are mapped to audio frequencies using FSK modulation
- **Synchronization Signals**: Special patterns mark start/end of transmission
- **Error Detection**: Checksum verification ensures data integrity
- **Canvas API**: Used for processing video frames
- **Web Audio API**: Used for generating and analyzing audio signals
- **MediaDevices API**: Provides camera and microphone access in the browser
- **WebRTC**: Enables peer-to-peer communication capabilities
- **Speech Recognition**: Dual support for Whisper.js and Web Speech API
- **WebSockets**: Real-time communication via Socket.io
- **Jest**: Comprehensive unit testing framework

The visual encoding scheme uses 8 distinct colors to represent 3 bits of data per color, achieving a theoretical maximum of 15 bits per second at the fastest transmission setting.

The audio encoding scheme uses frequency-shift keying (FSK) to encode data, with different frequencies representing different symbols, allowing for robust transmission in various acoustic environments.

## Project Structure

```
dialup/
├── public/                    # Static assets
├── src/                       # Source code
│   ├── audio/                 # Audio transmission functionality
│   │   ├── audioEncoder.js    # Text-to-audio encoding
│   │   ├── audioDecoder.js    # Audio-to-text decoding
│   │   └── __tests__/         # Audio module tests
│   ├── components/            # React components
│   │   ├── SenderPanel.jsx    # Message transmission UI
│   │   ├── ReceiverPanel.jsx  # Message reception UI
│   │   ├── MessageList.jsx    # Message display
│   │   ├── MessageHistory.jsx # Historical messages
│   │   └── __tests__/         # Component tests
│   ├── core/                  # Core functionality
│   │   ├── encoder.js         # Text-to-color encoding
│   │   └── decoder.js         # Color-to-text decoding
│   ├── store/                 # Redux store
│   │   ├── slices/            # Redux slices
│   │   │   ├── messagesSlice.js     # Message management
│   │   │   ├── transmissionSlice.js # Transmission state
│   │   │   ├── receiverSlice.js     # Receiver state
│   │   │   ├── websocketSlice.js    # WebSocket state
│   │   │   ├── speechSlice.js       # Speech recognition state
│   │   │   └── __tests__/           # Redux slice tests
│   │   └── store.js           # Store configuration
│   ├── services/              # Service modules
│   │   ├── audioService.js    # Audio transmission service
│   │   ├── speech.js          # Speech recognition
│   │   ├── websocket.js       # WebSocket connection
│   │   └── __tests__/         # Service tests
│   ├── capture/               # Camera and capture functionality
│   ├── animations/            # Animation system
│   └── styles/                # CSS styles
├── __mocks__/                 # Jest mock files
├── jest.config.js             # Jest configuration
├── jest.setup.js              # Jest setup file
├── index.html                 # Main HTML file
└── vite.config.js             # Vite configuration
```

## Development

### Building for Production

```
npm run build
```

This creates a `dist` directory with optimized and minified files ready for deployment.

### Running Tests

```
npm test
```

The project includes comprehensive unit tests for all major components and services, including:

- **Component Tests**: Verify UI rendering and user interactions
- **Redux Slice Tests**: Ensure correct state management
- **Service Tests**: Validate service functionality
- **Audio Module Tests**: Test encoding and decoding of audio signals

Test coverage aims to be approximately 80% across the codebase, focusing on critical functionality.

## Limitations

- Visual: Requires sufficient lighting for reliable color detection
- Audio: Background noise can interfere with signal reception
- Performance depends on camera/microphone quality and processing power
- May not work well across extreme distances or angles
- Speech recognition may vary in accuracy based on background noise
- Not suitable for high-volume data transmission

## Future Enhancements

- Support for file transfers (images, documents)
- Mobile applications for iOS and Android
- Enhanced error correction for improved reliability
- Multiple transmission channels (full screen, split sections)
- End-to-end encryption for secure transmission
- Improved speech recognition with custom Whisper models
- Adaptive frequency selection for audio transmission
- Hybrid transmission modes (simultaneous audio and visual)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the concepts of dial-up modems and visual light communication
- Thanks to Xenova for Whisper.js web implementation
- Thanks to the open source projects that made this possible
