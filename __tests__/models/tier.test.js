const mongoose = require("mongoose");
const Tier = require("../../models/Tier");

describe("Tier Model", () => {
  describe("Schema validation", () => {
    it("should create tier with required fields", async () => {
      const tier = await Tier.create({
        title: "Basic",
        price: 50000,
        benefits: ["5 questions", "Basic feedback"],
        quota: 5,
        description: "Basic interview package",
      });

      expect(tier._id).toBeDefined();
      expect(tier.title).toBe("Basic");
      expect(tier.price).toBe(50000);
      expect(tier.quota).toBe(5);
    });

    it("should fail without title", async () => {
      await expect(
        Tier.create({
          price: 50000,
          benefits: ["benefit"],
          quota: 5,
          description: "Description",
        }),
      ).rejects.toThrow();
    });

    it("should fail without price", async () => {
      await expect(
        Tier.create({
          title: "Test",
          benefits: ["benefit"],
          quota: 5,
          description: "Description",
        }),
      ).rejects.toThrow();
    });

    it("should create tier without benefits (empty array default)", async () => {
      // Note: Mongoose allows empty arrays even with required: true
      // because the array field exists (just empty)
      const tier = await Tier.create({
        title: "Test",
        price: 50000,
        quota: 5,
        description: "Description",
      });

      expect(tier.benefits).toEqual([]);
    });

    it("should fail without quota", async () => {
      await expect(
        Tier.create({
          title: "Test",
          price: 50000,
          benefits: ["benefit"],
          description: "Description",
        }),
      ).rejects.toThrow();
    });

    it("should fail without description", async () => {
      await expect(
        Tier.create({
          title: "Test",
          price: 50000,
          benefits: ["benefit"],
          quota: 5,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Benefits array", () => {
    it("should store multiple benefits", async () => {
      const tier = await Tier.create({
        title: "Pro",
        price: 100000,
        benefits: ["10 questions", "Detailed feedback", "Priority support"],
        quota: 10,
        description: "Pro package",
      });

      expect(tier.benefits).toHaveLength(3);
      expect(tier.benefits).toContain("10 questions");
      expect(tier.benefits).toContain("Detailed feedback");
    });

    it("should allow single benefit", async () => {
      const tier = await Tier.create({
        title: "Minimal",
        price: 10000,
        benefits: ["Basic access"],
        quota: 1,
        description: "Minimal package",
      });

      expect(tier.benefits).toHaveLength(1);
    });
  });

  describe("Complete tier data", () => {
    it("should create full tier entry", async () => {
      const tier = await Tier.create({
        title: "Premium",
        price: 200000,
        benefits: [
          "20 questions",
          "Comprehensive feedback",
          "Priority support",
          "Resume review",
          "Mock interview",
        ],
        quota: 20,
        description: "Premium package with all features",
      });

      expect(tier.title).toBe("Premium");
      expect(tier.price).toBe(200000);
      expect(tier.benefits).toHaveLength(5);
      expect(tier.quota).toBe(20);
      expect(tier.description).toBe("Premium package with all features");
    });
  });
});
