const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const workingHoursController = require("../controllers/workingHours.controller");
const { protect } = require("../middleware/authMiddleware");
const { isCraftsman } = require("../middleware/roleMiddleware");

// مسار تحديث ساعات العمل للحرفي
router.put(
  "/",
  protect,
  isCraftsman,
  [
    body("workingHours")
      .isObject()
      .withMessage("يجب أن تكون ساعات العمل كائن صالح"),
  ],
  workingHoursController.updateWorkingHours
);

// مسار الحصول على ساعات العمل للحرفي الحالي
router.get("/", protect, isCraftsman, workingHoursController.getWorkingHours);

// مسار الحصول على ساعات العمل لحرفي محدد بواسطة معرفه
router.get(
  "/craftsman/:craftsmanId",
  workingHoursController.getCraftsmanWorkingHours
);

module.exports = router;
