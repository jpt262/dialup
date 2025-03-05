/**
 * DialUp - Visual Data Transmission System
 * Main Application Entry Point
 */

import './styles/main.css';
import { createSenderUI } from './ui/sender.js';
import { createReceiverUI } from './ui/receiver.js';

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get references to UI elements
    const elements = {
        // Mode selector elements
        senderModeBtn: document.getElementById('senderMode'),
        receiverModeBtn: document.getElementById('receiverMode'),

        // Panel elements
        senderPanel: document.getElementById('senderPanel'),
        receiverPanel: document.getElementById('receiverPanel'),

        // Sender UI elements
        transmissionBar: document.getElementById('transmissionBar'),
        messageInput: document.getElementById('messageInput'),
        transmissionSpeed: document.getElementById('transmissionSpeed'),
        startTransmitBtn: document.getElementById('startTransmitBtn'),
        transmitStatus: document.getElementById('transmitStatus'),

        // Receiver UI elements
        cameraFeed: document.getElementById('cameraFeed'),
        startCameraBtn: document.getElementById('startCameraBtn'),
        receiveStatus: document.getElementById('receiveStatus'),
        receivedMessages: document.getElementById('receivedMessages')
    };

    // Validate essential elements
    if (!validateElements(elements)) {
        console.error('Required UI elements not found');
        return;
    }

    // Create UI controllers
    const senderUI = createSenderUI({
        transmissionBar: elements.transmissionBar,
        messageInput: elements.messageInput,
        speedSelect: elements.transmissionSpeed,
        transmitButton: elements.startTransmitBtn,
        statusElement: elements.transmitStatus
    });

    const receiverUI = createReceiverUI({
        videoElement: elements.cameraFeed,
        startButton: elements.startCameraBtn,
        statusElement: elements.receiveStatus,
        messagesList: elements.receivedMessages
    });

    // Initialize controllers
    senderUI.init();
    receiverUI.init();

    // Set up mode switching
    setupModeSwitching(elements, receiverUI);

    console.log('DialUp application initialized');
});

/**
 * Validates that all required UI elements exist
 * @param {Object} elements - Object containing UI element references
 * @returns {boolean} - Whether all required elements are present
 */
function validateElements(elements) {
    const requiredElements = [
        'senderModeBtn', 'receiverModeBtn',
        'senderPanel', 'receiverPanel',
        'transmissionBar', 'messageInput', 'transmissionSpeed', 'startTransmitBtn', 'transmitStatus',
        'cameraFeed', 'startCameraBtn', 'receiveStatus', 'receivedMessages'
    ];

    for (const elementName of requiredElements) {
        if (!elements[elementName]) {
            console.error(`Required element not found: ${elementName}`);
            return false;
        }
    }

    return true;
}

/**
 * Sets up mode switching between sender and receiver
 * @param {Object} elements - UI elements
 * @param {Object} receiverUI - Receiver UI controller
 */
function setupModeSwitching(elements, receiverUI) {
    // Switch to sender mode
    elements.senderModeBtn.addEventListener('click', () => {
        // Stop camera if active
        receiverUI.stopCamera();

        // Update active button states
        elements.senderModeBtn.classList.add('active');
        elements.receiverModeBtn.classList.remove('active');

        // Show/hide panels
        elements.senderPanel.classList.remove('hidden');
        elements.receiverPanel.classList.add('hidden');
    });

    // Switch to receiver mode
    elements.receiverModeBtn.addEventListener('click', () => {
        // Update active button states
        elements.senderModeBtn.classList.remove('active');
        elements.receiverModeBtn.classList.add('active');

        // Show/hide panels
        elements.senderPanel.classList.add('hidden');
        elements.receiverPanel.classList.remove('hidden');
    });
}

// For debugging in development
if (process.env.NODE_ENV !== 'production') {
    window.DialUpDebug = {
        version: '0.1.0'
    };
}
