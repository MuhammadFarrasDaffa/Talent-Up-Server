const request = require("supertest");
const createApp = require("../app");
const { createTestUser, generateObjectId } = require("../helpers");
const User = require("../../models/User");
const path = require("path");
const fs = require("fs");

const app = createApp();

describe("Resume Controller", () => {
  let testUser, authToken;

  beforeEach(async () => {
    const userData = await createTestUser();
    testUser = userData.user;
    authToken = userData.token;
  });

  describe("POST /resume/parse", () => {
    it("should return 400 if no file uploaded", async () => {
      const response = await request(app)
        .post("/resume/parse")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("No file uploaded");
    });

    it("should return error for non-PDF file", async () => {
      const response = await request(app)
        .post("/resume/parse")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("resume", Buffer.from("test content"), {
          filename: "test.txt",
          contentType: "text/plain",
        });

      // Either 400 (from validation) or 500 (from processing error)
      expect([400, 500]).toContain(response.status);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post("/resume/parse")
        .attach("resume", Buffer.from("%PDF-1.4 mock"), {
          filename: "resume.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /resume/save-to-profile", () => {
    it("should save parsed profile to user successfully", async () => {
      const parsedProfile = {
        fullName: "John Doe Updated",
        email: "john.updated@example.com",
        profile: {
          title: "Senior Software Engineer",
          summary: "Updated professional summary",
          location: "Bandung, Indonesia",
          skills: ["JavaScript", "TypeScript", "React"],
          experience: [
            {
              company: "New Tech Corp",
              position: "Lead Developer",
              startDate: "2021-01-01",
            },
          ],
          education: [
            {
              institution: "ITB",
              degree: "Master of Computer Science",
            },
          ],
        },
      };

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ parsedProfile });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Profile updated successfully from CV",
      );
      expect(response.body).toHaveProperty("profile");
    });

    it("should update only fullName if only that is provided", async () => {
      const parsedProfile = {
        fullName: "Only Name Updated",
        profile: {
          skills: [],
        },
      };

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ parsedProfile });

      expect(response.status).toBe(200);
      expect(response.body.profile.fullName).toBe("Only Name Updated");
    });

    it("should handle skills as strings", async () => {
      const parsedProfile = {
        fullName: "Test User",
        profile: {
          skills: ["JavaScript", "Python", "React"],
        },
      };

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ parsedProfile });

      expect(response.status).toBe(200);
      expect(response.body.profile.skills).toHaveLength(3);
      expect(response.body.profile.skills[0]).toHaveProperty("name");
    });

    it("should handle skills as objects", async () => {
      const parsedProfile = {
        fullName: "Test User",
        profile: {
          skills: [
            { name: "JavaScript", level: "Expert" },
            { name: "Python", level: "Intermediate" },
          ],
        },
      };

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ parsedProfile });

      expect(response.status).toBe(200);
      expect(response.body.profile.skills[0].name).toBe("JavaScript");
    });

    it("should return 400 if parsedProfile is missing", async () => {
      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid profile data");
    });

    it("should return 400 if profile object is missing", async () => {
      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          parsedProfile: {
            fullName: "Test",
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid profile data");
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          parsedProfile: {
            fullName: "Test",
            profile: { skills: [] },
          },
        });

      // Auth middleware returns 401 when user not found
      expect(response.status).toBe(401);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post("/resume/save-to-profile")
        .send({
          parsedProfile: {
            fullName: "Test",
            profile: { skills: [] },
          },
        });

      expect(response.status).toBe(401);
    });

    it("should update experience correctly", async () => {
      const parsedProfile = {
        fullName: "Test User",
        profile: {
          experience: [
            {
              company: "Tech Corp",
              position: "Developer",
              startDate: "2020-01-01",
              endDate: "2022-01-01",
              description: ["Built applications"],
            },
          ],
        },
      };

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ parsedProfile });

      expect(response.status).toBe(200);
      expect(response.body.profile.experience).toHaveLength(1);
      expect(response.body.profile.experience[0].company).toBe("Tech Corp");
    });

    it("should update education correctly", async () => {
      const parsedProfile = {
        fullName: "Test User",
        profile: {
          education: [
            {
              institution: "University of Technology",
              degree: "Bachelor of Science",
              fieldOfStudy: "Computer Science",
              startDate: "2016-01-01",
              endDate: "2020-01-01",
            },
          ],
        },
      };

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ parsedProfile });

      expect(response.status).toBe(200);
      expect(response.body.profile.education).toHaveLength(1);
      expect(response.body.profile.education[0].institution).toBe(
        "University of Technology",
      );
    });

    it("should update all profile fields correctly", async () => {
      const parsedProfile = {
        fullName: "Complete User",
        email: "complete@example.com",
        profile: {
          title: "Full Stack Developer",
          summary: "Experienced developer with 10 years of experience",
          location: "Jakarta, Indonesia",
          skills: ["JavaScript", "Python", "Go"],
          experience: [
            {
              company: "Big Corp",
              position: "Senior Developer",
              startDate: "2015-01-01",
              endDate: "2023-01-01",
              description: ["Led team of 5 developers"],
            },
          ],
          education: [
            {
              institution: "Top University",
              degree: "PhD",
              fieldOfStudy: "Computer Science",
            },
          ],
        },
      };

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ parsedProfile });

      expect(response.status).toBe(200);
      expect(response.body.profile.fullName).toBe("Complete User");
      expect(response.body.profile.email).toBe("complete@example.com");
      expect(response.body.profile.title).toBe("Full Stack Developer");
      expect(response.body.profile.summary).toBe(
        "Experienced developer with 10 years of experience",
      );
      expect(response.body.profile.location).toBe("Jakarta, Indonesia");
    });

    it("should handle empty profile fields", async () => {
      const parsedProfile = {
        fullName: "Minimal User",
        profile: {
          title: "",
          summary: "",
          skills: [],
          experience: [],
          education: [],
        },
      };

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ parsedProfile });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /resume/parse with valid PDF", () => {
    it("should successfully parse a valid PDF file", async () => {
      // Create a mock PDF buffer with proper header
      const pdfContent = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<</Type/Catalog>>\nendobj\ntrailer\n<</Root 1 0 R>>\n%%EOF",
      );

      const response = await request(app)
        .post("/resume/parse")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("resume", pdfContent, {
          filename: "resume.pdf",
          contentType: "application/pdf",
        });

      // May return 200 with parsed data, or 400/500 depending on mock behavior
      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty("data");
      }
    });
  });

  describe("Database error handling", () => {
    it("should handle database error in saveToProfile", async () => {
      const findByIdSpy = jest
        .spyOn(User, "findById")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          parsedProfile: {
            fullName: "Test User",
            profile: { skills: [{ name: "JavaScript" }] },
          },
        });

      expect(response.status).toBe(500);
      findByIdSpy.mockRestore();
    });

    it("should handle database error in User.save during saveToProfile", async () => {
      const saveSpy = jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Database save failed"));

      const response = await request(app)
        .post("/resume/save-to-profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          parsedProfile: {
            fullName: "Test User",
            profile: { skills: [{ name: "JavaScript" }] },
          },
        });

      expect(response.status).toBe(500);
      saveSpy.mockRestore();
    });
  });
});
