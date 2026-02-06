const { hashPassword, comparePassword } = require("../../helpers/bcrypt");

describe("Bcrypt Helper", () => {
  describe("hashPassword", () => {
    it("should hash password successfully", () => {
      const password = "testPassword123";
      const hashedPassword = hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(typeof hashedPassword).toBe("string");
    });

    it("should generate different hashes for same password", () => {
      const password = "testPassword123";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      // bcrypt generates unique salts, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it("should hash empty password", () => {
      const hashedPassword = hashPassword("");

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe("string");
    });

    it("should hash long password", () => {
      const longPassword = "a".repeat(100);
      const hashedPassword = hashPassword(longPassword);

      expect(hashedPassword).toBeDefined();
    });
  });

  describe("comparePassword", () => {
    it("should return true for matching password", () => {
      const password = "testPassword123";
      const hashedPassword = hashPassword(password);

      const result = comparePassword(password, hashedPassword);

      expect(result).toBe(true);
    });

    it("should return false for non-matching password", () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword456";
      const hashedPassword = hashPassword(password);

      const result = comparePassword(wrongPassword, hashedPassword);

      expect(result).toBe(false);
    });

    it("should return false for empty password comparison", () => {
      const password = "testPassword123";
      const hashedPassword = hashPassword(password);

      const result = comparePassword("", hashedPassword);

      expect(result).toBe(false);
    });

    it("should handle special characters in password", () => {
      const password = "!@#$%^&*()_+-=[]{}|;:,.<>?";
      const hashedPassword = hashPassword(password);

      const result = comparePassword(password, hashedPassword);

      expect(result).toBe(true);
    });

    it("should handle unicode characters in password", () => {
      const password = "パスワード密码";
      const hashedPassword = hashPassword(password);

      const result = comparePassword(password, hashedPassword);

      expect(result).toBe(true);
    });
  });
});
