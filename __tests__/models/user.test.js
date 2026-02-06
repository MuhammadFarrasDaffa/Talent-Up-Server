const mongoose = require("mongoose");
const User = require("../../models/User");

describe("User Model", () => {
  describe("Schema validation", () => {
    it("should create user with required fields", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword123",
      };

      const user = await User.create(userData);

      expect(user._id).toBeDefined();
      expect(user.name).toBe("Test User");
      expect(user.email).toBe("test@example.com");
      expect(user.role).toBe("user"); // default
      expect(user.token).toBe(0); // default
    });

    it("should fail without name", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it("should fail without email", async () => {
      const userData = {
        name: "Test User",
        password: "password123",
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it("should allow user without password (Google OAuth)", async () => {
      const userData = {
        name: "Google User",
        email: "google@example.com",
        googleId: "google-123",
      };

      const user = await User.create(userData);

      expect(user.password).toBeUndefined();
      expect(user.googleId).toBe("google-123");
    });

    it("should enforce unique email", async () => {
      await User.create({
        name: "User 1",
        email: "unique@example.com",
      });

      await expect(
        User.create({
          name: "User 2",
          email: "unique@example.com",
        }),
      ).rejects.toThrow();
    });

    it("should set default role to user", async () => {
      const user = await User.create({
        name: "Test",
        email: "role@example.com",
      });

      expect(user.role).toBe("user");
    });

    it("should allow admin role", async () => {
      const user = await User.create({
        name: "Admin",
        email: "admin@example.com",
        role: "admin",
      });

      expect(user.role).toBe("admin");
    });
  });

  describe("Profile subdocument", () => {
    it("should create user with profile", async () => {
      const user = await User.create({
        name: "Profile User",
        email: "profile@example.com",
        profile: {
          fullName: "Full Name",
          title: "Software Engineer",
          summary: "Experienced developer",
          location: "Jakarta",
          phone: "08123456789",
        },
      });

      expect(user.profile.fullName).toBe("Full Name");
      expect(user.profile.title).toBe("Software Engineer");
    });

    it("should add experience to profile", async () => {
      const user = await User.create({
        name: "Exp User",
        email: "exp@example.com",
      });

      user.profile.experience.push({
        company: "Tech Corp",
        position: "Developer",
        startDate: new Date("2020-01-01"),
        description: ["Task 1", "Task 2"],
      });

      await user.save();

      expect(user.profile.experience).toHaveLength(1);
      expect(user.profile.experience[0].company).toBe("Tech Corp");
    });

    it("should add education to profile", async () => {
      const user = await User.create({
        name: "Edu User",
        email: "edu@example.com",
      });

      user.profile.education.push({
        institution: "University",
        degree: "Bachelor",
        fieldOfStudy: "Computer Science",
      });

      await user.save();

      expect(user.profile.education).toHaveLength(1);
      expect(user.profile.education[0].institution).toBe("University");
    });

    it("should add skills to profile", async () => {
      const user = await User.create({
        name: "Skill User",
        email: "skill@example.com",
      });

      user.profile.skills.push({ name: "JavaScript", level: "Expert" });
      user.profile.skills.push({ name: "Python", level: "Intermediate" });

      await user.save();

      expect(user.profile.skills).toHaveLength(2);
    });

    it("should add certifications to profile", async () => {
      const user = await User.create({
        name: "Cert User",
        email: "cert@example.com",
      });

      user.profile.certifications.push({
        name: "AWS Certified",
        issuer: "Amazon",
        year: "2024",
      });

      await user.save();

      expect(user.profile.certifications).toHaveLength(1);
    });
  });

  describe("Timestamps", () => {
    it("should set createdAt automatically", async () => {
      const user = await User.create({
        name: "Time User",
        email: "time@example.com",
      });

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });
  });
});
