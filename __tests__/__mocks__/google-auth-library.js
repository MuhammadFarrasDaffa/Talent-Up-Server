// Mock for google-auth-library
class OAuth2Client {
  constructor() {}

  async verifyIdToken({ idToken, audience }) {
    // Check for test token values
    if (idToken === "valid-google-token") {
      return {
        getPayload: () => ({
          sub: "google-123456",
          email: "googleuser@example.com",
          name: "Google User",
          picture: "https://example.com/photo.jpg",
        }),
      };
    }

    if (idToken === "existing-user-google-token") {
      return {
        getPayload: () => ({
          sub: "google-existing-123",
          email: "test@example.com", // Existing user email
          name: "Existing User",
          picture: "https://example.com/existing.jpg",
        }),
      };
    }

    // For invalid tokens, throw an error
    throw new Error("Invalid token");
  }
}

module.exports = {
  OAuth2Client,
};
