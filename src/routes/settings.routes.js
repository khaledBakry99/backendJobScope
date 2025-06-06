const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settings.controller');
const { protect, admin } = require('../middleware/auth.middleware');

router.route('/').get(getSettings).put(protect, admin, updateSettings);

module.exports = router;