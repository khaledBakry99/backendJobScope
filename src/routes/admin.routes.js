const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

// استيراد المتحكمات
const {
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  uploadAdminImage,
  adminLogin
} = require('../controllers/admin.controller');

// استيراد الوسطاء
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// @route   POST /api/admin/login
// @desc    تسجيل دخول الأدمن
// @access  Public
router.post('/login', [
  check('email', 'يرجى إدخال بريد إلكتروني صالح').isEmail(),
  check('password', 'كلمة المرور مطلوبة').exists()
], adminLogin);

// جميع المسارات التالية تتطلب مصادقة الأدمن
router.use(auth);
router.use(authorize('admin'));

// @route   GET /api/admin/profile
// @desc    الحصول على بيانات الأدمن
// @access  Private (Admin only)
router.get('/profile', getAdminProfile);

// @route   PUT /api/admin/profile
// @desc    تحديث بيانات الأدمن
// @access  Private (Admin only)
router.put('/profile', [
  check('name', 'الاسم يجب أن يكون بين 2 و 50 حرف')
    .optional()
    .isLength({ min: 2, max: 50 }),
  check('email', 'يرجى إدخال بريد إلكتروني صالح')
    .optional()
    .isEmail(),
  check('phone', 'يرجى إدخال رقم هاتف صالح')
    .optional()
    .matches(/^[+]?[0-9]{9,15}$/)
], updateAdminProfile);

// @route   PUT /api/admin/password
// @desc    تحديث كلمة مرور الأدمن
// @access  Private (Admin only)
router.put('/password', [
  check('newPassword', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
    .isLength({ min: 6 }),
  check('currentPassword', 'كلمة المرور الحالية مطلوبة')
    .optional()
    .exists()
], updateAdminPassword);

// @route   POST /api/admin/upload-image
// @desc    رفع صورة الأدمن
// @access  Private (Admin only)
router.post('/upload-image', uploadAdminImage);

module.exports = router;
