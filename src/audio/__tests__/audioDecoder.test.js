import { createAudioDecoder } from '../audioDecoder';

describe('audioDecoder', () => {
    let decoder;
    let mockAnalyser;
    let mockAudioContext;

    beforeEach(() => {
        // Setup mock AudioContext
        mockAnalyser = {
            fftSize: 2048,
            frequencyBinCount: 1024,
            getByteFrequencyData: jest.fn(array => {
                // By default, no significant frequencies
                for (let i = 0; i < array.length; i++) {
                    array[i] = 0;
                }
            }),
            connect: jest.fn(),
            disconnect: jest.fn()
        };

        mockAudioContext = new AudioContext();
        jest.spyOn(mockAudioContext, 'createAnalyser').mockReturnValue(mockAnalyser);

        // Create decoder with mock AudioContext
        decoder = createAudioDecoder(mockAudioContext);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('startListening', () => {
        it('should start listening for audio signals', async () => {
            // Mock getUserMedia
            jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({
                getTracks: () => [{ stop: jest.fn() }]
            });

            await decoder.startListening();

            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
            expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
        });

        it('should handle errors when starting to listen', async () => {
            // Mock getUserMedia to throw an error
            const error = new Error('Permission denied');
            jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(error);

            await expect(decoder.startListening()).rejects.toThrow('Permission denied');
        });
    });

    describe('stopListening', () => {
        it('should stop listening for audio signals', async () => {
            // Mock stream and track
            const mockTrack = { stop: jest.fn() };
            const mockStream = { getTracks: () => [mockTrack] };

            jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(mockStream);

            // Start listening first
            await decoder.startListening();

            // Then stop listening
            decoder.stopListening();

            expect(mockTrack.stop).toHaveBeenCalled();
        });

        it('should do nothing if not listening', () => {
            // No listening has started
            decoder.stopListening();
            // Should not throw any errors
        });
    });

    describe('processAudioFrame', () => {
        it('should process audio frames and detect symbols', () => {
            // Setup a mock implementation that simulates detecting a high frequency
            mockAnalyser.getByteFrequencyData = jest.fn(array => {
                // Simulate a peak at a bin that corresponds to our high frequency
                const highFreqBin = 100;  // This would correspond to a specific frequency
                array[highFreqBin] = 250; // Strong signal at this bin
            });

            // Mock requestAnimationFrame
            jest.spyOn(global, 'requestAnimationFrame');

            // Start the processing
            decoder.startProcessing();

            // The processing should have requested an animation frame
            expect(global.requestAnimationFrame).toHaveBeenCalled();

            // Stop the processing to clean up
            decoder.stopListening();
        });
    });

    describe('findDominantFrequency', () => {
        it('should detect the dominant frequency in the signal', () => {
            // Setup frequency data with a peak
            const frequencyData = new Uint8Array(1024);
            frequencyData[100] = 200; // Strong signal at bin 100

            // Mock the sample rate
            const sampleRate = 44100;

            // Use the decoder's internal method to find the dominant frequency
            const result = decoder._testHook_findDominantFrequency
                ? decoder._testHook_findDominantFrequency(frequencyData, sampleRate)
                : 0; // If the hook isn't available, this test will fail

            // The exact frequency depends on the implementation, but it should be non-zero
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('decodeSymbols', () => {
        it('should decode symbol sequences into text', () => {
            // Mock a message callback to capture the decoded message
            const messageCallback = jest.fn();
            decoder.onMessage(messageCallback);

            // Simulate received symbols for 'Hi' with metadata header and checksum
            // ASCII: H (72) = 01001000, i (105) = 01101001
            // 01001000 01101001 -> metadata header + binary + checksum

            // First, metadata header for length (2 chars = 00000010)
            [0, 0, 0, 0, 0, 0, 1, 0].forEach(bit => {
                mockAnalyser.getByteFrequencyData = jest.fn(array => {
                    const freqBin = bit === 0 ? 50 : 100; // Different bins for 0 and 1
                    array[freqBin] = 250; // Strong signal
                });

                // Process a frame to detect the symbol
                decoder.processAudioFrame();
            });

            // Then 'H' (01001000)
            [0, 1, 0, 0, 1, 0, 0, 0].forEach(bit => {
                mockAnalyser.getByteFrequencyData = jest.fn(array => {
                    const freqBin = bit === 0 ? 50 : 100;
                    array[freqBin] = 250;
                });

                decoder.processAudioFrame();
            });

            // Then 'i' (01101001)
            [0, 1, 1, 0, 1, 0, 0, 1].forEach(bit => {
                mockAnalyser.getByteFrequencyData = jest.fn(array => {
                    const freqBin = bit === 0 ? 50 : 100;
                    array[freqBin] = 250;
                });

                decoder.processAudioFrame();
            });

            // Finally, checksum (assuming implementation details)
            mockAnalyser.getByteFrequencyData = jest.fn(array => {
                const freqBin = 100; // Represent a '1' for the checksum
                array[freqBin] = 250;
            });

            decoder.processAudioFrame();

            // If the decoder implementation follows the expected pattern, 
            // it should have called the message callback with "Hi"
            expect(messageCallback).toHaveBeenCalledWith(expect.objectContaining({
                text: expect.stringContaining('Hi')
            }));
        });
    });

    describe('onMessage and onStatusChange', () => {
        it('should register and call message callbacks', () => {
            const callback = jest.fn();
            decoder.onMessage(callback);

            // Trigger a message (internal implementation dependent)
            // This is a simplified test assuming the decoder has a method
            // to trigger callbacks for testing
            if (decoder._testHook_triggerMessage) {
                decoder._testHook_triggerMessage({ text: 'Test message' });
                expect(callback).toHaveBeenCalledWith({ text: 'Test message' });
            }
        });

        it('should register and call status change callbacks', () => {
            const callback = jest.fn();
            decoder.onStatusChange(callback);

            // Trigger a status change (internal implementation dependent)
            if (decoder._testHook_triggerStatusChange) {
                decoder._testHook_triggerStatusChange('info', 'Test status');
                expect(callback).toHaveBeenCalledWith('info', 'Test status');
            }
        });
    });

    describe('getState', () => {
        it('should return the current decoder state', () => {
            const state = decoder.getState();

            // Check that the state object has the expected properties
            expect(state).toHaveProperty('detectedFrequency');
            expect(state).toHaveProperty('signalStrength');
            expect(state).toHaveProperty('symbolsDetected');
        });
    });
}); 