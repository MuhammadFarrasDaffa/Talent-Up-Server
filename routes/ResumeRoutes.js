const express = require("express");
const router = express.Router();
const multer = require("multer");
const ResumeController = require("../controllers/ResumeController");
const authentication = require("../middleware/Authentication");

// Konfigurasi Multer: Simpan file di Memory (RAM) sementara
// Kita tidak perlu simpan di disk karena tujuannya cuma mau diambil teksnya
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Max 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported"), false);
    }
  },
});

// URL: /resume/parse
// 'resume' adalah nama field key di form-data nanti
// Authentication required untuk keamanan
router.post(
  "/parse",
  authentication,
  upload.single("resume"),
  ResumeController.parseResume,
);

// URL: /api/v1/resume/save-to-profile
// Save parsed CV data to user profile
router.post("/save-to-profile", authentication, ResumeController.saveToProfile);

module.exports = router;
