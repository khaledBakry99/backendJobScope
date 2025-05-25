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
    let decoded;
    let user;

    // التحقق من نوع الرمز المميز
    if (token.startsWith('eyJ')) {
      // محاولة فك تشفير رمز Supabase JWT
      try {
        decoded = jwt.decode(token); // فك تشفير بدون تحقق للرموز من Supabase

        if (decoded && decoded.sub) {
          // البحث عن المستخدم باستخدام Supabase UID
          user = await User.findOne({
            $or: [
              { supabaseUid: decoded.sub },
              { _id: decoded.sub }
            ]
          }).select("-password");
        }
      } catch (supabaseError) {
        console.log("فشل في فك تشفير رمز Supabase، جاري المحاولة كرمز JWT عادي");
      }
    }

    // إذا لم ينجح Supabase، جرب JWT العادي
    if (!user) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.id).select("-password");
      } catch (jwtError) {
        console.log("فشل في التحقق من JWT العادي");
      }
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

    // إضافة المستخدم إلى الطلب
    req.user = user;
    next();
  } catch (error) {
    console.error("خطأ في التحقق من الرمز المميز:", error);
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
