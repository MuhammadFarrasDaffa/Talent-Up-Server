const request = require("supertest");
const createApp = require("../app");
const { createTestUser, generateObjectId } = require("../helpers");
const User = require("../../models/User");

const app = createApp();

// Get reference to mocked PdfService
const pdfService = require("../../services/PdfService");

describe("Pdf Controller", () => {
  let testUser, authToken;

  beforeEach(async () => {
    const userData = await createTestUser({
      profile: {
        fullName: "Test Developer",
        title: "Software Engineer",
        summary: "Experienced developer",
        email: "test@example.com",
        phone: "08123456789",
        location: "Jakarta",
        skills: [
          { name: "JavaScript", level: "Expert" },
          { name: "Node.js", level: "Advanced" },
        ],
        experience: [
          {
            company: "Tech Company",
            position: "Senior Developer",
            startDate: new Date("2020-01-01"),
            description: ["Developed web applications"],
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

    // Reset mocks
    pdfService.generatePreviewHTML.mockClear();
    pdfService.generatePDF.mockClear();
    pdfService.generatePreviewHTML.mockResolvedValue(
      "<html><body><h1>CV Preview</h1></body></html>",
    );
    pdfService.generatePDF.mockResolvedValue(
      Buffer.from("%PDF-1.4 mock pdf content"),
    );
  });

  describe("GET /pdf/preview", () => {
    it("should return CV preview as HTML", async () => {
      const response = await request(app)
        .get("/pdf/preview")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.type).toBe("text/html");
      expect(response.text).toContain("CV Preview");
    });

    it("should accept style query parameter", async () => {
      const response = await request(app)
        .get("/pdf/preview")
        .query({ style: "classic" })
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(pdfService.generatePreviewHTML).toHaveBeenCalled();
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/pdf/preview");

      expect(response.status).toBe(401);
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .get("/pdf/preview")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /pdf/generate", () => {
    it("should generate PDF and return buffer", async () => {
      const response = await request(app)
        .post("/pdf/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.type).toBe("application/pdf");
      expect(response.headers["content-disposition"]).toContain("attachment");
    });

    it("should accept template parameter", async () => {
      const response = await request(app)
        .post("/pdf/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ template: "classic" });

      expect(response.status).toBe(200);
      expect(pdfService.generatePDF).toHaveBeenCalled();
    });

    it("should accept custom profile from request body", async () => {
      const customProfile = {
        fullName: "Custom User",
        title: "Designer",
        summary: "Creative designer",
        skills: [{ name: "Figma", level: "Expert" }],
      };

      const response = await request(app)
        .post("/pdf/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ profile: customProfile });

      expect(response.status).toBe(200);
      expect(pdfService.generatePDF).toHaveBeenCalledWith(
        customProfile,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it("should return 400 if profile is incomplete", async () => {
      // User with empty profile
      const { user: emptyUser, token: emptyToken } = await createTestUser({
        email: "empty@example.com",
        profile: {
          fullName: "",
          title: "",
          summary: "",
        },
      });

      const response = await request(app)
        .post("/pdf/generate")
        .set("Authorization", `Bearer ${emptyToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("incomplete");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).post("/pdf/generate").send({});

      expect(response.status).toBe(401);
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post("/pdf/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(401);
    });

    it("should include filename in content-disposition header", async () => {
      const response = await request(app)
        .post("/pdf/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toMatch(/CV_.*\.pdf/);
    });

    it("should handle PDF service errors gracefully", async () => {
      pdfService.generatePDF.mockRejectedValueOnce(
        new Error("PDF generation failed"),
      );

      const response = await request(app)
        .post("/pdf/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(500);
    });
  });

  describe("Edge cases", () => {
    it("should handle preview with user having minimal profile", async () => {
      const { token: minimalToken } = await createTestUser({
        email: "minimal@test.com",
        profile: {
          fullName: "Minimal User",
        },
      });

      const response = await request(app)
        .get("/pdf/preview")
        .set("Authorization", `Bearer ${minimalToken}`);

      expect([200, 400]).toContain(response.status);
    });

    it("should handle preview service errors gracefully", async () => {
      pdfService.generatePreviewHTML.mockRejectedValueOnce(
        new Error("Preview generation failed"),
      );

      const response = await request(app)
        .get("/pdf/preview")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });

    it("should generate PDF with all template options", async () => {
      const options = {
        template: "modern",
        fontSize: "12pt",
        color: "blue",
      };

      const response = await request(app)
        .post("/pdf/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send(options);

      expect(response.status).toBe(200);
    });
  });
});
