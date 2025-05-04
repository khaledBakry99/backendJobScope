const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");

// تحميل متغيرات البيئة
dotenv.config();

// استيراد الاتصال بقاعدة البيانات
const connectDB = require("./config/db.config");

// استيراد وسائط الخطأ
const { notFound, errorHandler } = require("./middleware/error.middleware");

// إنشاء تطبيق Express
const app = express();

// اتصال بقاعدة البيانات
connectDB();

// الوسائط
// تكوين Helmet مع السماح بالصور من مصادر مختلفة
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// تكوين CORS للسماح بالوصول من أي مصدر
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 200,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// زيادة حجم الطلب المسموح به لمعالجة البيانات الكبيرة
app.use(express.json({ limit: "50mb" })); // تحليل JSON
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // تحليل بيانات النموذج
app.use(morgan("dev")); // تسجيل الطلبات

// تكوين المجلد الثابت للملفات المحملة
const uploadsPath = path.join(__dirname, "../uploads");
console.log("Serving uploads from:", uploadsPath);

// إضافة رؤوس CORS للملفات المحملة
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
}, express.static(uploadsPath));

// التأكد من وجود مجلد التحميل
const fs = require("fs");
if (!fs.existsSync(uploadsPath)) {
  console.log("Creating uploads directory");
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// مسارات API
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/craftsmen", require("./routes/craftsman.routes"));
app.use("/api/professions", require("./routes/profession.routes"));
app.use("/api/bookings", require("./routes/booking.routes"));
app.use("/api/reviews", require("./routes/review.routes"));
app.use("/api/map", require("./routes/map.routes"));
app.use("/api/requests", require("./routes/request.routes"));

// مسار الاختبار
app.get("/", (req, res) => {
  res.json({ message: "مرحبًا بك في واجهة برمجة تطبيق JobScope" });
});

// وسائط معالجة الأخطاء
app.use(notFound);
app.use(errorHandler);

// تحديد المنفذ
const PORT = process.env.PORT || 5000;

// بدء الخادم
app.listen(PORT, () => {
  console.log(
    `الخادم يعمل في البيئة ${process.env.NODE_ENV} على المنفذ ${PORT}`
  );
});
