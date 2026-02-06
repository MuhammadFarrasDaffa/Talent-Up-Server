const { signToken, verifyToken } = require("../../helpers/jwt");

describe("JWT Helper", () => {
  describe("signToken", () => {
    it("should generate a valid JWT token", () => {
      const payload = { id: "123", email: "test@example.com" };
      const token = signToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should generate different tokens for different payloads", () => {
      const payload1 = { id: "123", email: "test1@example.com" };
      const payload2 = { id: "456", email: "test2@example.com" };

      const token1 = signToken(payload1);
      const token2 = signToken(payload2);

      expect(token1).not.toBe(token2);
    });

    it("should handle empty payload", () => {
      const token = signToken({});

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should handle complex payload", () => {
      const payload = {
        id: "123",
        email: "test@example.com",
        role: "admin",
        permissions: ["read", "write", "delete"],
      };
      const token = signToken(payload);

      expect(token).toBeDefined();
    });
  });

  describe("verifyToken", () => {
    it("should verify and decode a valid token", () => {
      const payload = { id: "123", email: "test@example.com" };
      const token = signToken(payload);

      const decoded = verifyToken(token);

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
    });

    it("should throw error for invalid token", () => {
      const invalidToken = "invalid.token.here";

      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it("should throw error for malformed token", () => {
      const malformedToken = "not-a-jwt";

      expect(() => verifyToken(malformedToken)).toThrow();
    });

    it("should throw error for tampered token", () => {
      const payload = { id: "123", email: "test@example.com" };
      const token = signToken(payload);

      // Tamper with the token
      const parts = token.split(".");
      parts[1] = "tampered" + parts[1];
      const tamperedToken = parts.join(".");

      expect(() => verifyToken(tamperedToken)).toThrow();
    });

    it("should include iat (issued at) in decoded token", () => {
      const payload = { id: "123" };
      const token = signToken(payload);

      const decoded = verifyToken(token);

      expect(decoded).toHaveProperty("iat");
    });
  });
});
