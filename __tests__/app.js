// Mock global fetch for audio transcription
const originalFetch = global.fetch;
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes("audio/transcriptions")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({ text: "This is a mock transcription of the audio" }),
    });
  }
  // Fall back to original fetch for other URLs
  return originalFetch
    ? originalFetch(url)
    : Promise.reject(new Error("No fetch mock"));
});

// Mock external services before loading anything
jest.mock("../services/JobsAiService", () => ({
  analyzeMatch: jest.fn().mockResolvedValue({
    matchScore: 85,
    matchedSkills: ["JavaScript", "Node.js"],
    missingSkills: ["Python"],
    recommendations: ["Learn Python"],
    analysis: "Good match",
  }),
  parseCV: jest.fn().mockResolvedValue({
    fullName: "Test User",
    email: "test@test.com",
    profile: {
      title: "Software Engineer",
      summary: "Experienced developer",
      skills: ["JavaScript", "Node.js"],
    },
  }),
}));

jest.mock("../services/CVAiService", () => ({
  enhanceSummary: jest.fn().mockResolvedValue("Enhanced professional summary"),
  optimizeDescription: jest
    .fn()
    .mockResolvedValue(["Optimized description 1", "Optimized description 2"]),
  suggestSkills: jest.fn().mockResolvedValue(["TypeScript", "Docker", "AWS"]),
  generateHeadline: jest
    .fn()
    .mockResolvedValue(
      "Senior Full-Stack Developer | Expert in React & Node.js",
    ),
}));

jest.mock("../services/MidtransService", () => ({
  getPackage: jest.fn().mockImplementation(async (type) => {
    if (type === "invalid") return null;
    return { type, tokens: 50, price: 50000, name: "Test Package" };
  }),
  getAllPackages: jest.fn().mockResolvedValue([
    { type: "basic", tokens: 50, price: 50000, name: "Basic" },
    { type: "pro", tokens: 100, price: 90000, name: "Pro" },
  ]),
  createTransaction: jest.fn().mockResolvedValue({
    token: "snap-token-123",
    redirect_url: "https://app.sandbox.midtrans.com/snap/test",
  }),
  verifyNotification: jest.fn().mockResolvedValue({
    transaction_status: "settlement",
    fraud_status: "accept",
    payment_type: "qris",
    transaction_id: "trans-123",
  }),
  verifySignatureKey: jest.fn().mockReturnValue(true),
  checkTransactionStatus: jest.fn().mockResolvedValue({
    transaction_status: "settlement",
  }),
  mapTransactionStatus: jest.fn().mockImplementation((status) => {
    const map = {
      capture: "success",
      settlement: "success",
      pending: "pending",
      deny: "failed",
      expire: "expired",
      cancel: "failed",
    };
    return map[status] || "pending";
  }),
}));

// Mock for pdf-parse library
jest.mock("pdf-parse", () => {
  class MockPDFParse {
    constructor(buffer) {
      this.buffer = buffer;
    }
    async getText() {
      return {
        text: "John Doe\nSoftware Engineer\njohn@example.com\n\nExperienced developer with 5 years experience.",
      };
    }
  }
  return { PDFParse: MockPDFParse };
});

jest.mock("../services/PdfService", () => ({
  generatePreviewHTML: jest
    .fn()
    .mockResolvedValue("<html><body><h1>CV Preview</h1></body></html>"),
  generatePDF: jest
    .fn()
    .mockResolvedValue(Buffer.from("%PDF-1.4 mock pdf content")),
}));

const express = require("express");
const cors = require("cors");
const router = require("../routes");
const errorHandler = require("../middleware/ErrorHandler");

// Create express app for testing (without starting server)
const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(router);
  app.use(errorHandler);

  app.get("/", (req, res) => res.send("Server Ready 🚀"));

  return app;
};

module.exports = createApp;
