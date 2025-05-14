const express = require('express');
const { check } = require('express-validator');
const requestController = require('../controllers/request.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadMultipleImages } = require('../middleware/upload.middleware');

const router = express.Router();

// جميع المسارات تتطلب المصادقة
router.use(protect);

// إنشاء طلب جديد
router.post(
  '/',
  [
    check('craftsmanId', 'معرف الحرفي مطلوب').notEmpty(),
    check('service', 'وصف الخدمة مطلوب').notEmpty(),
    check('description', 'وصف المشكلة مطلوب').notEmpty(),
    check('location', 'الموقع مطلوب').notEmpty(),
    check('location.address', 'العنوان مطلوب').notEmpty(),
    check('location.lat', 'خط العرض مطلوب').isNumeric(),
    check('location.lng', 'خط الطول مطلوب').isNumeric(),
    check('preferredDates', 'التواريخ المفضلة مطلوبة').isArray({ min: 1 }),
    check('preferredDates.*.date', 'التاريخ مطلوب').notEmpty(),
    check('preferredDates.*.timeFrom', 'وقت البدء مطلوب').notEmpty(),
    check('preferredDates.*.timeTo', 'وقت الانتهاء مطلوب').notEmpty(),
  ],
  requestController.createRequest
);

// الحصول على طلبات العميل
router.get('/client', requestController.getClientRequests);

// الحصول على طلبات الحرفي
router.get('/craftsman', authorize('craftsman'), requestController.getCraftsmanRequests);

// الحصول على تفاصيل طلب
router.get('/:id', requestController.getRequestDetails);

// تحديث حالة الطلب
router.put(
  '/:id/status',
  [
    check('status', 'الحالة مطلوبة').isIn([
      'pending',
      'accepted',
      'rejected',
      'completed',
      'cancelled',
    ]),
  ],
  requestController.updateRequestStatus
);

// إضافة تقييم ومراجعة للطلب
router.put(
  '/:id/review',
  [
    check('rating', 'التقييم مطلوب').isInt({ min: 1, max: 5 }),
    check('review', 'المراجعة مطلوبة').notEmpty(),
  ],
  requestController.addReview
);

// تعديل طلب
router.put(
  '/:id',
  [
    check('service', 'وصف الخدمة مطلوب').optional().notEmpty(),
    check('description', 'وصف المشكلة مطلوب').optional().notEmpty(),
    check('location', 'الموقع مطلوب').optional().notEmpty(),
    check('location.address', 'العنوان مطلوب').optional().notEmpty(),
    check('location.lat', 'خط العرض مطلوب').optional().isNumeric(),
    check('location.lng', 'خط الطول مطلوب').optional().isNumeric(),
    check('preferredDates', 'التواريخ المفضلة مطلوبة').optional().isArray({ min: 1 }),
  ],
  requestController.updateRequest
);

// حذف طلب
router.delete('/:id', requestController.deleteRequest);

// رفع صور للطلب
router.post(
  '/upload-images',
  uploadMultipleImages('requestImages', 5),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'لم يتم رفع أي صور' });
    }

    const imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
    res.json({ imageUrls });
  }
);

module.exports = router;
