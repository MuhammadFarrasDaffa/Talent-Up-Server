const express = require("express");
const router = express.Router();

const JobController = require("../controllers/JobController");
const authentication = require("../middleware/Authentication");

router.get("/", JobController.getAllJobs);

router.get("/:id", JobController.getJobById);

// Protected route - requires authentication
router.post("/:id/match", authentication, JobController.analyzeJobMatch);

module.exports = router;
