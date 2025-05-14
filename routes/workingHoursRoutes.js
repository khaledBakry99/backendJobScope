const express = require('express');
const router = express.Router();
const { protect, craftsman } = require('../middleware/authMiddleware');
const {
  getCraftsmanWorkingHours,
  updateCraftsmanWorkingHours
} = require('../controllers/workingHoursController');

// مسارات ساعات العمل
router.get('/craftsmen/:id/working-hours', getCraftsmanWorkingHours);
router.put('/craftsmen/:id/working-hours', protect, craftsman, updateCraftsmanWorkingHours);

module.exports = router;
