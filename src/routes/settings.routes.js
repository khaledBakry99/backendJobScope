const express = require("express");
const router = express.Router();
const { getSettings } = require("../controllers/settings.controller");

router.get("/", getSettings);

module.exports = router;
