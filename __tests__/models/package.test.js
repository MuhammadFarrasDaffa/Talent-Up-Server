const mongoose = require("mongoose");
const Package = require("../../models/Package");

describe("Package Model", () => {
  describe("Schema validation", () => {
    it("should create package with required fields", async () => {
      const pkg = await Package.create({
        name: "Basic Token",
        type: "basic",
        tokens: 50,
        price: 50000,
      });

      expect(pkg._id).toBeDefined();
      expect(pkg.name).toBe("Basic Token");
      expect(pkg.type).toBe("basic");
      expect(pkg.tokens).toBe(50);
      expect(pkg.price).toBe(50000);
      expect(pkg.popular).toBe(false); // default
    });

    it("should fail without name", async () => {
      await expect(
        Package.create({
          type: "basic",
          tokens: 50,
          price: 50000,
        }),
      ).rejects.toThrow();
    });

    it("should fail without type", async () => {
      await expect(
        Package.create({
          name: "Test",
          tokens: 50,
          price: 50000,
        }),
      ).rejects.toThrow();
    });

    it("should fail without tokens", async () => {
      await expect(
        Package.create({
          name: "Test",
          type: "basic",
          price: 50000,
        }),
      ).rejects.toThrow();
    });

    it("should fail without price", async () => {
      await expect(
        Package.create({
          name: "Test",
          type: "basic",
          tokens: 50,
        }),
      ).rejects.toThrow();
    });

    it("should enforce unique type", async () => {
      // Ensure indexes are created
      await Package.syncIndexes();

      await Package.create({
        name: "Basic 1",
        type: "unique-type",
        tokens: 50,
        price: 50000,
      });

      await expect(
        Package.create({
          name: "Basic 2",
          type: "unique-type",
          tokens: 100,
          price: 90000,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Default values", () => {
    it("should set popular to false by default", async () => {
      const pkg = await Package.create({
        name: "Test Package",
        type: "test-default",
        tokens: 50,
        price: 50000,
      });

      expect(pkg.popular).toBe(false);
    });

    it("should set features to empty array by default", async () => {
      const pkg = await Package.create({
        name: "Test Package",
        type: "test-features-default",
        tokens: 50,
        price: 50000,
      });

      expect(pkg.features).toBeInstanceOf(Array);
      expect(pkg.features).toHaveLength(0);
    });
  });

  describe("Optional fields", () => {
    it("should allow setting description", async () => {
      const pkg = await Package.create({
        name: "Test Package",
        type: "test-desc",
        tokens: 50,
        price: 50000,
        description: "This is a test package",
      });

      expect(pkg.description).toBe("This is a test package");
    });

    it("should allow setting features array", async () => {
      const pkg = await Package.create({
        name: "Pro Package",
        type: "test-pro",
        tokens: 100,
        price: 90000,
        features: ["100 tokens", "Priority support", "Advanced features"],
      });

      expect(pkg.features).toHaveLength(3);
      expect(pkg.features).toContain("100 tokens");
    });

    it("should allow setting popular to true", async () => {
      const pkg = await Package.create({
        name: "Popular Package",
        type: "test-popular",
        tokens: 100,
        price: 90000,
        popular: true,
      });

      expect(pkg.popular).toBe(true);
    });
  });

  describe("Complete package data", () => {
    it("should create full package entry", async () => {
      const pkg = await Package.create({
        name: "Premium Token Package",
        type: "premium-full",
        tokens: 200,
        price: 170000,
        description: "Best value token package",
        features: [
          "200 tokens",
          "24/7 support",
          "Exclusive content",
          "Early access",
        ],
        popular: true,
      });

      expect(pkg.name).toBe("Premium Token Package");
      expect(pkg.type).toBe("premium-full");
      expect(pkg.tokens).toBe(200);
      expect(pkg.price).toBe(170000);
      expect(pkg.description).toBe("Best value token package");
      expect(pkg.features).toHaveLength(4);
      expect(pkg.popular).toBe(true);
    });
  });
});
