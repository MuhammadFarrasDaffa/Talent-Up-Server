module.exports = {
  testEnvironment: "node",
  verbose: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    "controllers/**/*.js",
    "middleware/**/*.js",
    "helpers/**/*.js",
    "models/**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
  ],
  testMatch: ["**/__tests__/**/*.test.js"],
  testTimeout: 60000,
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.js"],
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    "^@google/genai$": "<rootDir>/__tests__/__mocks__/genai.js",
    "^@elevenlabs/elevenlabs-js$":
      "<rootDir>/__tests__/__mocks__/elevenlabs.js",
    "^google-auth-library$":
      "<rootDir>/__tests__/__mocks__/google-auth-library.js",
  },
};
