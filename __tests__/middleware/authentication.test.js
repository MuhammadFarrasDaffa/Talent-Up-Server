const request = require("supertest");
const createApp = require("../app");
const { createTestUser } = require("../helpers");
const User = require("../../models/User");
const { signToken } = require("../../helpers/jwt");

const app = createApp();

describe("Authentication Middleware", () => {
  let testUser, validToken;

  beforeEach(async () => {
    const userData = await createTestUser();
    testUser = userData.user;
    validToken = userData.token;
  });

  describe("Token Validation", () => {
    it("should pass with valid token", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it("should return 401 without Authorization header", async () => {
      const response = await request(app).get("/profile");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Please login first");
    });

    it("should return 401 with empty Authorization header", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Authorization", "");

      expect(response.status).toBe(401);
    });

    it("should return 401 with only Bearer prefix", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Authorization", "Bearer ");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 401 with invalid token format", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });

    it("should return 401 with expired token", async () => {
      // Create token with past expiration
      const jwt = require("jsonwebtoken");
      const expiredToken = jwt.sign(
        { id: testUser._id, email: testUser.email },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "-1h" },
      );

      const response = await request(app)
        .get("/profile")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it("should return 401 with malformed token", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Authorization", "Bearer abc.def.ghi");

      expect(response.status).toBe(401);
    });

    it("should return 401 if user not found in database", async () => {
      // Create token for non-existent user
      const nonExistentUserId = "507f1f77bcf86cd799439011";
      const token = signToken({
        id: nonExistentUserId,
        email: "deleted@example.com",
      });

      const response = await request(app)
        .get("/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("User not found");
    });

    it("should return 401 if user was deleted after token creation", async () => {
      // Delete user
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .get("/profile")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("User not found");
    });
  });

  describe("Request User Object", () => {
    it("should attach user info to request", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Authorization", `Bearer ${validToken}`);

      // The profile endpoint returns user info, confirming middleware worked
      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(testUser.email);
    });
  });
});
