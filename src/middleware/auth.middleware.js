const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// وسيط للتحقق من الرمز المميز JWT
exports.protect = async (req, res, next) => {
  let token;

  // التحقق مما إذا كان هناك رمز مميز في الرؤوس
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    // التحقق من وجود الرمز المميز في ملفات تعريف الارتباط
    token = req.cookies.token;
  }

  // التحقق مما إذا كان الرمز المميز موجودًا
  if (!token) {
    return res.status(401).json({
      message: "غير مصرح لك بالوصول إلى هذا المورد",
    });
  }

  try {
    // التحقق من الرمز المميز
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.userType === 'admin') {
      const Admin = require('../models/Admin.js');
      user = await Admin.findById(decoded.id);
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      return res.status(401).json({
        message: "المستخدم لم يعد موجودًا",
      });
    }

    // التحقق مما إذا كان المستخدم نشطًا
    if (!user.isActive) {
      return res.status(401).json({
        message: "تم تعطيل حسابك",
      });
    }

    // التحقق من تاريخ تغيير كلمة المرور لإبطال الجلسات القديمة
    if (user.passwordChangedAt) {
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
    next();
  } catch (error) {
    return res.status(401).json({
      message: "الرمز المميز غير صالح أو منتهي الصلاحية",
    });
  }
};

// وسيط للتحقق من الأدوار
exports.authorize = (...roles) => {
  return (req, res, next) => {
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
