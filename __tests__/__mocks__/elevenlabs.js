// Mock for @elevenlabs/elevenlabs-js
// Create a proper async generator
async function* createAudioStream() {
  yield Buffer.from("mock audio ");
  yield Buffer.from("data chunk");
}

class ElevenLabsClient {
  constructor() {
    this.textToSpeech = {
      convert: jest.fn().mockImplementation(async () => {
        return createAudioStream();
      }),
    };
  }
}

module.exports = {
  ElevenLabsClient,
};
