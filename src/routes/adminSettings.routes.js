const express = require('express');
const router = express.Router();
const { updateSettings } = require('../controllers/settings.controller');
const { protect } = require('../middleware/authMiddleware.js');
const { isAdmin } = require('../middleware/roleMiddleware.js');

router.put('/', protect, isAdmin, updateSettings);

module.exports = router;