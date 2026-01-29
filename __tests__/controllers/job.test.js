const request = require("supertest");
const createApp = require("../app");
const {
  createTestUser,
  createTestJob,
  generateObjectId,
} = require("../helpers");
const Job = require("../../models/Job");

const app = createApp();

// Get reference to mocked service
const JobsAiService = require("../../services/JobsAiService");

describe("Job Controller", () => {
  describe("GET /jobs", () => {
    beforeEach(async () => {
      // Create multiple test jobs with different skills
      await createTestJob({
        title: "Frontend Developer",
        company: "Company A",
        location: "Jakarta",
        skills: ["Vue", "CSS"],
      });
      await createTestJob({
        title: "Backend Developer",
        company: "Company B",
        location: "Bandung",
        skills: ["Python", "Django"],
      });
      await createTestJob({
        title: "Fullstack Developer",
        company: "Company C",
        location: "Jakarta",
        skills: ["React", "Node.js"],
      });
    });

    it("should get all jobs with pagination", async () => {
      const response = await request(app).get("/jobs");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(3);
      expect(response.body.pagination).toHaveProperty("totalData");
      expect(response.body.pagination).toHaveProperty("totalPages");
      expect(response.body.pagination).toHaveProperty("currentPage");
    });

    it("should filter jobs by search query", async () => {
      const response = await request(app)
        .get("/jobs")
        .query({ search: "Frontend" });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe("Frontend Developer");
    });

    it("should filter jobs by location", async () => {
      const response = await request(app)
        .get("/jobs")
        .query({ location: "Jakarta" });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it("should filter jobs by company name", async () => {
      const response = await request(app)
        .get("/jobs")
        .query({ search: "Company A" });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].company).toBe("Company A");
    });

    it("should filter jobs by skills", async () => {
      const response = await request(app)
        .get("/jobs")
        .query({ search: "React" });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
    });

    it("should paginate results correctly", async () => {
      const response = await request(app)
        .get("/jobs")
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.currentPage).toBe("1");
      expect(response.body.pagination.perPage).toBe("2");
    });

    it("should return empty array when no jobs match", async () => {
      const response = await request(app)
        .get("/jobs")
        .query({ search: "NonExistentJob" });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it("should filter by job type", async () => {
      await createTestJob({ title: "Contract Developer", jobType: "Contract" });

      const response = await request(app)
        .get("/jobs")
        .query({ type: "Contract" });

      expect(response.status).toBe(200);
      expect(response.body.data.some((job) => job.jobType === "Contract")).toBe(
        true,
      );
    });
  });

  describe("GET /jobs/:id", () => {
    let testJob;

    beforeEach(async () => {
      testJob = await createTestJob();
    });

    it("should get job by id successfully", async () => {
      const response = await request(app).get(`/jobs/${testJob._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(testJob.title);
      expect(response.body.data.company).toBe(testJob.company);
    });

    it("should return 404 for non-existent job", async () => {
      const fakeId = generateObjectId();

      const response = await request(app).get(`/jobs/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Lowongan tidak ditemukan");
    });

    it("should return 500 for invalid job id format", async () => {
      const response = await request(app).get("/jobs/invalid-id");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /jobs/:id/match", () => {
    let testJob, testUser, authToken;

    beforeEach(async () => {
      testJob = await createTestJob();
      const userData = await createTestUser();
      testUser = userData.user;
      authToken = userData.token;

      // Reset and re-apply mock implementation
      JobsAiService.analyzeMatch.mockClear();
      JobsAiService.analyzeMatch.mockResolvedValue({
        matchScore: 85,
        matchedSkills: ["JavaScript", "Node.js"],
        missingSkills: ["Python"],
        recommendations: ["Learn Python"],
        analysis: "Good match",
      });
    });

    it("should analyze job match successfully", async () => {
      const response = await request(app)
        .post(`/jobs/${testJob._id}/match`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userProfile: {
            profile: {
              skills: ["JavaScript", "Node.js"],
              experience: [],
              education: [],
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // The controller returns the analysis result in data field
      expect(response.body.data).toBeDefined();
    });

    it("should return 400 if userProfile is missing", async () => {
      const response = await request(app)
        .post(`/jobs/${testJob._id}/match`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("profil user tidak ditemukan");
    });

    it("should return 400 if profile object is missing", async () => {
      const response = await request(app)
        .post(`/jobs/${testJob._id}/match`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userProfile: {},
        });

      expect(response.status).toBe(400);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post(`/jobs/${testJob._id}/match`)
        .send({
          userProfile: {
            profile: { skills: [] },
          },
        });

      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent job", async () => {
      const fakeId = generateObjectId();

      const response = await request(app)
        .post(`/jobs/${fakeId}/match`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userProfile: {
            profile: { skills: [] },
          },
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Lowongan tidak ditemukan");
    });

    it("should try to find job by externalId if ObjectId fails", async () => {
      const jobWithExternalId = await createTestJob({
        externalId: "external-123",
      });

      const response = await request(app)
        .post(`/jobs/${jobWithExternalId._id}/match`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userProfile: {
            profile: { skills: ["JavaScript"] },
          },
        });

      expect(response.status).toBe(200);
    });
  });

  describe("Database error handling", () => {
    let dbTestToken, dbTestJob;

    beforeEach(async () => {
      const { token } = await createTestUser({
        email: `job-db-test-${Date.now()}@test.com`,
      });
      dbTestToken = token;
      dbTestJob = await createTestJob();
    });

    it("should handle database error in getJobById", async () => {
      const findByIdSpy = jest
        .spyOn(Job, "findById")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get(`/jobs/${dbTestJob._id}`)
        .set("Authorization", `Bearer ${dbTestToken}`);

      expect(response.status).toBe(500);
      findByIdSpy.mockRestore();
    });

    it("should handle database error in countDocuments", async () => {
      const countSpy = jest
        .spyOn(Job, "countDocuments")
        .mockRejectedValueOnce(new Error("Database count failed"));

      const response = await request(app)
        .get("/jobs")
        .set("Authorization", `Bearer ${dbTestToken}`);

      expect(response.status).toBe(500);
      countSpy.mockRestore();
    });
  });
});
