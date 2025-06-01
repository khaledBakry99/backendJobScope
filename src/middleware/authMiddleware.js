const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Admin = require("../models/Admin");

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

    // البحث عن المستخدم أو الأدمن بناءً على الدور
    let user;

    if (decoded.role === "admin") {
      // البحث في Admin model
      user = await Admin.findById(decoded.id).select("-password");
      if (user) {
        user.userType = "admin"; // إضافة userType للتوافق
      }
    } else {
      // البحث في User model
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
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
