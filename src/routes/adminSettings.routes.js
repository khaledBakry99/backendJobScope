const express = require('express');
const router = express.Router();
const { updateSettings } = require('../controllers/settings.controller');
const { protect, admin } = require('../middleware/auth.middleware');

router.put('/', protect, admin, updateSettings);

module.exports = router;