const request = require("supertest");
const createApp = require("../app");
const {
  createTestUser,
  createTestTier,
  generateObjectId,
} = require("../helpers");
const Tier = require("../../models/Tier");

const app = createApp();

describe("Tier Controller", () => {
  let testUser, authToken;

  beforeEach(async () => {
    const userData = await createTestUser();
    testUser = userData.user;
    authToken = userData.token;

    // Create test tiers
    await createTestTier({ title: "Basic", price: 50000, quota: 5 });
    await createTestTier({ title: "Pro", price: 100000, quota: 10 });
    await createTestTier({ title: "Premium", price: 200000, quota: 20 });
  });

  describe("GET /tiers", () => {
    it("should get all tiers sorted by price", async () => {
      const response = await request(app)
        .get("/tiers")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tiers).toBeInstanceOf(Array);
      expect(response.body.tiers.length).toBe(3);
      // Check if sorted by price ascending
      expect(response.body.tiers[0].price).toBeLessThanOrEqual(
        response.body.tiers[1].price,
      );
      expect(response.body.tiers[1].price).toBeLessThanOrEqual(
        response.body.tiers[2].price,
      );
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/tiers");

      expect(response.status).toBe(401);
    });

    it("should return empty array if no tiers", async () => {
      await Tier.deleteMany({});

      const response = await request(app)
        .get("/tiers")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tiers).toHaveLength(0);
    });
  });

  describe("GET /tiers/:id", () => {
    let testTier;

    beforeEach(async () => {
      testTier = await Tier.findOne({ title: "Basic" });
    });

    it("should get tier by id successfully", async () => {
      const response = await request(app)
        .get(`/tiers/${testTier._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tier.title).toBe("Basic");
      expect(response.body.tier.price).toBe(50000);
    });

    it("should return 404 for non-existent tier", async () => {
      const fakeId = generateObjectId();

      const response = await request(app)
        .get(`/tiers/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Tier tidak ditemukan");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get(`/tiers/${testTier._id}`);

      expect(response.status).toBe(401);
    });

    it("should handle invalid id format", async () => {
      const response = await request(app)
        .get("/tiers/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("Database error handling", () => {
    it("should handle database error in getAllTiers", async () => {
      const findSpy = jest.spyOn(Tier, "find").mockImplementationOnce(() => ({
        sort: jest
          .fn()
          .mockRejectedValue(new Error("Database connection failed")),
      }));

      const response = await request(app)
        .get("/tiers")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      findSpy.mockRestore();
    });
  });
});
