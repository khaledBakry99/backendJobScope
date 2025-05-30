const express = require("express");
const { check } = require("express-validator");
const authController = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

console.log("تم تحميل ملف auth.routes.js");

const router = express.Router();

// تسجيل الدخول
router.post(
  "/login",
  (req, res, next) => {
    console.log("وصل طلب POST /api/auth/login إلى الراوتر");
    next();
  },
  authController.login
);

// تسجيل مستخدم جديد
router.post(
  "/register",
  [
    check("name", "الاسم مطلوب")
      .not()
      .isEmpty(),
    check("email", "يرجى إدخال بريد إلكتروني صالح").isEmail(),
    check("password", "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل").isLength({
      min: 6,
    }),
    check("userType", "نوع المستخدم مطلوب").isIn(["client", "craftsman"]),
  ],
  authController.register
);

// تسجيل الدخول
router.post(
  "/login",
  [
    check("email", "يرجى إدخال بريد إلكتروني أو رقم هاتف صالح").exists(),
    check("password", "كلمة المرور مطلوبة").exists(),
  ],
  authController.login
);

// تسجيل الدخول كمدير
router.post(
  "/admin/login",
  [
    check("username", "اسم المستخدم مطلوب")
      .not()
      .isEmpty(),
    check("password", "كلمة المرور مطلوبة").exists(),
  ],
  authController.adminLogin
);

// الحصول على المستخدم الحالي
router.get("/me", protect, authController.getCurrentUser);

// التحقق من وجود البريد الإلكتروني
router.get("/check-email", authController.checkEmailExists);

// التحقق من وجود رقم الهاتف
router.get("/check-phone", authController.checkPhoneExists);

// إرسال رمز التحقق إلى البريد الإلكتروني
router.post("/send-otp-email", authController.sendOtpToEmail);

// إرسال رمز التحقق إلى رقم الهاتف
router.post("/send-otp-phone", authController.sendOtpToPhone);

// التحقق من صحة رمز التحقق
router.post("/verify-otp", authController.verifyOtp);

// تسجيل مستخدم تم إنشاؤه باستخدام Firebase
router.post("/register-firebase", authController.registerFirebaseUser);

// اختبار اتصال خدمة الرسائل النصية
router.get("/test-sms", authController.testSMSConnection);

// إرسال رسالة اختبار
router.post("/send-test-sms", authController.sendTestSMS);

// الحصول على رصيد الحساب
router.get("/sms-balance", authController.getSMSBalance);

module.exports = router;
