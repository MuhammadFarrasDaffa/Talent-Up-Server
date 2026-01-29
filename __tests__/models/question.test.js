const mongoose = require("mongoose");
const Question = require("../../models/Question");
const Category = require("../../models/Category");

describe("Question Model", () => {
  let testCategory;

  beforeEach(async () => {
    testCategory = await Category.create({
      title: "Test Category",
      description: "Test description",
      published: true,
    });
  });

  describe("Schema validation", () => {
    it("should create question with required fields", async () => {
      const question = await Question.create({
        categoryId: testCategory._id,
        level: "junior",
        type: "core",
        content: "What is JavaScript?",
      });

      expect(question._id).toBeDefined();
      expect(question.level).toBe("junior");
      expect(question.type).toBe("core");
      expect(question.content).toBe("What is JavaScript?");
      expect(question.followUp).toBe(false); // default
    });

    it("should fail without categoryId", async () => {
      await expect(
        Question.create({
          level: "junior",
          type: "core",
          content: "Question?",
        }),
      ).rejects.toThrow();
    });

    it("should fail without level", async () => {
      await expect(
        Question.create({
          categoryId: testCategory._id,
          type: "core",
          content: "Question?",
        }),
      ).rejects.toThrow();
    });

    it("should fail without type", async () => {
      await expect(
        Question.create({
          categoryId: testCategory._id,
          level: "junior",
          content: "Question?",
        }),
      ).rejects.toThrow();
    });

    it("should fail without content", async () => {
      await expect(
        Question.create({
          categoryId: testCategory._id,
          level: "junior",
          type: "core",
        }),
      ).rejects.toThrow();
    });
  });

  describe("Type enum", () => {
    it("should accept intro type", async () => {
      const question = await Question.create({
        categoryId: testCategory._id,
        level: "junior",
        type: "intro",
        content: "Tell me about yourself",
      });

      expect(question.type).toBe("intro");
    });

    it("should accept core type", async () => {
      const question = await Question.create({
        categoryId: testCategory._id,
        level: "junior",
        type: "core",
        content: "What is React?",
      });

      expect(question.type).toBe("core");
    });

    it("should accept closing type", async () => {
      const question = await Question.create({
        categoryId: testCategory._id,
        level: "junior",
        type: "closing",
        content: "Do you have any questions?",
      });

      expect(question.type).toBe("closing");
    });

    it("should reject invalid type", async () => {
      await expect(
        Question.create({
          categoryId: testCategory._id,
          level: "junior",
          type: "invalid",
          content: "Question?",
        }),
      ).rejects.toThrow();
    });
  });

  describe("Default values", () => {
    it("should set followUp to false by default", async () => {
      const question = await Question.create({
        categoryId: testCategory._id,
        level: "junior",
        type: "core",
        content: "What is JavaScript?",
      });

      expect(question.followUp).toBe(false);
    });

    it("should set audioUrl to empty string by default", async () => {
      const question = await Question.create({
        categoryId: testCategory._id,
        level: "junior",
        type: "core",
        content: "What is JavaScript?",
      });

      expect(question.audioUrl).toBe("");
    });
  });

  describe("Optional fields", () => {
    it("should allow setting followUp to true", async () => {
      const question = await Question.create({
        categoryId: testCategory._id,
        level: "junior",
        type: "core",
        content: "Can you elaborate?",
        followUp: true,
      });

      expect(question.followUp).toBe(true);
    });

    it("should allow setting audioUrl", async () => {
      const question = await Question.create({
        categoryId: testCategory._id,
        level: "junior",
        type: "core",
        content: "What is JavaScript?",
        audioUrl: "https://example.com/audio.mp3",
      });

      expect(question.audioUrl).toBe("https://example.com/audio.mp3");
    });
  });

  describe("Population", () => {
    it("should populate categoryId", async () => {
      const question = await Question.create({
        categoryId: testCategory._id,
        level: "junior",
        type: "core",
        content: "What is React?",
      });

      const populated = await Question.findById(question._id).populate(
        "categoryId",
      );

      expect(populated.categoryId.title).toBe("Test Category");
    });
  });
});

describe("Category Model", () => {
  describe("Schema validation", () => {
    it("should create category with required fields", async () => {
      const category = await Category.create({
        title: "Frontend Developer",
      });

      expect(category._id).toBeDefined();
      expect(category.title).toBe("Frontend Developer");
      expect(category.published).toBe(false); // default
    });

    it("should fail without title", async () => {
      await expect(Category.create({})).rejects.toThrow();
    });
  });

  describe("Default values", () => {
    it("should set description to empty string by default", async () => {
      const category = await Category.create({ title: "Test" });
      expect(category.description).toBe("");
    });

    it("should set icon to empty string by default", async () => {
      const category = await Category.create({ title: "Test" });
      expect(category.icon).toBe("");
    });

    it("should set published to false by default", async () => {
      const category = await Category.create({ title: "Test" });
      expect(category.published).toBe(false);
    });

    it("should set all levels to false by default", async () => {
      const category = await Category.create({ title: "Test" });
      expect(category.level.junior).toBe(false);
      expect(category.level.middle).toBe(false);
      expect(category.level.senior).toBe(false);
    });
  });

  describe("Level subdocument", () => {
    it("should allow setting specific levels", async () => {
      const category = await Category.create({
        title: "Backend Developer",
        level: {
          junior: true,
          middle: true,
          senior: false,
        },
      });

      expect(category.level.junior).toBe(true);
      expect(category.level.middle).toBe(true);
      expect(category.level.senior).toBe(false);
    });
  });

  describe("Full category data", () => {
    it("should create category with all fields", async () => {
      const category = await Category.create({
        title: "Fullstack Developer",
        description: "Interview questions for fullstack developers",
        icon: "fullstack-icon.svg",
        level: {
          junior: true,
          middle: true,
          senior: true,
        },
        published: true,
      });

      expect(category.title).toBe("Fullstack Developer");
      expect(category.description).toBe(
        "Interview questions for fullstack developers",
      );
      expect(category.icon).toBe("fullstack-icon.svg");
      expect(category.published).toBe(true);
    });
  });
});
