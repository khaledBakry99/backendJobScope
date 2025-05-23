const express = require("express");
const router = express.Router();
const {
  getSiteSettings,
  updateSiteSettings,
  getSiteStatus
} = require("../controllers/siteSettings.controller");
const { protect } = require("../middleware/auth.middleware");

// @route   GET /api/site-settings
// @desc    Get site settings
// @access  Public
router.get("/", getSiteSettings);

// @route   PUT /api/site-settings
// @desc    Update site settings
// @access  Admin only
router.put("/", protect, updateSiteSettings);

// @route   GET /api/site-settings/status
// @desc    Get site status
// @access  Public
router.get("/status", getSiteStatus);

module.exports = router;
