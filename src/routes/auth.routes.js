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
    // Require either email or phone, and validate each if present
    check("email")
      .optional({ nullable: true })
      .isEmail().withMessage("يرجى إدخال بريد إلكتروني صالح"),
    check("phone")
      .optional({ nullable: true })
      .matches(/^\+?\d{7,15}$/).withMessage("يرجى إدخال رقم هاتف صالح"),
    // Custom validator: require at least one of email or phone
    (req, res, next) => {
      if (!req.body.email && !req.body.phone) {
        return res.status(400).json({ message: "يرجى إدخال البريد الإلكتروني أو رقم الهاتف" });
      }
      next();
    },
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

// إنشاء حساب أدمن جديد
router.post(
  "/admin/create",
  [
    check("email", "البريد الإلكتروني مطلوب").isEmail(),
    check("password", "كلمة المرور مطلوبة").isLength({ min: 6 }),
    check("name", "الاسم مطلوب")
      .not()
      .isEmpty(),
  ],
  authController.createAdminAccount
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

// تغيير كلمة مرور الأدمن
router.put(
  "/admin/change-password",
  protect,
  [
    check("currentPassword", "كلمة المرور الحالية مطلوبة")
      .not()
      .isEmpty(),
    check(
      "newPassword",
      "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
    ).isLength({ min: 6 }),
  ],
  authController.changeAdminPassword
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
