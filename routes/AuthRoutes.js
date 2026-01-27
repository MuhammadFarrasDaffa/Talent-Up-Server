const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");

// Manual Auth
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// Google OAuth
router.post("/google", AuthController.googleAuth);

module.exports = router;
