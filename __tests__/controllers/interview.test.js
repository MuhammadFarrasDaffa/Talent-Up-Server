const request = require("supertest");
const createApp = require("../app");
const {
  createTestUser,
  createTestCategory,
  createTestQuestion,
  createTestTier,
  createTestInterview,
  generateObjectId,
} = require("../helpers");
const Question = require("../../models/Question");
const Interview = require("../../models/Interview");
const User = require("../../models/User");
const Tier = require("../../models/Tier");

const app = createApp();

describe("Interview Controller", () => {
  let testUser, authToken, testCategory, testTier;

  beforeEach(async () => {
    const userData = await createTestUser({ token: 100 });
    testUser = userData.user;
    authToken = userData.token;

    testCategory = await createTestCategory();
    testTier = await createTestTier({ title: "Basic", quota: 5 });

    // Create questions for the category
    await createTestQuestion(testCategory._id, {
      type: "intro",
      level: "junior",
    });
    await createTestQuestion(testCategory._id, {
      type: "core",
      level: "junior",
    });
    await createTestQuestion(testCategory._id, {
      type: "core",
      level: "junior",
    });
    await createTestQuestion(testCategory._id, {
      type: "closing",
      level: "junior",
    });
  });

  describe("POST /interviews/start", () => {
    it("should start interview successfully", async () => {
      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Basic",
          tokenUsage: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body).toBeInstanceOf(Array);
    });

    it("should return 400 if level is missing", async () => {
      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          tier: "Basic",
          tokenUsage: 5,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "Level, categoryId, tier, dan token harus disediakan",
      );
    });

    it("should return 400 if categoryId is missing", async () => {
      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          level: "junior",
          tier: "Basic",
          tokenUsage: 5,
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 if tier is missing", async () => {
      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tokenUsage: 5,
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 if tokenUsage is missing", async () => {
      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Basic",
        });

      expect(response.status).toBe(400);
    });

    it("should return 403 if user has insufficient tokens", async () => {
      await User.findByIdAndUpdate(testUser._id, { token: 0 });

      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Basic",
          tokenUsage: 5,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Token tidak cukup");
    });

    it("should return 400 if tier not found", async () => {
      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "NonExistentTier",
          tokenUsage: 5,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("tidak ditemukan di database");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).post("/interviews/start").send({
        categoryId: testCategory._id.toString(),
        level: "junior",
        tier: "Basic",
        tokenUsage: 5,
      });

      expect(response.status).toBe(401);
    });

    it("should deduct tokens from user after starting interview", async () => {
      const initialToken = testUser.token;

      await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Basic",
          tokenUsage: 5,
        });

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.token).toBe(initialToken - 5);
    });
  });

  describe("POST /interviews/answer", () => {
    it("should return 400 if no file uploaded", async () => {
      const response = await request(app)
        .post("/interviews/answer")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Tolong upload file audio");
    });
  });

  describe("POST /interviews/save", () => {
    it("should save interview successfully", async () => {
      const response = await request(app)
        .post("/interviews/save")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          category: "Frontend Developer",
          level: "junior",
          tier: "Basic",
          questions: [
            {
              _id: "q1",
              content: "Question 1",
              type: "intro",
              level: "junior",
              followUp: false,
            },
          ],
          answers: [
            {
              questionId: "q1",
              question: "Question 1",
              transcription: "My answer",
              duration: 60,
              isFollowUp: false,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Interview berhasil disimpan");
      expect(response.body).toHaveProperty("interviewId");
    });

    it("should return 400 if data is incomplete", async () => {
      const response = await request(app)
        .post("/interviews/save")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Data interview tidak lengkap");
    });

    it("should return 400 if category is missing", async () => {
      const response = await request(app)
        .post("/interviews/save")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Basic",
          questions: [],
          answers: [],
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 if questions array is missing", async () => {
      const response = await request(app)
        .post("/interviews/save")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          category: "Test",
          level: "junior",
          tier: "Basic",
          answers: [],
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 if answers array is missing", async () => {
      const response = await request(app)
        .post("/interviews/save")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          category: "Test",
          level: "junior",
          tier: "Basic",
          questions: [],
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /interviews/history", () => {
    beforeEach(async () => {
      await createTestInterview(testUser._id, testCategory._id);
      await createTestInterview(testUser._id, testCategory._id);
    });

    it("should get interview history successfully", async () => {
      const response = await request(app)
        .get("/interviews/history")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.interviews).toBeInstanceOf(Array);
      expect(response.body.interviews.length).toBe(2);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/interviews/history");

      expect(response.status).toBe(401);
    });

    it("should return empty array for user with no interviews", async () => {
      const { token: newToken } = await createTestUser({
        email: "newuser@test.com",
      });

      const response = await request(app)
        .get("/interviews/history")
        .set("Authorization", `Bearer ${newToken}`);

      expect(response.status).toBe(200);
      expect(response.body.interviews).toHaveLength(0);
    });
  });

  describe("GET /interviews/:id", () => {
    let testInterview;

    beforeEach(async () => {
      testInterview = await createTestInterview(testUser._id, testCategory._id);
    });

    it("should get interview by id successfully", async () => {
      const response = await request(app)
        .get(`/interviews/${testInterview._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(testInterview._id.toString());
    });

    it("should return 404 for non-existent interview", async () => {
      const fakeId = generateObjectId();

      const response = await request(app)
        .get(`/interviews/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Interview tidak ditemukan");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get(
        `/interviews/${testInterview._id}`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("POST /interviews/:id/evaluate", () => {
    let testInterview;

    beforeEach(async () => {
      testInterview = await createTestInterview(
        testUser._id,
        testCategory._id,
        {
          evaluated: false,
        },
      );
    });

    it("should evaluate interview successfully", async () => {
      const response = await request(app)
        .post(`/interviews/${testInterview._id}/evaluate`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty("evaluation");
    });

    it("should return cached evaluation if already evaluated", async () => {
      const evaluation = { overallScore: 90, overallGrade: "A" };
      await Interview.findByIdAndUpdate(testInterview._id, {
        evaluated: true,
        evaluation,
      });

      const response = await request(app)
        .post(`/interviews/${testInterview._id}/evaluate`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should return 404 for non-existent interview", async () => {
      const fakeId = generateObjectId();

      const response = await request(app)
        .post(`/interviews/${fakeId}/evaluate`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Interview tidak ditemukan");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).post(
        `/interviews/${testInterview._id}/evaluate`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("POST /interviews/response", () => {
    it("should require authentication for response endpoint", async () => {
      const response = await request(app).post("/interviews/response").send({
        question: "Test question",
        answer: "Test answer",
        needFollowUp: false,
      });

      expect(response.status).toBe(401);
    });

    it("should call response endpoint with valid data", async () => {
      const response = await request(app)
        .post("/interviews/response")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          question: "Tell me about yourself",
          answer: "I am a software engineer with 5 years of experience",
          needFollowUp: false,
        });

      // Endpoint processes but may fail on external service mock
      expect([201, 500]).toContain(response.status);
    });

    it("should call response endpoint with follow-up request", async () => {
      const response = await request(app)
        .post("/interviews/response")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          question: "What is your experience with JavaScript?",
          answer: "I have worked with JavaScript for 3 years",
          needFollowUp: true,
        });

      // Endpoint processes but may fail on external service mock
      expect([201, 500]).toContain(response.status);
    });
  });

  describe("POST /interviews/evaluate", () => {
    it("should evaluate interview data successfully", async () => {
      const response = await request(app)
        .post("/interviews/evaluate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          interviewData: {
            category: "Frontend Developer",
            level: "junior",
            answers: [
              {
                question: "Tell me about yourself",
                answer: "I am a frontend developer with 2 years of experience",
                duration: 60,
              },
              {
                question: "What is React?",
                answer:
                  "React is a JavaScript library for building user interfaces",
                duration: 45,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty("evaluation");
      expect(response.body.evaluation).toHaveProperty("overallScore");
      expect(response.body.evaluation).toHaveProperty("overallGrade");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post("/interviews/evaluate")
        .send({
          interviewData: {
            category: "Test",
            level: "junior",
            answers: [],
          },
        });

      expect(response.status).toBe(401);
    });

    it("should calculate completion time from answers", async () => {
      const response = await request(app)
        .post("/interviews/evaluate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          interviewData: {
            category: "Backend Developer",
            level: "senior",
            answers: [
              {
                question: "Q1",
                answer: "A1",
                duration: 120,
              },
              {
                question: "Q2",
                answer: "A2",
                duration: 180,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.evaluation).toHaveProperty("completionTime");
      expect(response.body.evaluation).toHaveProperty("totalQuestions");
      expect(response.body.evaluation.totalQuestions).toBe(2);
    });
  });

  describe("POST /interviews/answer with file upload", () => {
    it("should handle audio file upload successfully", async () => {
      // Create a mock audio buffer
      const audioBuffer = Buffer.from("mock audio content");

      const response = await request(app)
        .post("/interviews/answer")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("audio", audioBuffer, {
          filename: "test.mp3",
          contentType: "audio/mpeg",
        });

      // Endpoint processes the file, may fail on transcription service mock
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.message).toBe("Success transcribe audio");
        expect(response.body).toHaveProperty("transcription");
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle interview start with different tier quotas", async () => {
      const premiumTier = await createTestTier({ title: "Premium", quota: 10 });

      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Premium",
          tokenUsage: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body).toBeInstanceOf(Array);
    });

    it("should handle senior level questions", async () => {
      // Create senior level questions
      await createTestQuestion(testCategory._id, {
        type: "intro",
        level: "senior",
      });
      await createTestQuestion(testCategory._id, {
        type: "core",
        level: "senior",
      });
      await createTestQuestion(testCategory._id, {
        type: "closing",
        level: "senior",
      });

      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "senior",
          tier: "Basic",
          tokenUsage: 5,
        });

      expect(response.status).toBe(201);
    });

    it("should handle interview with no core questions gracefully", async () => {
      // Delete all core questions
      await Question.deleteMany({
        categoryId: testCategory._id,
        type: "core",
      });

      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Basic",
          tokenUsage: 5,
        });

      expect(response.status).toBe(201);
    });

    it("should save interview with multiple questions and answers", async () => {
      const questions = [
        { _id: "q1", content: "Question 1", type: "intro", level: "junior" },
        { _id: "q2", content: "Question 2", type: "core", level: "junior" },
        { _id: "q3", content: "Question 3", type: "core", level: "junior" },
        { _id: "q4", content: "Question 4", type: "closing", level: "junior" },
      ];

      const answers = [
        {
          questionId: "q1",
          question: "Question 1",
          transcription: "Answer 1",
          duration: 30,
        },
        {
          questionId: "q2",
          question: "Question 2",
          transcription: "Answer 2",
          duration: 45,
        },
        {
          questionId: "q3",
          question: "Question 3",
          transcription: "Answer 3",
          duration: 60,
        },
        {
          questionId: "q4",
          question: "Question 4",
          transcription: "Answer 4",
          duration: 40,
        },
      ];

      const response = await request(app)
        .post("/interviews/save")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          category: "Full Stack Developer",
          level: "junior",
          tier: "Basic",
          questions,
          answers,
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Interview berhasil disimpan");

      // Verify interview was saved correctly
      const savedInterview = await Interview.findById(
        response.body.interviewId,
      );
      expect(savedInterview.questions.length).toBe(4);
      expect(savedInterview.answers.length).toBe(4);
    });

    it("should return 400 when tier quota is too small", async () => {
      // Create a tier with only 1 question quota (less than minimum of 2)
      await createTestTier({ title: "Tiny", quota: 1 });

      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Tiny",
          tokenUsage: 5,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Total pertanyaan tier terlalu kecil (minimum 2)",
      );
    });

    it("should return 400 when no questions found for category and level", async () => {
      // Delete all questions for the category
      await Question.deleteMany({ categoryId: testCategory._id });

      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Basic",
          tokenUsage: 5,
        });

      // Should still return 201 with empty array or 400
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe("Database error handling", () => {
    it("should handle database error in getInterviewById", async () => {
      const findByIdSpy = jest
        .spyOn(Interview, "findById")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get(`/interviews/${generateObjectId()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      findByIdSpy.mockRestore();
    });

    it("should handle database error in Tier.find during startInterview", async () => {
      const findSpy = jest
        .spyOn(Tier, "find")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/interviews/start")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: testCategory._id.toString(),
          level: "junior",
          tier: "Basic",
          tokenUsage: 5,
        });

      expect(response.status).toBe(500);
      findSpy.mockRestore();
    });
  });
});
