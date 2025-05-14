// وسيط لالتقاط الأخطاء غير المتزامنة
exports.asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// وسيط للمسارات غير الموجودة
exports.notFound = (req, res, next) => {
  const error = new Error(`المسار غير موجود - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// وسيط لأخطاء التحقق
exports.validationErrorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error) => error.message);
    return res.status(400).json({ errors });
  }
  next(err);
};

// وسيط لأخطاء التكرار (MongoDB)
exports.duplicateErrorHandler = (err, req, res, next) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      message: `قيمة الحقل ${field} موجودة بالفعل`,
    });
  }
  next(err);
};

// وسيط لأخطاء المعرف غير الصالح
exports.invalidIdErrorHandler = (err, req, res, next) => {
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({
      message: "معرف غير صالح",
    });
  }
  next(err);
};

// وسيط للأخطاء العامة
exports.errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    message: err.message || "خطأ في الخادم",
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
};
