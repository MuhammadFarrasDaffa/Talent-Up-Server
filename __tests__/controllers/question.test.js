const request = require("supertest");
const createApp = require("../app");
const {
  createTestUser,
  createTestCategory,
  createTestQuestion,
  generateObjectId,
} = require("../helpers");
const Question = require("../../models/Question");
const Category = require("../../models/Category");

const app = createApp();

describe("Question Controller", () => {
  let testUser, authToken, testCategory;

  beforeEach(async () => {
    const userData = await createTestUser();
    testUser = userData.user;
    authToken = userData.token;

    testCategory = await createTestCategory();

    // Create test questions
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
    await createTestQuestion(testCategory._id, {
      type: "core",
      level: "middle",
    });
  });

  describe("GET /questions", () => {
    it("should get all questions successfully", async () => {
      const response = await request(app)
        .get("/questions")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(5);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/questions");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /questions/categories", () => {
    it("should get all published categories", async () => {
      // Create an unpublished category
      await createTestCategory({
        title: "Unpublished Category",
        published: false,
      });

      const response = await request(app)
        .get("/questions/categories")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1); // Only published category
      expect(response.body[0].title).toBe("Frontend Developer");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/questions/categories");

      expect(response.status).toBe(401);
    });

    it("should return empty array if no published categories", async () => {
      await Category.deleteMany({});

      const response = await request(app)
        .get("/questions/categories")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe("GET /questions/count", () => {
    it("should get question count for category and level", async () => {
      const response = await request(app)
        .get("/questions/count")
        .query({
          categoryId: testCategory._id.toString(),
          level: "junior",
        })
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(4); // 4 junior level questions
    });

    it("should get question count for different level", async () => {
      const response = await request(app)
        .get("/questions/count")
        .query({
          categoryId: testCategory._id.toString(),
          level: "middle",
        })
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1); // 1 middle level question
    });

    it("should return 400 if categoryId is missing", async () => {
      const response = await request(app)
        .get("/questions/count")
        .query({ level: "junior" })
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("categoryId and level are required");
    });

    it("should return 400 if level is missing", async () => {
      const response = await request(app)
        .get("/questions/count")
        .query({ categoryId: testCategory._id.toString() })
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("categoryId and level are required");
    });

    it("should return 0 for non-existent category", async () => {
      const fakeId = generateObjectId();

      const response = await request(app)
        .get("/questions/count")
        .query({
          categoryId: fakeId.toString(),
          level: "junior",
        })
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/questions/count").query({
        categoryId: testCategory._id.toString(),
        level: "junior",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Database error handling", () => {
    it("should handle database error in getAllQuestions", async () => {
      const findSpy = jest
        .spyOn(Question, "find")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .get("/questions")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      findSpy.mockRestore();
    });

    it("should handle database error in getAllCategories", async () => {
      const findSpy = jest
        .spyOn(Category, "find")
        .mockRejectedValueOnce(new Error("Database timeout"));

      const response = await request(app)
        .get("/questions/categories")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      findSpy.mockRestore();
    });

    it("should handle database error in getQuestionCount", async () => {
      const findSpy = jest
        .spyOn(Question, "find")
        .mockRejectedValueOnce(new Error("Query failed"));

      const response = await request(app)
        .get("/questions/count")
        .query({ categoryId: testCategory._id.toString(), level: "junior" })
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      findSpy.mockRestore();
    });
  });
});
