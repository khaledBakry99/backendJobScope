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
app.use(helmet()); // أمان HTTP
app.use(cors()); // تمكين CORS

// زيادة حجم الطلب المسموح به لمعالجة البيانات الكبيرة
app.use(express.json({ limit: '50mb' })); // تحليل JSON
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // تحليل بيانات النموذج
app.use(morgan("dev")); // تسجيل الطلبات

// تكوين المجلد الثابت للملفات المحملة
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// مسارات API
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/craftsmen", require("./routes/craftsman.routes"));
app.use("/api/professions", require("./routes/profession.routes"));
app.use("/api/bookings", require("./routes/booking.routes"));
app.use("/api/reviews", require("./routes/review.routes"));
app.use("/api/map", require("./routes/map.routes"));

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
