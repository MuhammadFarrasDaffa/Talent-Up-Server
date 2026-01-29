const request = require("supertest");
const createApp = require("../app");
const { createTestUser, createGoogleUser } = require("../helpers");
const User = require("../../models/User");
const { hashPassword } = require("../../helpers/bcrypt");

const app = createApp();

describe("Auth Controller", () => {
  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      const response = await request(app).post("/auth/register").send({
        name: "New User",
        email: "newuser@example.com",
        password: "password123",
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe("newuser@example.com");
      expect(response.body.user.name).toBe("New User");
    });

    it("should return 400 if name is missing", async () => {
      const response = await request(app).post("/auth/register").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Name, email, and password are required",
      );
    });

    it("should return 400 if email is missing", async () => {
      const response = await request(app).post("/auth/register").send({
        name: "Test User",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Name, email, and password are required",
      );
    });

    it("should return 400 if password is missing", async () => {
      const response = await request(app).post("/auth/register").send({
        name: "Test User",
        email: "test@example.com",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Name, email, and password are required",
      );
    });

    it("should return 400 if email already registered", async () => {
      await createTestUser({ email: "existing@example.com" });

      const response = await request(app).post("/auth/register").send({
        name: "Another User",
        email: "existing@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Email already registered");
    });

    it("should create user with default role and token", async () => {
      const response = await request(app).post("/auth/register").send({
        name: "Default User",
        email: "default@example.com",
        password: "password123",
      });

      expect(response.status).toBe(201);

      const user = await User.findOne({ email: "default@example.com" });
      expect(user.role).toBe("user");
      expect(user.token).toBe(10);
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await createTestUser({
        email: "login@example.com",
        password: hashPassword("correctpassword"),
      });
    });

    it("should login successfully with correct credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "login@example.com",
        password: "correctpassword",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Login successful");
      expect(response.body).toHaveProperty("access_token");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe("login@example.com");
    });

    it("should return 400 if email is missing", async () => {
      const response = await request(app).post("/auth/login").send({
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Email and password are required");
    });

    it("should return 400 if password is missing", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "test@example.com",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Email and password are required");
    });

    it("should return 401 if user not found", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "notfound@example.com",
        password: "password123",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should return 401 if password is incorrect", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "login@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should return 401 for Google OAuth user trying to login with password", async () => {
      await createGoogleUser({ email: "googleuser@example.com" });

      const response = await request(app).post("/auth/login").send({
        email: "googleuser@example.com",
        password: "anypassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Please login with Google");
    });
  });

  describe("POST /auth/google", () => {
    it("should return 400 if credential is missing", async () => {
      const response = await request(app).post("/auth/google").send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Google credential is required");
    });

    it("should return error for invalid Google token", async () => {
      const response = await request(app).post("/auth/google").send({
        credential: "invalid-token",
      });

      // Google auth verification will fail
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should create new user with valid Google token", async () => {
      const response = await request(app).post("/auth/google").send({
        credential: "valid-google-token",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Google authentication successful");
      expect(response.body).toHaveProperty("access_token");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe("googleuser@example.com");
      expect(response.body.user.name).toBe("Google User");

      // Verify user was created in database
      const user = await User.findOne({ email: "googleuser@example.com" });
      expect(user).not.toBeNull();
      expect(user.googleId).toBe("google-123456");
      expect(user.token).toBe(10);
    });

    it("should login existing user with valid Google token", async () => {
      // Create an existing user first
      await createTestUser({ email: "test@example.com", name: "Test User" });

      const response = await request(app).post("/auth/google").send({
        credential: "existing-user-google-token",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Google authentication successful");
      expect(response.body.user.email).toBe("test@example.com");

      // Verify googleId was updated
      const user = await User.findOne({ email: "test@example.com" });
      expect(user.googleId).toBe("google-existing-123");
    });

    it("should not update googleId if already set", async () => {
      // Create an existing user with googleId already set
      await User.create({
        name: "Existing Google User",
        email: "test@example.com",
        googleId: "original-google-id",
        role: "user",
        token: 10,
      });

      const response = await request(app).post("/auth/google").send({
        credential: "existing-user-google-token",
      });

      expect(response.status).toBe(200);

      // Verify googleId was NOT updated
      const user = await User.findOne({ email: "test@example.com" });
      expect(user.googleId).toBe("original-google-id");
    });
  });

  describe("Database error handling", () => {
    it("should handle database error in register", async () => {
      const createSpy = jest
        .spyOn(User, "create")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app).post("/auth/register").send({
        name: "Test User",
        email: "dbtest@example.com",
        password: "password123",
      });

      expect(response.status).toBe(500);
      createSpy.mockRestore();
    });

    it("should handle database error in login", async () => {
      const findOneSpy = jest
        .spyOn(User, "findOne")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(500);
      findOneSpy.mockRestore();
    });

    it("should handle database error in Google auth", async () => {
      const findOneSpy = jest
        .spyOn(User, "findOne")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).post("/auth/google").send({
        credential: "valid-google-token",
      });

      expect(response.status).toBe(500);
      findOneSpy.mockRestore();
    });
  });
});
