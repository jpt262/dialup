import * as audioEncoder from '../audioEncoder';

// Mock the AudioContext and related objects
jest.mock('web-audio-api', () => {
    return {};
}, { virtual: true });

describe('audioEncoder', () => {
    describe('textToBinary', () => {
        it('should convert text to binary', () => {
            const text = 'Hello';
            const expectedBinary = '0100100001100101011011000110110001101111';
            const result = audioEncoder.textToBinary(text);
            expect(result).toBe(expectedBinary);
        });

        it('should handle empty string', () => {
            const text = '';
            const result = audioEncoder.textToBinary(text);
            expect(result).toBe('');
        });

        it('should handle special characters', () => {
            const text = '!@#';
            // ASCII: ! (33) = 00100001, @ (64) = 01000000, # (35) = 00100011
            const expectedBinary = '001000010100000000100011';
            const result = audioEncoder.textToBinary(text);
            expect(result).toBe(expectedBinary);
        });
    });

    describe('binaryToSymbolIndexes', () => {
        it('should convert binary to symbol indexes', () => {
            const binary = '0010';
            const result = audioEncoder.binaryToSymbolIndexes(binary);
            expect(result).toEqual([0, 0, 1, 0]);
        });

        it('should handle empty string', () => {
            const binary = '';
            const result = audioEncoder.binaryToSymbolIndexes(binary);
            expect(result).toEqual([]);
        });
    });

    describe('calculateChecksum', () => {
        it('should calculate correct checksum for odd number of 1s', () => {
            const symbolIndexes = [0, 1, 0, 1, 1];
            const result = audioEncoder.calculateChecksum(symbolIndexes);
            // 3 ones -> odd -> checksum = 1
            expect(result).toBe(1);
        });

        it('should calculate correct checksum for even number of 1s', () => {
            const symbolIndexes = [0, 1, 0, 1];
            const result = audioEncoder.calculateChecksum(symbolIndexes);
            // 2 ones -> even -> checksum = 0
            expect(result).toBe(0);
        });

        it('should handle empty array', () => {
            const symbolIndexes = [];
            const result = audioEncoder.calculateChecksum(symbolIndexes);
            // 0 ones -> even -> checksum = 0
            expect(result).toBe(0);
        });
    });

    describe('createMetadataHeader', () => {
        it('should create correct metadata header', () => {
            const text = 'Hello';
            const result = audioEncoder.createMetadataHeader(text);
            // Length of 'Hello' is 5 -> 5 in binary is 101
            // Padding to 8 bits: 00000101
            expect(result).toEqual([0, 0, 0, 0, 0, 1, 0, 1]);
        });

        it('should handle empty string', () => {
            const text = '';
            const result = audioEncoder.createMetadataHeader(text);
            // Length 0 -> 0 in binary is 0
            // Padding to 8 bits: 00000000
            expect(result).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
        });

        it('should handle longer text', () => {
            const text = 'A'.repeat(200);
            const result = audioEncoder.createMetadataHeader(text);
            // Length 200 -> binary is 11001000
            // Already 8 bits, no padding needed
            expect(result).toEqual([1, 1, 0, 0, 1, 0, 0, 0]);
        });
    });

    describe('generateTone', () => {
        it('should generate a tone correctly', () => {
            const audioContext = new AudioContext();
            const frequency = 1000;
            const duration = 0.1;

            // Spy on createOscillator to verify it's called with correct parameters
            const oscillatorSpy = jest.spyOn(audioContext, 'createOscillator');
            const gainSpy = jest.spyOn(audioContext, 'createGain');

            audioEncoder.generateTone(audioContext, frequency, duration);

            expect(oscillatorSpy).toHaveBeenCalled();
            expect(gainSpy).toHaveBeenCalled();

            // Check if the oscillator frequency was set correctly
            const oscillator = oscillatorSpy.mock.results[0].value;
            expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(frequency, expect.any(Number));

            // Check if start and stop were called
            expect(oscillator.start).toHaveBeenCalled();
            expect(oscillator.stop).toHaveBeenCalledWith(expect.any(Number));
        });
    });

    describe('isChannelBusy', () => {
        it('should detect if the channel is busy', async () => {
            // Mock the implementation to simulate a busy channel
            const mockAnalyser = {
                getByteFrequencyData: jest.fn(data => {
                    // Fill with values that indicate a busy channel
                    for (let i = 0; i < data.length; i++) {
                        data[i] = 200; // High amplitude
                    }
                })
            };

            const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
            AudioContext.prototype.createAnalyser = jest.fn().mockReturnValue(mockAnalyser);

            const result = await audioEncoder.isChannelBusy();
            expect(result).toBe(true);

            // Restore original implementation
            AudioContext.prototype.createAnalyser = originalCreateAnalyser;
        });

        it('should detect if the channel is not busy', async () => {
            // Mock the implementation to simulate a free channel
            const mockAnalyser = {
                getByteFrequencyData: jest.fn(data => {
                    // Fill with values that indicate a free channel
                    for (let i = 0; i < data.length; i++) {
                        data[i] = 10; // Low amplitude
                    }
                })
            };

            const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
            AudioContext.prototype.createAnalyser = jest.fn().mockReturnValue(mockAnalyser);

            const result = await audioEncoder.isChannelBusy();
            expect(result).toBe(false);

            // Restore original implementation
            AudioContext.prototype.createAnalyser = originalCreateAnalyser;
        });
    });

    describe('encodeText', () => {
        it('should correctly encode text', async () => {
            const text = 'Test';

            // Mock generateSymbolSequence to return a buffer
            const mockBuffer = { duration: 1.0 };
            jest.spyOn(audioEncoder, 'generateSymbolSequence').mockResolvedValue(mockBuffer);

            const result = await audioEncoder.encodeText(text);
            expect(result).toEqual({ buffer: mockBuffer, duration: 1.0 });

            // Verify generateSymbolSequence was called with the correct parameters
            expect(audioEncoder.generateSymbolSequence).toHaveBeenCalled();
        });
    });

    describe('transmitAudio', () => {
        it('should transmit audio successfully when channel is not busy', async () => {
            const text = 'Test message';

            // Mock isChannelBusy to return false (channel not busy)
            jest.spyOn(audioEncoder, 'isChannelBusy').mockResolvedValue(false);

            // Mock encodeText to return a buffer
            const mockBuffer = { duration: 1.0 };
            jest.spyOn(audioEncoder, 'encodeText').mockResolvedValue({
                buffer: mockBuffer,
                duration: 1.0
            });

            // Mock playAudioBuffer
            jest.spyOn(audioEncoder, 'playAudioBuffer').mockImplementation(() => {
                return new Promise(resolve => setTimeout(resolve, 100));
            });

            const result = await audioEncoder.transmitAudio(text);
            expect(result).toBe(true);

            // Verify methods were called
            expect(audioEncoder.isChannelBusy).toHaveBeenCalled();
            expect(audioEncoder.encodeText).toHaveBeenCalledWith(text);
            expect(audioEncoder.playAudioBuffer).toHaveBeenCalledWith(mockBuffer);
        });

        it('should not transmit when channel is busy', async () => {
            const text = 'Test message';

            // Mock isChannelBusy to return true (channel busy)
            jest.spyOn(audioEncoder, 'isChannelBusy').mockResolvedValue(true);

            // These should not be called
            jest.spyOn(audioEncoder, 'encodeText');
            jest.spyOn(audioEncoder, 'playAudioBuffer');

            await expect(audioEncoder.transmitAudio(text)).rejects.toThrow();

            // Verify only isChannelBusy was called
            expect(audioEncoder.isChannelBusy).toHaveBeenCalled();
            expect(audioEncoder.encodeText).not.toHaveBeenCalled();
            expect(audioEncoder.playAudioBuffer).not.toHaveBeenCalled();
        });
    });
}); 