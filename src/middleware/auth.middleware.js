const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// وسيط للتحقق من الرمز المميز JWT
exports.protect = async (req, res, next) => {
  let token;

  console.log("protect middleware - بدء التحقق من المصادقة:", {
    path: req.originalUrl,
    method: req.method,
    headers: {
      authorization: req.headers.authorization ? "موجود" : "غير موجود",
      cookie: req.headers.cookie ? "موجود" : "غير موجود",
    },
  });

  // التحقق مما إذا كان هناك رمز مميز في الرؤوس
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    console.log(
      "protect middleware - تم العثور على التوكن في Authorization header"
    );
  } else if (req.cookies && req.cookies.token) {
    // التحقق من وجود الرمز المميز في ملفات تعريف الارتباط
    token = req.cookies.token;
    console.log("protect middleware - تم العثور على التوكن في cookies");
  }

  // التحقق مما إذا كان الرمز المميز موجودًا
  if (!token) {
    console.log("protect middleware - لا يوجد توكن");
    return res.status(401).json({
      message: "غير مصرح لك بالوصول إلى هذا المورد",
    });
  }

  try {
    console.log("protect middleware - محاولة التحقق من التوكن");
    // التحقق من الرمز المميز
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("protect middleware - تم فك تشفير التوكن بنجاح:", {
      id: decoded.id,
      userType: decoded.userType,
      role: decoded.role,
    });

    let user;
    // التحقق من الأدمن بناءً على userType أو role
    if (decoded.userType === "admin" || decoded.role === "admin") {
      const Admin = require("../models/Admin.js");
      user = await Admin.findById(decoded.id);
      if (user) {
        user.userType = "admin"; // إضافة userType للتوافق
      }
    } else {
      console.log(
        "protect middleware - البحث عن مستخدم عادي بالمعرف:",
        decoded.id
      );
      user = await User.findById(decoded.id).select("-password");
      if (user) {
        console.log("protect middleware - تم العثور على المستخدم:", {
          id: user._id,
          name: user.name,
          userType: user.userType,
        });
      }
    }

    if (!user) {
      console.log("protect middleware - لم يتم العثور على المستخدم");
      return res.status(401).json({
        message: "المستخدم لم يعد موجودًا",
      });
    }

    // التحقق مما إذا كان المستخدم نشطًا (فقط للمستخدمين العاديين)
    if (user.userType !== "admin" && !user.isActive) {
      return res.status(401).json({
        message: "تم تعطيل حسابك",
      });
    }

    // التحقق من تاريخ تغيير كلمة المرور لإبطال الجلسات القديمة (فقط للمستخدمين العاديين)
    if (user.userType !== "admin" && user.passwordChangedAt) {
      const tokenIssuedAt = new Date(decoded.iat * 1000); // تحويل من Unix timestamp إلى Date
      if (user.passwordChangedAt > tokenIssuedAt) {
        return res.status(401).json({
          message: "تم تغيير كلمة المرور. يرجى تسجيل الدخول مرة أخرى",
          requireReauth: true,
        });
      }
    }

    // إضافة المستخدم إلى الطلب
    req.user = user;
    console.log("protect middleware - تم تعيين req.user بنجاح:", {
      id: req.user._id,
      name: req.user.name,
      userType: req.user.userType,
    });
    next();
  } catch (error) {
    console.error(
      "protect middleware - خطأ في التحقق من التوكن:",
      error.message
    );
    return res.status(401).json({
      message: "الرمز المميز غير صالح أو منتهي الصلاحية",
      error: error.message,
    });
  }
};

// وسيط للتحقق من الأدوار
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // التحقق من وجود req.user أولاً
    if (!req.user) {
      console.error("authorize middleware: req.user غير معرف");
      return res.status(401).json({
        message: "غير مصرح لك بالوصول إلى هذا المورد",
        error: "req.user is undefined in authorize middleware",
      });
    }

    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({
        message: `الدور ${req.user.userType} غير مصرح له بالوصول إلى هذا المورد`,
      });
    }
    next();
  };
};

// وسيط للتحقق من أن المستخدم هو مسؤول
exports.admin = (req, res, next) => {
  if (req.user && req.user.userType === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};
