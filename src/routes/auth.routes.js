const express = require("express");
const { check } = require("express-validator");
const authController = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

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

module.exports = router;
