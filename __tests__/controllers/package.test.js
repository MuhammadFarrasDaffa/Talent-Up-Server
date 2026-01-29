const request = require("supertest");
const createApp = require("../app");
const {
  createTestUser,
  createTestPackage,
  generateObjectId,
} = require("../helpers");
const Package = require("../../models/Package");

const app = createApp();

describe("Package Controller", () => {
  let testUser, authToken;

  beforeEach(async () => {
    const userData = await createTestUser();
    testUser = userData.user;
    authToken = userData.token;

    // Create test packages
    await createTestPackage({
      name: "Basic Token",
      type: "basic",
      tokens: 50,
      price: 50000,
    });
    await createTestPackage({
      name: "Pro Token",
      type: "pro",
      tokens: 100,
      price: 90000,
    });
    await createTestPackage({
      name: "Premium Token",
      type: "premium",
      tokens: 200,
      price: 170000,
    });
  });

  describe("GET /packages", () => {
    it("should get all packages sorted by price", async () => {
      const response = await request(app)
        .get("/packages")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.packages).toBeInstanceOf(Array);
      expect(response.body.packages.length).toBe(3);
      // Check if sorted by price ascending
      expect(response.body.packages[0].price).toBeLessThanOrEqual(
        response.body.packages[1].price,
      );
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/packages");

      expect(response.status).toBe(401);
    });

    it("should return empty array if no packages", async () => {
      await Package.deleteMany({});

      const response = await request(app)
        .get("/packages")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.packages).toHaveLength(0);
    });
  });

  describe("GET /packages/:id", () => {
    let testPackage;

    beforeEach(async () => {
      testPackage = await Package.findOne({ type: "basic" });
    });

    it("should get package by id successfully", async () => {
      const response = await request(app)
        .get(`/packages/${testPackage._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.package.name).toBe("Basic Token");
      expect(response.body.package.type).toBe("basic");
    });

    it("should return 404 for non-existent package", async () => {
      const fakeId = generateObjectId();

      const response = await request(app)
        .get(`/packages/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Package tidak ditemukan");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get(`/packages/${testPackage._id}`);

      expect(response.status).toBe(401);
    });

    it("should handle invalid id format", async () => {
      const response = await request(app)
        .get("/packages/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("GET /packages/type/:type", () => {
    it("should get package by type successfully", async () => {
      const response = await request(app)
        .get("/packages/type/basic")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.package.type).toBe("basic");
      expect(response.body.package.name).toBe("Basic Token");
    });

    it("should return 404 for non-existent package type", async () => {
      const response = await request(app)
        .get("/packages/type/nonexistent")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Package tidak ditemukan");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/packages/type/basic");

      expect(response.status).toBe(401);
    });

    it("should get pro package by type", async () => {
      const response = await request(app)
        .get("/packages/type/pro")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.package.type).toBe("pro");
      expect(response.body.package.tokens).toBe(100);
    });

    it("should get premium package by type", async () => {
      const response = await request(app)
        .get("/packages/type/premium")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.package.type).toBe("premium");
      expect(response.body.package.tokens).toBe(200);
    });
  });

  describe("Database error handling", () => {
    it("should handle database error in getAllPackages", async () => {
      const findSpy = jest
        .spyOn(Package, "find")
        .mockImplementationOnce(() => ({
          sort: jest
            .fn()
            .mockRejectedValue(new Error("Database connection failed")),
        }));

      const response = await request(app)
        .get("/packages")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      findSpy.mockRestore();
    });

    it("should handle database error in getPackageByType", async () => {
      const findOneSpy = jest
        .spyOn(Package, "findOne")
        .mockRejectedValueOnce(new Error("Database timeout"));

      const response = await request(app)
        .get("/packages/type/basic")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      findOneSpy.mockRestore();
    });
  });
});
