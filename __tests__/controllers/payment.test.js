const request = require("supertest");
const createApp = require("../app");
const {
  createTestUser,
  createTestPackage,
  createTestPayment,
  generateObjectId,
} = require("../helpers");
const Payment = require("../../models/Payment");
const User = require("../../models/User");
const Package = require("../../models/Package");

const app = createApp();

// Get reference to mocked midtrans service
const midtransService = require("../../services/MidtransService");

describe("Payment Controller", () => {
  let testUser, authToken;

  beforeEach(async () => {
    const userData = await createTestUser({ token: 10 });
    testUser = userData.user;
    authToken = userData.token;

    await createTestPackage({ type: "basic" });
    await createTestPackage({ type: "pro", tokens: 100, price: 90000 });

    // Reset mock call counts but keep implementations
    midtransService.getPackage.mockClear();
    midtransService.getAllPackages.mockClear();
    midtransService.createTransaction.mockClear();
    midtransService.verifyNotification.mockClear();
    midtransService.verifySignatureKey.mockClear();
    midtransService.checkTransactionStatus.mockClear();
    midtransService.mapTransactionStatus.mockClear();

    // Re-set the mock implementations
    midtransService.getAllPackages.mockResolvedValue([
      { type: "basic", tokens: 50, price: 50000, name: "Basic" },
      { type: "pro", tokens: 100, price: 90000, name: "Pro" },
    ]);
    midtransService.getPackage.mockImplementation(async (type) => {
      if (type === "invalid") return null;
      return { type, tokens: 50, price: 50000, name: "Test Package" };
    });
    midtransService.createTransaction.mockResolvedValue({
      token: "snap-token-123",
      redirect_url: "https://app.sandbox.midtrans.com/snap/test",
    });
  });

  describe("GET /payment/packages", () => {
    it("should get all packages successfully", async () => {
      const response = await request(app).get("/payment/packages");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty("packages");
    });
  });

  describe("POST /payment/create", () => {
    it("should create payment successfully", async () => {
      const response = await request(app)
        .post("/payment/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          packageType: "basic",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("orderId");
      expect(response.body.data).toHaveProperty("snapToken");
      expect(response.body.data).toHaveProperty("redirectUrl");
    });

    it("should return 400 for invalid package type", async () => {
      midtransService.getPackage.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/payment/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          packageType: "invalid",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid package type");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).post("/payment/create").send({
        packageType: "basic",
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post("/payment/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          packageType: "basic",
        });

      // Auth middleware returns 401 when user not found
      expect(response.status).toBe(401);
    });
  });

  describe("POST /payment/notification", () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await createTestPayment(testUser._id);
      // Reset mocks for each test
      midtransService.verifySignatureKey.mockReturnValue(true);
      midtransService.verifyNotification.mockResolvedValue({
        transaction_status: "settlement",
        fraud_status: "accept",
        payment_type: "qris",
        transaction_id: "trans-123",
      });
      midtransService.mapTransactionStatus.mockImplementation((status) => {
        const map = {
          capture: "success",
          settlement: "success",
          pending: "pending",
          deny: "failed",
          expire: "expired",
          cancel: "failed",
        };
        return map[status] || "pending";
      });
    });

    it("should handle notification successfully", async () => {
      const response = await request(app).post("/payment/notification").send({
        order_id: testPayment.orderId,
        status_code: "200",
        gross_amount: "50000",
        signature_key: "valid-signature",
        transaction_status: "settlement",
        fraud_status: "accept",
        payment_type: "qris",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should add tokens to user on successful payment", async () => {
      const initialToken = testUser.token;

      await request(app).post("/payment/notification").send({
        order_id: testPayment.orderId,
        status_code: "200",
        gross_amount: "50000",
        signature_key: "valid-signature",
        transaction_status: "settlement",
      });

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.token).toBe(initialToken + testPayment.tokenAmount);
    });

    it("should return 403 for invalid signature", async () => {
      midtransService.verifySignatureKey.mockReturnValueOnce(false);

      const response = await request(app).post("/payment/notification").send({
        order_id: testPayment.orderId,
        status_code: "200",
        gross_amount: "50000",
        signature_key: "invalid-signature",
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Invalid signature key");
    });

    it("should return 404 if payment not found", async () => {
      const response = await request(app).post("/payment/notification").send({
        order_id: "non-existent-order",
        status_code: "200",
        gross_amount: "50000",
        signature_key: "valid-signature",
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Payment not found");
    });

    it("should skip already processed successful payments", async () => {
      await Payment.findByIdAndUpdate(testPayment._id, { status: "success" });

      const response = await request(app).post("/payment/notification").send({
        order_id: testPayment.orderId,
        status_code: "200",
        gross_amount: "50000",
        signature_key: "valid-signature",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Payment already processed");
    });

    it("should handle capture with challenge fraud status", async () => {
      midtransService.verifyNotification.mockResolvedValueOnce({
        transaction_status: "capture",
        fraud_status: "challenge",
        payment_type: "credit_card",
      });

      const response = await request(app).post("/payment/notification").send({
        order_id: testPayment.orderId,
        status_code: "200",
        gross_amount: "50000",
        signature_key: "valid-signature",
      });

      expect(response.status).toBe(200);
    });

    it("should handle capture with accept fraud status", async () => {
      midtransService.verifyNotification.mockResolvedValueOnce({
        transaction_status: "capture",
        fraud_status: "accept",
        payment_type: "credit_card",
        transaction_id: "trans-456",
      });

      const response = await request(app).post("/payment/notification").send({
        order_id: testPayment.orderId,
        status_code: "200",
        gross_amount: "50000",
        signature_key: "valid-signature",
      });

      expect(response.status).toBe(200);
    });

    it("should handle deny transaction status", async () => {
      midtransService.verifyNotification.mockResolvedValueOnce({
        transaction_status: "deny",
        fraud_status: "deny",
        payment_type: "credit_card",
      });

      const response = await request(app).post("/payment/notification").send({
        order_id: testPayment.orderId,
        status_code: "200",
        gross_amount: "50000",
        signature_key: "valid-signature",
      });

      expect(response.status).toBe(200);

      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.status).toBe("failed");
    });

    it("should handle expired transaction status", async () => {
      midtransService.verifyNotification.mockResolvedValueOnce({
        transaction_status: "expire",
        payment_type: "qris",
      });

      const response = await request(app).post("/payment/notification").send({
        order_id: testPayment.orderId,
        status_code: "200",
        gross_amount: "50000",
        signature_key: "valid-signature",
      });

      expect(response.status).toBe(200);

      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.status).toBe("expired");
    });
  });

  describe("GET /payment/status/:orderId", () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await createTestPayment(testUser._id);
      midtransService.checkTransactionStatus.mockResolvedValue({
        transaction_status: "pending",
      });
      midtransService.mapTransactionStatus.mockImplementation((status) => {
        const map = {
          capture: "success",
          settlement: "success",
          pending: "pending",
          deny: "failed",
          expire: "expired",
          cancel: "failed",
        };
        return map[status] || "pending";
      });
    });

    it("should get payment status successfully", async () => {
      const response = await request(app)
        .get(`/payment/status/${testPayment.orderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(testPayment.orderId);
    });

    it("should return 404 for non-existent order", async () => {
      const response = await request(app)
        .get("/payment/status/non-existent-order")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Payment not found");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get(
        `/payment/status/${testPayment.orderId}`,
      );

      expect(response.status).toBe(401);
    });

    it("should update status if changed and add tokens on success", async () => {
      midtransService.checkTransactionStatus.mockResolvedValueOnce({
        transaction_status: "settlement",
      });

      const initialToken = testUser.token;

      const response = await request(app)
        .get(`/payment/status/${testPayment.orderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.token).toBe(initialToken + testPayment.tokenAmount);
    });
  });

  describe("GET /payment/history", () => {
    beforeEach(async () => {
      await createTestPayment(testUser._id, { orderId: "order-1" });
      await createTestPayment(testUser._id, {
        orderId: "order-2",
        status: "success",
      });
    });

    it("should get payment history successfully", async () => {
      const response = await request(app)
        .get("/payment/history")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/payment/history");

      expect(response.status).toBe(401);
    });

    it("should paginate results", async () => {
      const response = await request(app)
        .get("/payment/history")
        .query({ page: 1, limit: 1 })
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalPages");
      expect(response.body).toHaveProperty("currentPage");
    });

    it("should auto-update expired pending payments", async () => {
      // Create an old pending payment (more than 5 minutes old)
      const oldDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      await Payment.create({
        userId: testUser._id,
        orderId: "old-pending-order",
        packageType: "basic",
        tokenAmount: 50,
        price: 50000,
        status: "pending",
        createdAt: oldDate,
      });

      // Mock that Midtrans says it's expired
      midtransService.checkTransactionStatus.mockResolvedValueOnce({
        transaction_status: "expire",
      });

      const response = await request(app)
        .get("/payment/history")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it("should handle payment not found in Midtrans (mark as expired)", async () => {
      // Create an old pending payment
      const oldDate = new Date(Date.now() - 10 * 60 * 1000);
      await Payment.create({
        userId: testUser._id,
        orderId: "not-found-order",
        packageType: "basic",
        tokenAmount: 50,
        price: 50000,
        status: "pending",
        createdAt: oldDate,
      });

      // Mock 404 error from Midtrans
      midtransService.checkTransactionStatus.mockRejectedValueOnce(
        new Error("Transaction not found 404"),
      );

      const response = await request(app)
        .get("/payment/history")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it("should handle other Midtrans errors gracefully", async () => {
      // Create an old pending payment
      const oldDate = new Date(Date.now() - 10 * 60 * 1000);
      await Payment.create({
        userId: testUser._id,
        orderId: "error-order",
        packageType: "basic",
        tokenAmount: 50,
        price: 50000,
        status: "pending",
        createdAt: oldDate,
      });

      // Mock other error from Midtrans
      midtransService.checkTransactionStatus.mockRejectedValueOnce(
        new Error("Network error"),
      );

      const response = await request(app)
        .get("/payment/history")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /payment/balance", () => {
    it("should get token balance successfully", async () => {
      const response = await request(app)
        .get("/payment/balance")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("tokenBalance");
      expect(response.body.data.tokenBalance).toBe(testUser.token);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get("/payment/balance");

      expect(response.status).toBe(401);
    });

    it("should return 401 if user not found (deleted after token issued)", async () => {
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .get("/payment/balance")
        .set("Authorization", `Bearer ${authToken}`);

      // Auth middleware returns 401 when user not found
      expect(response.status).toBe(401);
    });
  });

  describe("Database error handling", () => {
    let dbTestUser, dbTestToken, dbTestPackage, dbTestPayment;

    beforeEach(async () => {
      const userData = await createTestUser({
        email: `payment-db-test-${Date.now()}@test.com`,
      });
      dbTestUser = userData.user;
      dbTestToken = userData.token;
      // Use unique package type to avoid duplicate key errors
      const uniqueType = `basic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      dbTestPackage = await createTestPackage({
        type: uniqueType,
        name: `Test Package ${uniqueType}`,
      });
      dbTestPayment = await createTestPayment(
        dbTestUser._id,
        dbTestPackage._id,
      );
    });

    it("should handle database error in createPayment", async () => {
      // Payment controller uses Payment.create(), so mock that
      const createSpy = jest
        .spyOn(Payment, "create")
        .mockRejectedValueOnce(new Error("Database save failed"));

      const response = await request(app)
        .post("/payment/create")
        .set("Authorization", `Bearer ${dbTestToken}`)
        .send({ packageId: dbTestPackage._id.toString() });

      expect(response.status).toBe(500);
      createSpy.mockRestore();
    });

    it("should handle database error in checkPaymentStatus", async () => {
      const findOneSpy = jest
        .spyOn(Payment, "findOne")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get(`/payment/status/${dbTestPayment.orderId}`)
        .set("Authorization", `Bearer ${dbTestToken}`);

      expect(response.status).toBe(500);
      findOneSpy.mockRestore();
    });
  });
});
