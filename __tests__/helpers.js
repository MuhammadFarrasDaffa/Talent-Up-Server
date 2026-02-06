const User = require("../models/User");
const Job = require("../models/Job");
const Interview = require("../models/Interview");
const Question = require("../models/Question");
const Category = require("../models/Category");
const Tier = require("../models/Tier");
const Package = require("../models/Package");
const Payment = require("../models/Payment");
const { hashPassword } = require("../helpers/bcrypt");
const { signToken } = require("../helpers/jwt");
const mongoose = require("mongoose");

// Create test user
const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    name: "Test User",
    email: "test@example.com",
    password: hashPassword("password123"),
    role: "user",
    token: 100,
    profile: {
      fullName: "Test User Full Name",
      title: "Software Engineer",
      summary: "Experienced developer",
      location: "Jakarta",
      phone: "08123456789",
      skills: [
        { name: "JavaScript", level: "Expert" },
        { name: "Node.js", level: "Advanced" },
      ],
      experience: [],
      education: [],
      certifications: [],
    },
  };

  const user = await User.create({ ...defaultUser, ...overrides });
  const token = signToken({ id: user._id, email: user.email });

  return { user, token };
};

// Create test user with Google OAuth
const createGoogleUser = async (overrides = {}) => {
  const defaultUser = {
    name: "Google User",
    email: "google@example.com",
    googleId: "google-123456",
    role: "user",
    token: 50,
    profile: {
      fullName: "Google User",
      title: "",
      summary: "",
      location: "",
      skills: [],
      experience: [],
      education: [],
      certifications: [],
    },
  };

  const user = await User.create({ ...defaultUser, ...overrides });
  const token = signToken({ id: user._id, email: user.email });

  return { user, token };
};

// Create test job
const createTestJob = async (overrides = {}) => {
  const defaultJob = {
    title: "Software Engineer",
    company: "Tech Corp",
    location: "Jakarta",
    salary: "Rp 10.000.000 - Rp 15.000.000",
    jobUrl: "https://example.com/job/1",
    externalId: `ext-${Date.now()}-${Math.random()}`,
    description: "Looking for experienced developer",
    skills: ["JavaScript", "Node.js", "React"],
    requirements: ["3+ years experience", "Bachelor degree"],
    benefits: ["Health insurance", "Remote work"],
    jobType: "Full Time",
    experienceLevel: "3-5 years",
    minEducation: "S1",
  };

  return await Job.create({ ...defaultJob, ...overrides });
};

// Create test category
const createTestCategory = async (overrides = {}) => {
  const defaultCategory = {
    title: "Frontend Developer",
    description: "Frontend development interview",
    icon: "frontend-icon",
    level: {
      junior: true,
      middle: true,
      senior: true,
    },
    published: true,
  };

  return await Category.create({ ...defaultCategory, ...overrides });
};

// Create test question
const createTestQuestion = async (categoryId, overrides = {}) => {
  const defaultQuestion = {
    categoryId,
    level: "junior",
    type: "core",
    content: "Tell me about your experience with JavaScript?",
    followUp: false,
    audioUrl: "",
  };

  return await Question.create({ ...defaultQuestion, ...overrides });
};

// Create test tier
const createTestTier = async (overrides = {}) => {
  const defaultTier = {
    title: "Basic",
    price: 50000,
    benefits: ["5 Questions", "Basic feedback"],
    quota: 5,
    description: "Basic interview package",
  };

  return await Tier.create({ ...defaultTier, ...overrides });
};

// Create test package
const createTestPackage = async (overrides = {}) => {
  const defaultPackage = {
    name: "Basic Token",
    type: "basic",
    tokens: 50,
    price: 50000,
    description: "Basic token package",
    features: ["50 tokens", "Basic support"],
    popular: false,
  };

  return await Package.create({ ...defaultPackage, ...overrides });
};

// Create test payment
const createTestPayment = async (userId, overrides = {}) => {
  const defaultPayment = {
    userId,
    orderId: `ORDER-${userId}-${Date.now()}`,
    packageType: "basic",
    tokenAmount: 50,
    price: 50000,
    status: "pending",
    snapToken: "test-snap-token",
    snapRedirectUrl: "https://app.sandbox.midtrans.com/snap/test",
  };

  return await Payment.create({ ...defaultPayment, ...overrides });
};

// Create test interview
const createTestInterview = async (userId, categoryId, overrides = {}) => {
  const defaultInterview = {
    userId,
    categoryId,
    category: "Frontend Developer",
    level: "junior",
    tier: "Basic",
    questions: [
      {
        _id: "q1",
        content: "Tell me about yourself",
        type: "intro",
        level: "junior",
        followUp: false,
      },
    ],
    answers: [
      {
        questionId: "q1",
        question: "Tell me about yourself",
        transcription: "I am a software developer with 3 years of experience.",
        duration: 60,
        isFollowUp: false,
        acknowledgment: "Great, thank you!",
      },
    ],
    evaluated: false,
  };

  return await Interview.create({ ...defaultInterview, ...overrides });
};

// Generate valid MongoDB ObjectId
const generateObjectId = () => new mongoose.Types.ObjectId();

module.exports = {
  createTestUser,
  createGoogleUser,
  createTestJob,
  createTestCategory,
  createTestQuestion,
  createTestTier,
  createTestPackage,
  createTestPayment,
  createTestInterview,
  generateObjectId,
};
