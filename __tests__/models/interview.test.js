const mongoose = require("mongoose");
const Interview = require("../../models/Interview");

describe("Interview Model", () => {
  const validInterviewData = {
    userId: new mongoose.Types.ObjectId(),
    categoryId: new mongoose.Types.ObjectId(),
    category: "Frontend Developer",
    level: "junior",
    tier: "Basic",
  };

  describe("Schema validation", () => {
    it("should create interview with required fields", async () => {
      const interview = await Interview.create(validInterviewData);

      expect(interview._id).toBeDefined();
      expect(interview.category).toBe("Frontend Developer");
      expect(interview.level).toBe("junior");
      expect(interview.tier).toBe("Basic");
      expect(interview.evaluated).toBe(false); // default
    });

    it("should fail without userId", async () => {
      const data = { ...validInterviewData };
      delete data.userId;

      await expect(Interview.create(data)).rejects.toThrow();
    });

    it("should fail without categoryId", async () => {
      const data = { ...validInterviewData };
      delete data.categoryId;

      await expect(Interview.create(data)).rejects.toThrow();
    });

    it("should fail without category", async () => {
      const data = { ...validInterviewData };
      delete data.category;

      await expect(Interview.create(data)).rejects.toThrow();
    });

    it("should fail without level", async () => {
      const data = { ...validInterviewData };
      delete data.level;

      await expect(Interview.create(data)).rejects.toThrow();
    });

    it("should fail without tier", async () => {
      const data = { ...validInterviewData };
      delete data.tier;

      await expect(Interview.create(data)).rejects.toThrow();
    });
  });

  describe("Default values", () => {
    it("should set evaluated to false by default", async () => {
      const interview = await Interview.create(validInterviewData);

      expect(interview.evaluated).toBe(false);
    });

    it("should set completedAt to now by default", async () => {
      const beforeCreate = new Date();
      const interview = await Interview.create(validInterviewData);
      const afterCreate = new Date();

      expect(interview.completedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(interview.completedAt.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime(),
      );
    });

    it("should set questions to empty array by default", async () => {
      const interview = await Interview.create(validInterviewData);

      expect(interview.questions).toBeInstanceOf(Array);
      expect(interview.questions).toHaveLength(0);
    });

    it("should set answers to empty array by default", async () => {
      const interview = await Interview.create(validInterviewData);

      expect(interview.answers).toBeInstanceOf(Array);
      expect(interview.answers).toHaveLength(0);
    });

    it("should set evaluation to null by default", async () => {
      const interview = await Interview.create(validInterviewData);

      expect(interview.evaluation).toBeNull();
    });
  });

  describe("Questions subdocument", () => {
    it("should store questions array", async () => {
      const interview = await Interview.create({
        ...validInterviewData,
        questions: [
          {
            _id: "q1",
            content: "Question 1",
            type: "intro",
            level: "junior",
            followUp: false,
          },
          {
            _id: "q2",
            content: "Question 2",
            type: "core",
            level: "junior",
            followUp: true,
          },
        ],
      });

      expect(interview.questions).toHaveLength(2);
      expect(interview.questions[0].content).toBe("Question 1");
      expect(interview.questions[0].type).toBe("intro");
    });
  });

  describe("Answers subdocument", () => {
    it("should store answers array", async () => {
      const interview = await Interview.create({
        ...validInterviewData,
        answers: [
          {
            questionId: "q1",
            question: "Question 1",
            transcription: "My answer to question 1",
            duration: 60,
            isFollowUp: false,
            acknowledgment: "Great answer!",
          },
        ],
      });

      expect(interview.answers).toHaveLength(1);
      expect(interview.answers[0].transcription).toBe(
        "My answer to question 1",
      );
      expect(interview.answers[0].duration).toBe(60);
    });
  });

  describe("Evaluation", () => {
    it("should store evaluation object", async () => {
      const interview = await Interview.create({
        ...validInterviewData,
        evaluated: true,
        evaluation: {
          overallScore: 85,
          overallGrade: "A-",
          summary: "Good interview performance",
          recommendations: ["Keep practicing"],
        },
        evaluatedAt: new Date(),
      });

      expect(interview.evaluated).toBe(true);
      expect(interview.evaluation.overallScore).toBe(85);
      expect(interview.evaluation.overallGrade).toBe("A-");
    });
  });
});
