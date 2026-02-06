const request = require("supertest");
const createApp = require("../app");
const { createTestUser, generateObjectId } = require("../helpers");
const User = require("../../models/User");
const mongoose = require("mongoose");

const app = createApp();

describe("Profile Controller", () => {
  let testUser, authToken;

  beforeEach(async () => {
    const { user, token } = await createTestUser();
    testUser = user;
    authToken = token;
  });

  describe("GET /profile", () => {
    it("should get user profile successfully", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Profile retrieved successfully");
      expect(response.body).toHaveProperty("profile");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(testUser.email);
    });

    it("should return 401 without auth token", async () => {
      const response = await request(app).get("/profile");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Please login first");
    });

    it("should return 401 with invalid token", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .get("/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("User not found");
    });
  });

  describe("POST /profile", () => {
    it("should update profile successfully", async () => {
      const response = await request(app)
        .post("/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          fullName: "Updated Name",
          title: "Senior Developer",
          summary: "Updated summary",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Profile updated successfully");
      expect(response.body.profile.fullName).toBe("Updated Name");
      expect(response.body.profile.title).toBe("Senior Developer");
    });

    it("should update profile with all fields", async () => {
      const response = await request(app)
        .post("/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          fullName: "Full Name",
          title: "Tech Lead",
          email: "profile@example.com",
          phone: "08111222333",
          location: "Bandung",
          summary: "Professional summary",
          linkedIn: "https://linkedin.com/in/user",
          github: "https://github.com/user",
          portfolio: "https://portfolio.com",
          aiSummary: "AI generated summary",
        });

      expect(response.status).toBe(200);
      expect(response.body.profile.fullName).toBe("Full Name");
      expect(response.body.profile.location).toBe("Bandung");
      expect(response.body.profile.linkedIn).toBe(
        "https://linkedin.com/in/user",
      );
    });

    it("should update profile with arrays", async () => {
      const response = await request(app)
        .post("/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          skills: [{ name: "Python", level: "Advanced" }],
          certifications: [{ name: "AWS", issuer: "Amazon", year: "2024" }],
        });

      expect(response.status).toBe(200);
      expect(response.body.profile.skills).toHaveLength(1);
      expect(response.body.profile.skills[0].name).toBe("Python");
    });

    it("should return 401 without auth token", async () => {
      const response = await request(app)
        .post("/profile")
        .send({ fullName: "Test" });

      expect(response.status).toBe(401);
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post("/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ fullName: "Test" });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /profile/experience", () => {
    it("should add experience successfully", async () => {
      const response = await request(app)
        .post("/profile/experience")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          company: "Tech Company",
          position: "Software Engineer",
          startDate: "2022-01-01",
          endDate: "2023-12-31",
          description: ["Developed features", "Led team"],
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Experience added successfully");
      expect(response.body.profile.experience).toHaveLength(1);
    });

    it("should add experience with isCurrent flag", async () => {
      const response = await request(app)
        .post("/profile/experience")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          company: "Current Company",
          position: "Senior Developer",
          startDate: "2023-01-01",
          isCurrent: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.profile.experience[0].isCurrent).toBe(true);
    });

    it("should return 400 if company is missing", async () => {
      const response = await request(app)
        .post("/profile/experience")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          position: "Developer",
          startDate: "2022-01-01",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Please provide company, position, and start date",
      );
    });

    it("should return 400 if position is missing", async () => {
      const response = await request(app)
        .post("/profile/experience")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          company: "Company",
          startDate: "2022-01-01",
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 if startDate is missing", async () => {
      const response = await request(app)
        .post("/profile/experience")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          company: "Company",
          position: "Developer",
        });

      expect(response.status).toBe(400);
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post("/profile/experience")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          company: "Company",
          position: "Developer",
          startDate: "2022-01-01",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /profile/experience/:experienceId", () => {
    let experienceId;

    beforeEach(async () => {
      testUser.profile.experience.push({
        company: "Old Company",
        position: "Junior Developer",
        startDate: new Date("2020-01-01"),
        description: [],
      });
      await testUser.save();
      experienceId = testUser.profile.experience[0]._id;
    });

    it("should update experience successfully", async () => {
      const response = await request(app)
        .put(`/profile/experience/${experienceId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          company: "New Company",
          position: "Senior Developer",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Experience updated successfully");
      expect(response.body.profile.experience[0].company).toBe("New Company");
    });

    it("should return 404 if experience not found", async () => {
      const fakeId = generateObjectId();

      const response = await request(app)
        .put(`/profile/experience/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ company: "Test" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Experience not found");
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .put(`/profile/experience/${experienceId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ company: "Test" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /profile/experience/:experienceId", () => {
    let experienceId;

    beforeEach(async () => {
      testUser.profile.experience.push({
        company: "Company to Delete",
        position: "Developer",
        startDate: new Date("2020-01-01"),
        description: [],
      });
      await testUser.save();
      experienceId = testUser.profile.experience[0]._id;
    });

    it("should delete experience successfully", async () => {
      const response = await request(app)
        .delete(`/profile/experience/${experienceId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Experience deleted successfully");
      expect(response.body.profile.experience).toHaveLength(0);
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .delete(`/profile/experience/${experienceId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /profile/education", () => {
    it("should add education successfully", async () => {
      const response = await request(app)
        .post("/profile/education")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          institution: "University",
          degree: "Bachelor",
          fieldOfStudy: "Computer Science",
          startDate: "2016-01-01",
          endDate: "2020-01-01",
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Education added successfully");
      expect(response.body.profile.education).toHaveLength(1);
    });

    it("should return 400 if institution is missing", async () => {
      const response = await request(app)
        .post("/profile/education")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          degree: "Bachelor",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Please provide institution and degree",
      );
    });

    it("should return 400 if degree is missing", async () => {
      const response = await request(app)
        .post("/profile/education")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          institution: "University",
        });

      expect(response.status).toBe(400);
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post("/profile/education")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          institution: "University",
          degree: "Bachelor",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /profile/education/:educationId", () => {
    let educationId;

    beforeEach(async () => {
      testUser.profile.education.push({
        institution: "Old University",
        degree: "Bachelor",
      });
      await testUser.save();
      educationId = testUser.profile.education[0]._id;
    });

    it("should update education successfully", async () => {
      const response = await request(app)
        .put(`/profile/education/${educationId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          institution: "New University",
          degree: "Master",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Education updated successfully");
    });

    it("should return 404 if education not found", async () => {
      const fakeId = generateObjectId();

      const response = await request(app)
        .put(`/profile/education/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ institution: "Test" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Education not found");
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .put(`/profile/education/${educationId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ institution: "Test" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /profile/education/:educationId", () => {
    let educationId;

    beforeEach(async () => {
      testUser.profile.education.push({
        institution: "University to Delete",
        degree: "Bachelor",
      });
      await testUser.save();
      educationId = testUser.profile.education[0]._id;
    });

    it("should delete education successfully", async () => {
      const response = await request(app)
        .delete(`/profile/education/${educationId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Education deleted successfully");
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .delete(`/profile/education/${educationId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /profile/skills", () => {
    it("should add skill successfully", async () => {
      const response = await request(app)
        .post("/profile/skills")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Python",
          level: "Advanced",
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Skill added successfully");
    });

    it("should return 400 if name is missing", async () => {
      const response = await request(app)
        .post("/profile/skills")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          level: "Advanced",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Please provide skill name");
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post("/profile/skills")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Python",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /profile/skills/:skillId", () => {
    let skillId;

    beforeEach(async () => {
      testUser.profile.skills.push({
        name: "Skill to Delete",
        level: "Beginner",
      });
      await testUser.save();
      skillId = testUser.profile.skills[testUser.profile.skills.length - 1]._id;
    });

    it("should delete skill successfully", async () => {
      const response = await request(app)
        .delete(`/profile/skills/${skillId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Skill deleted successfully");
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .delete(`/profile/skills/${skillId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe("Database error handling", () => {
    let dbTestUser, dbTestToken;

    beforeEach(async () => {
      const userData = await createTestUser({
        email: `dbtest-${Date.now()}@example.com`,
      });
      dbTestUser = userData.user;
      dbTestToken = userData.token;
    });

    it("should handle database error in User.save during addExperience", async () => {
      // Use mockImplementationOnce to skip first call (from auth) and fail on second
      const saveSpy = jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Database save failed"));

      const response = await request(app)
        .post("/profile/experience")
        .set("Authorization", `Bearer ${dbTestToken}`)
        .send({
          company: "Test Company",
          position: "Developer",
          startDate: "2022-01-01",
        });

      expect(response.status).toBe(500);
      saveSpy.mockRestore();
    });

    it("should handle database error in getProfile", async () => {
      const findByIdSpy = jest
        .spyOn(User, "findById")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/profile")
        .set("Authorization", `Bearer ${dbTestToken}`);

      expect(response.status).toBe(500);
      findByIdSpy.mockRestore();
    });

    it("should handle database error in createOrUpdateProfile", async () => {
      const findByIdSpy = jest
        .spyOn(User, "findById")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/profile")
        .set("Authorization", `Bearer ${dbTestToken}`)
        .send({ fullName: "New Name" });

      expect(response.status).toBe(500);
      findByIdSpy.mockRestore();
    });

    it("should handle database error in addEducation", async () => {
      const saveSpy = jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/profile/education")
        .set("Authorization", `Bearer ${dbTestToken}`)
        .send({
          institution: "University",
          degree: "Bachelor",
        });

      expect(response.status).toBe(500);
      saveSpy.mockRestore();
    });

    it("should handle database error in updateExperience", async () => {
      // First add an experience
      dbTestUser.profile.experience.push({
        company: "Test",
        position: "Dev",
        startDate: new Date(),
      });
      await dbTestUser.save();
      const expId = dbTestUser.profile.experience[0]._id;

      const saveSpy = jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put(`/profile/experience/${expId}`)
        .set("Authorization", `Bearer ${dbTestToken}`)
        .send({ company: "Updated" });

      expect(response.status).toBe(500);
      saveSpy.mockRestore();
    });

    it("should handle database error in deleteExperience", async () => {
      dbTestUser.profile.experience.push({
        company: "To Delete",
        position: "Dev",
        startDate: new Date(),
      });
      await dbTestUser.save();
      const expId = dbTestUser.profile.experience[0]._id;

      const saveSpy = jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .delete(`/profile/experience/${expId}`)
        .set("Authorization", `Bearer ${dbTestToken}`);

      expect(response.status).toBe(500);
      saveSpy.mockRestore();
    });

    it("should handle database error in updateEducation", async () => {
      dbTestUser.profile.education.push({
        institution: "Test",
        degree: "Bachelor",
      });
      await dbTestUser.save();
      const eduId = dbTestUser.profile.education[0]._id;

      const saveSpy = jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put(`/profile/education/${eduId}`)
        .set("Authorization", `Bearer ${dbTestToken}`)
        .send({ institution: "Updated" });

      expect(response.status).toBe(500);
      saveSpy.mockRestore();
    });

    it("should handle database error in deleteEducation", async () => {
      dbTestUser.profile.education.push({
        institution: "To Delete",
        degree: "Bachelor",
      });
      await dbTestUser.save();
      const eduId = dbTestUser.profile.education[0]._id;

      const saveSpy = jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .delete(`/profile/education/${eduId}`)
        .set("Authorization", `Bearer ${dbTestToken}`);

      expect(response.status).toBe(500);
      saveSpy.mockRestore();
    });

    it("should handle database error in addSkill", async () => {
      const saveSpy = jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/profile/skills")
        .set("Authorization", `Bearer ${dbTestToken}`)
        .send({ name: "JavaScript" });

      expect(response.status).toBe(500);
      saveSpy.mockRestore();
    });

    it("should handle database error in deleteSkill", async () => {
      dbTestUser.profile.skills.push({ name: "ToDelete" });
      await dbTestUser.save();
      const skillId = dbTestUser.profile.skills[0]._id;

      const saveSpy = jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .delete(`/profile/skills/${skillId}`)
        .set("Authorization", `Bearer ${dbTestToken}`);

      expect(response.status).toBe(500);
      saveSpy.mockRestore();
    });
  });
});
