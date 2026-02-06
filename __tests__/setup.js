// Set environment variables BEFORE requiring anything
process.env.JWT_SECRET = "test-secret-key";
process.env.NODE_ENV = "test";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test";
process.env.MIDTRANS_CLIENT_KEY = "SB-Mid-client-test";
process.env.CLIENT_URL = "http://localhost:3001";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.ELEVENLABS_API_KEY = "test-elevenlabs-key";

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
}, 60000);

// Cleanup after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Disconnect after all tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);
