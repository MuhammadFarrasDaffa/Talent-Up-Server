const express = require("express");
const PaymentController = require("../controllers/PaymentController");
const Authentication = require("../middleware/Authentication");

const router = express.Router();

// Public routes
router.get("/packages", PaymentController.getPackages);
router.post("/notification", PaymentController.handleNotification); // Webhook from Midtrans

// Protected routes (require authentication)

router.post("/create", Authentication, PaymentController.createPayment);
router.get("/status/:orderId", Authentication, PaymentController.checkStatus);
router.get("/history", Authentication, PaymentController.getPaymentHistory);
router.get("/balance", Authentication, PaymentController.getTokenBalance);

module.exports = router;
