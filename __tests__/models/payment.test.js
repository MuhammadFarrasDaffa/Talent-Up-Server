const mongoose = require("mongoose");
const Payment = require("../../models/Payment");

describe("Payment Model", () => {
  const validPaymentData = {
    userId: new mongoose.Types.ObjectId(),
    orderId: "ORDER-123-456",
    packageType: "basic",
    tokenAmount: 50,
    price: 50000,
  };

  describe("Schema validation", () => {
    it("should create payment with required fields", async () => {
      const payment = await Payment.create(validPaymentData);

      expect(payment._id).toBeDefined();
      expect(payment.orderId).toBe("ORDER-123-456");
      expect(payment.packageType).toBe("basic");
      expect(payment.tokenAmount).toBe(50);
      expect(payment.price).toBe(50000);
      expect(payment.status).toBe("pending"); // default
    });

    it("should fail without userId", async () => {
      const data = { ...validPaymentData };
      delete data.userId;

      await expect(Payment.create(data)).rejects.toThrow();
    });

    it("should fail without orderId", async () => {
      const data = { ...validPaymentData };
      delete data.orderId;

      await expect(Payment.create(data)).rejects.toThrow();
    });

    it("should fail without packageType", async () => {
      const data = { ...validPaymentData };
      delete data.packageType;

      await expect(Payment.create(data)).rejects.toThrow();
    });

    it("should fail without tokenAmount", async () => {
      const data = { ...validPaymentData };
      delete data.tokenAmount;

      await expect(Payment.create(data)).rejects.toThrow();
    });

    it("should fail without price", async () => {
      const data = { ...validPaymentData };
      delete data.price;

      await expect(Payment.create(data)).rejects.toThrow();
    });

    it("should enforce unique orderId", async () => {
      await Payment.create(validPaymentData);

      await expect(Payment.create(validPaymentData)).rejects.toThrow();
    });
  });

  describe("Package type enum", () => {
    it("should accept basic package type", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-basic",
        packageType: "basic",
      });

      expect(payment.packageType).toBe("basic");
    });

    it("should accept pro package type", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-pro",
        packageType: "pro",
      });

      expect(payment.packageType).toBe("pro");
    });

    it("should accept premium package type", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-premium",
        packageType: "premium",
      });

      expect(payment.packageType).toBe("premium");
    });

    it("should reject invalid package type", async () => {
      await expect(
        Payment.create({
          ...validPaymentData,
          orderId: "ORDER-invalid",
          packageType: "invalid",
        }),
      ).rejects.toThrow();
    });
  });

  describe("Status enum", () => {
    it("should default to pending status", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-default-status",
      });

      expect(payment.status).toBe("pending");
    });

    it("should accept success status", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-success",
        status: "success",
      });

      expect(payment.status).toBe("success");
    });

    it("should accept failed status", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-failed",
        status: "failed",
      });

      expect(payment.status).toBe("failed");
    });

    it("should accept expired status", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-expired",
        status: "expired",
      });

      expect(payment.status).toBe("expired");
    });

    it("should reject invalid status", async () => {
      await expect(
        Payment.create({
          ...validPaymentData,
          orderId: "ORDER-invalid-status",
          status: "invalid",
        }),
      ).rejects.toThrow();
    });
  });

  describe("Midtrans fields", () => {
    it("should store Snap token", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-snap",
        snapToken: "snap-token-12345",
      });

      expect(payment.snapToken).toBe("snap-token-12345");
    });

    it("should store redirect URL", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-redirect",
        snapRedirectUrl: "https://app.sandbox.midtrans.com/snap/test",
      });

      expect(payment.snapRedirectUrl).toBe(
        "https://app.sandbox.midtrans.com/snap/test",
      );
    });

    it("should store transaction ID", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-trans",
        transactionId: "trans-12345",
      });

      expect(payment.transactionId).toBe("trans-12345");
    });

    it("should store payment type", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-type",
        paymentType: "qris",
      });

      expect(payment.paymentType).toBe("qris");
    });

    it("should store Midtrans response object", async () => {
      const midtransResponse = {
        transaction_status: "settlement",
        payment_type: "qris",
        gross_amount: "50000",
      };

      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-response",
        midtransResponse,
      });

      expect(payment.midtransResponse).toEqual(midtransResponse);
    });
  });

  describe("Timestamps", () => {
    it("should have createdAt timestamp", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-created",
      });

      expect(payment.createdAt).toBeDefined();
      expect(payment.createdAt).toBeInstanceOf(Date);
    });

    it("should have updatedAt timestamp", async () => {
      const payment = await Payment.create({
        ...validPaymentData,
        orderId: "ORDER-updated",
      });

      expect(payment.updatedAt).toBeDefined();
      expect(payment.updatedAt).toBeInstanceOf(Date);
    });
  });
});
