const request = require("supertest");
const createApp = require("../app");
const { createTestUser, generateObjectId } = require("../helpers");
const User = require("../../models/User");

const app = createApp();

// Get reference to mocked CV AI service
const aiService = require("../../services/CVAiService");

describe("CV AI Controller", () => {
  let testUser, authToken;

  beforeEach(async () => {
    const userData = await createTestUser({
      profile: {
        fullName: "Test Developer",
        title: "Software Engineer",
        summary: "A developer with experience in web development",
        skills: [
          { name: "JavaScript", level: "Expert" },
          { name: "Node.js", level: "Advanced" },
        ],
        experience: [
          {
            company: "Tech Company",
            position: "Senior Developer",
            startDate: new Date("2020-01-01"),
            description: ["Developed web applications", "Led team of 5"],
          },
        ],
        education: [
          {
            institution: "University",
            degree: "Bachelor",
            fieldOfStudy: "Computer Science",
          },
        ],
      },
    });
    testUser = userData.user;
    authToken = userData.token;

    // Reset all mocks and set up default returns
    jest.clearAllMocks();
    aiService.enhanceSummary.mockResolvedValue(
      "Enhanced professional summary with AI",
    );
    aiService.optimizeDescription.mockResolvedValue([
      "Optimized description 1",
      "Optimized description 2",
    ]);
    aiService.suggestSkills.mockResolvedValue(["TypeScript", "Docker", "AWS"]);
    aiService.generateHeadline.mockResolvedValue(
      "Senior Full-Stack Developer | Expert in React & Node.js",
    );
  });

  describe("POST /cv/enhance-summary", () => {
    it("should enhance summary successfully", async () => {
      const response = await request(app)
        .post("/cv/enhance-summary")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          fullName: "Test Developer",
          summary: "A developer",
          skills: ["JavaScript", "React"],
          experience: [{ company: "Tech Corp", position: "Developer" }],
          education: [{ institution: "University", degree: "Bachelor" }],
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("AI summary generated successfully");
      expect(response.body).toHaveProperty("aiSummary");
      expect(typeof response.body.aiSummary).toBe("string");
    });

    it("should use user profile data if not provided in request", async () => {
      const response = await request(app)
        .post("/cv/enhance-summary")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("AI summary generated successfully");
    });

    it("should save AI summary to user profile", async () => {
      await request(app)
        .post("/cv/enhance-summary")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          fullName: "Test Developer",
        });

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.profile.aiSummary).toBeTruthy();
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post("/cv/enhance-summary")
        .send({ fullName: "Test" });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /cv/optimize-description/:experienceId", () => {
    let experienceId;

    beforeEach(async () => {
      testUser.profile.experience.push({
        company: "Old Company",
        position: "Developer",
        startDate: new Date("2020-01-01"),
        description: ["Did some work", "Made things"],
      });
      await testUser.save();
      experienceId = testUser.profile.experience[0]._id;
    });

    it("should optimize description successfully", async () => {
      const response = await request(app)
        .post(`/cv/optimize-description/${experienceId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          targetRole: "Senior Software Engineer",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Description optimized successfully");
      expect(response.body).toHaveProperty("optimizedDescription");
      expect(response.body).toHaveProperty("experience");
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post(`/cv/optimize-description/${experienceId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ targetRole: "Developer" });

      // Auth middleware returns 401 when user not found
      expect(response.status).toBe(401);
    });

    it("should return 404 if experience not found", async () => {
      const fakeId = generateObjectId();

      const response = await request(app)
        .post(`/cv/optimize-description/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ targetRole: "Developer" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Experience not found");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post(`/cv/optimize-description/${experienceId}`)
        .send({ targetRole: "Developer" });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /cv/suggest-skills", () => {
    it("should suggest skills successfully", async () => {
      const response = await request(app)
        .get("/cv/suggest-skills")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ targetRole: "Senior Full Stack Developer" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Skills suggested successfully");
      expect(response.body.suggestedSkills).toBeInstanceOf(Array);
    });

    it("should use default target role if not provided", async () => {
      const response = await request(app)
        .get("/cv/suggest-skills")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.suggestedSkills).toBeInstanceOf(Array);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .get("/cv/suggest-skills")
        .query({ targetRole: "Developer" });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /cv/generate-headline", () => {
    it("should generate headline successfully", async () => {
      const response = await request(app)
        .post("/cv/generate-headline")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Headline generated successfully");
      expect(response.body).toHaveProperty("headline");
      expect(typeof response.body.headline).toBe("string");
    });

    it("should update profile if requested", async () => {
      const response = await request(app)
        .post("/cv/generate-headline")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ updateProfile: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("profile");

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.profile.title).toBe(response.body.headline);
    });

    it("should not include profile if updateProfile is false", async () => {
      const response = await request(app)
        .post("/cv/generate-headline")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ updateProfile: false });

      expect(response.status).toBe(200);
      expect(response.body.profile).toBeUndefined();
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post("/cv/generate-headline")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      // Auth middleware returns 401 when user not found
      expect(response.status).toBe(401);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post("/cv/generate-headline")
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe("Edge cases", () => {
    it("should handle user without skills in suggest-skills", async () => {
      // Create user with no skills
      const { user: emptyUser, token: emptyToken } = await createTestUser({
        email: "emptyskills@test.com",
        profile: {
          fullName: "Empty User",
          skills: [],
        },
      });

      const response = await request(app)
        .get("/cv/suggest-skills")
        .set("Authorization", `Bearer ${emptyToken}`)
        .query({ targetRole: "Developer" });

      expect(response.status).toBe(200);
      expect(response.body.suggestedSkills).toBeInstanceOf(Array);
    });

    it("should handle AI service error in enhance-summary", async () => {
      aiService.enhanceSummary.mockRejectedValueOnce(
        new Error("AI service error"),
      );

      const response = await request(app)
        .post("/cv/enhance-summary")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ fullName: "Test" });

      expect(response.status).toBe(500);
    });

    it("should handle AI service error in optimize-description", async () => {
      const experienceId = testUser.profile.experience[0]._id;
      aiService.optimizeDescription.mockRejectedValueOnce(
        new Error("AI service error"),
      );

      const response = await request(app)
        .post(`/cv/optimize-description/${experienceId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ targetRole: "Developer" });

      expect(response.status).toBe(500);
    });

    it("should handle AI service error in suggest-skills", async () => {
      aiService.suggestSkills.mockRejectedValueOnce(
        new Error("AI service error"),
      );

      const response = await request(app)
        .get("/cv/suggest-skills")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ targetRole: "Developer" });

      expect(response.status).toBe(500);
    });

    it("should handle AI service error in generate-headline", async () => {
      aiService.generateHeadline.mockRejectedValueOnce(
        new Error("AI service error"),
      );

      const response = await request(app)
        .post("/cv/generate-headline")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(500);
    });

    it("should use user name if fullName not in profile for enhance-summary", async () => {
      // Create user without profile fullName
      const { user: noNameUser, token: noNameToken } = await createTestUser({
        email: "noname@test.com",
        name: "User Name From Account",
        profile: {
          title: "Developer",
          experience: [
            { company: "Test", position: "Dev", startDate: new Date() },
          ],
        },
      });

      const response = await request(app)
        .post("/cv/enhance-summary")
        .set("Authorization", `Bearer ${noNameToken}`)
        .send({});

      expect(response.status).toBe(200);
    });
  });

  describe("Database error handling", () => {
    it("should handle database error in enhance-summary", async () => {
      const findByIdSpy = jest
        .spyOn(User, "findById")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .post("/cv/enhance-summary")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(500);
      findByIdSpy.mockRestore();
    });

    it("should handle database error in suggest-skills", async () => {
      const findByIdSpy = jest
        .spyOn(User, "findById")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/cv/suggest-skills")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ targetRole: "Developer" });

      expect(response.status).toBe(500);
      findByIdSpy.mockRestore();
    });

    it("should handle database error in generate-headline", async () => {
      const findByIdSpy = jest
        .spyOn(User, "findById")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/cv/generate-headline")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(500);
      findByIdSpy.mockRestore();
    });
  });
});
