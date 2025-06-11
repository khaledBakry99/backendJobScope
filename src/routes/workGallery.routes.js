const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { isCraftsman } = require("../middleware/roleMiddleware");
const workGalleryController = require("../controllers/workGallery.controller");

// مسارات معرض الأعمال

// الحصول على معرض أعمال حرفي محدد (عام - لا يحتاج مصادقة)
router.get("/craftsman/:craftsmanId", workGalleryController.getWorkGallery);

// الحصول على معرض أعمال الحرفي الحالي (يحتاج مصادقة)
router.get(
  "/my-gallery",
  protect,
  isCraftsman,
  workGalleryController.getMyWorkGallery
);

// إضافة صور إلى معرض الأعمال (يحتاج مصادقة كحرفي)
router.post(
  "/add",
  protect,
  isCraftsman,
  workGalleryController.addToWorkGallery
);

// حذف صورة من معرض الأعمال (يحتاج مصادقة كحرفي)
router.delete(
  "/remove",
  protect,
  isCraftsman,
  workGalleryController.removeFromWorkGallery
);

// تحديث ترتيب الصور في معرض الأعمال (يحتاج مصادقة كحرفي)
router.put(
  "/reorder",
  protect,
  isCraftsman,
  workGalleryController.reorderWorkGallery
);

// مسح معرض الأعمال بالكامل (يحتاج مصادقة كحرفي)
router.delete(
  "/clear",
  protect,
  isCraftsman,
  workGalleryController.clearWorkGallery
);

module.exports = router;
