// وسائط التحقق من الأدوار

// وسيط للتحقق من أن المستخدم هو حرفي
exports.isCraftsman = (req, res, next) => {
  if (!req.user || req.user.userType !== "craftsman") {
    return res.status(403).json({
      message: "هذه العملية متاحة فقط للحرفيين",
    });
  }
  next();
};

// وسيط للتحقق من أن المستخدم هو عميل
exports.isClient = (req, res, next) => {
  if (!req.user || req.user.userType !== "client") {
    return res.status(403).json({
      message: "هذه العملية متاحة فقط للعملاء",
    });
  }
  next();
};

// وسيط للتحقق من أن المستخدم هو مدير
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.userType !== "admin") {
    return res.status(403).json({
      message: "هذه العملية متاحة فقط للمدراء",
    });
  }
  next();
};

// وسيط للتحقق من أن المستخدم هو حرفي أو عميل
exports.isCraftsmanOrClient = (req, res, next) => {
  if (!req.user || (req.user.userType !== "craftsman" && req.user.userType !== "client")) {
    return res.status(403).json({
      message: "هذه العملية متاحة فقط للحرفيين والعملاء",
    });
  }
  next();
};
