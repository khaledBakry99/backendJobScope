const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

// استيراد المتحكمات
const {
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  uploadAdminImage,
  adminLogin,
  // الإحصائيات
  getDashboardStats,
  // إدارة المستخدمين
  getAllUsers,
  updateUser,
  deleteUser,
  // إدارة الحرفيين
  getAllCraftsmen,
  updateCraftsman,
  deleteCraftsman,
  // إدارة الحجوزات
  getAllBookings,
  updateBookingStatus,
  processExpiredBookings,
} = require("../controllers/admin.controller");

// استيراد الوسطاء
const { protect, admin } = require("../middleware/auth.middleware.js");

// @route   POST /api/admin/login
// @desc    تسجيل دخول الأدمن
// @access  Public
router.post(
  "/login",
  [
    check("email", "يرجى إدخال بريد إلكتروني صالح").isEmail(),
    check("password", "كلمة المرور مطلوبة").exists(),
  ],
  adminLogin
);

// جميع المسارات التالية تتطلب مصادقة الأدمن
router.use(protect);
router.use(admin);

// @route   GET /api/admin/profile
// @desc    الحصول على بيانات الأدمن
// @access  Private (Admin only)
router.get("/profile", getAdminProfile);

// @route   PUT /api/admin/profile
// @desc    تحديث بيانات الأدمن
// @access  Private (Admin only)
router.put(
  "/profile",
  [
    check("name", "الاسم يجب أن يكون بين 2 و 50 حرف")
      .optional()
      .isLength({ min: 2, max: 50 }),
    check("email", "يرجى إدخال بريد إلكتروني صالح")
      .optional()
      .isEmail(),
    check("phone", "يرجى إدخال رقم هاتف صالح")
      .optional()
      .matches(/^[+]?[0-9]{9,15}$/),
  ],
  updateAdminProfile
);

// @route   PUT /api/admin/password
// @desc    تحديث كلمة مرور الأدمن
// @access  Private (Admin only)
router.put(
  "/password",
  [
    check(
      "newPassword",
      "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
    ).isLength({ min: 6 }),
    check("currentPassword", "كلمة المرور الحالية مطلوبة")
      .optional()
      .exists(),
  ],
  updateAdminPassword
);

// @route   POST /api/admin/upload-image
// @desc    رفع صورة الأدمن
// @access  Private (Admin only)
router.post("/upload-image", uploadAdminImage);

// ===== مسارات الإحصائيات =====

// @route   GET /api/admin/stats
// @desc    الحصول على إحصائيات لوحة التحكم
// @access  Private (Admin only)
router.get("/stats", getDashboardStats);

// ===== مسارات إدارة المستخدمين =====

// @route   GET /api/admin/users
// @desc    الحصول على جميع المستخدمين
// @access  Private (Admin only)
router.get("/users", getAllUsers);

// @route   PUT /api/admin/users/:userId
// @desc    تحديث مستخدم
// @access  Private (Admin only)
router.put("/users/:userId", updateUser);

// @route   DELETE /api/admin/users/:userId
// @desc    حذف مستخدم
// @access  Private (Admin only)
router.delete("/users/:userId", deleteUser);

// ===== مسارات إدارة الحرفيين =====

// @route   GET /api/admin/craftsmen
// @desc    الحصول على جميع الحرفيين
// @access  Private (Admin only)
router.get("/craftsmen", getAllCraftsmen);

// @route   PUT /api/admin/craftsmen/:craftsmanId
// @desc    تحديث حرفي
// @access  Private (Admin only)
router.put("/craftsmen/:craftsmanId", updateCraftsman);

// @route   DELETE /api/admin/craftsmen/:craftsmanId
// @desc    حذف حرفي
// @access  Private (Admin only)
router.delete("/craftsmen/:craftsmanId", deleteCraftsman);

// ===== مسارات إدارة الحجوزات =====

// @route   GET /api/admin/bookings
// @desc    الحصول على جميع الحجوزات
// @access  Private (Admin only)
router.get("/bookings", getAllBookings);

// @route   PUT /api/admin/bookings/:bookingId/status
// @desc    تحديث حالة الحجز
// @access  Private (Admin only)
router.put("/bookings/:bookingId/status", updateBookingStatus);

// @route   POST /api/admin/bookings/process-expired
// @desc    معالجة الحجوزات المنتهية الصلاحية
// @access  Private (Admin only)
router.post("/bookings/process-expired", processExpiredBookings);

module.exports = router;
