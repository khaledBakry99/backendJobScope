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

// استيراد تكوين Supabase
const { testSupabaseConnection } = require("./config/supabase.config");

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
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

// تكوين CORS للسماح بالوصول من أي مصدر
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://jobscope-8t58.onrender.com",
      "http://localhost:5173",
      "https://cinemaity.cinemaity.com",
    ],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Origin",
      "X-Requested-With",
      "Accept",
      "X-Client-Info",
    ],
    exposedHeaders: ["Content-Length", "Content-Range"],
  })
);

// إضافة رؤوس CORS يدويًا لجميع الطلبات للتأكيد
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://jobscope-8t58.onrender.com",
    "http://localhost:5173",
    "https://cinemaity.cinemaity.com",
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Info"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  res.header("Access-Control-Expose-Headers", "Content-Length, Content-Range");

  // معالجة طلبات OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

// زيادة حجم الطلب المسموح به لمعالجة البيانات الكبيرة
app.use(express.json({ limit: "50mb" })); // تحليل JSON
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // تحليل بيانات النموذج
app.use(morgan("dev")); // تسجيل الطلبات

// تكوين المجلد الثابت للملفات المحملة
const uploadsPath = path.join(__dirname, "../uploads");
console.log("Serving uploads from:", uploadsPath);

// إضافة رؤوس CORS للملفات المحملة
app.use(
  "/uploads",
  (req, res, next) => {
    const allowedOrigins = [
      "http://localhost:3000",
      "https://jobscope-8t58.onrender.com",
      "http://localhost:5173",
      "https://cinemaity.cinemaity.com",
    ];
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    } else {
      res.header("Access-Control-Allow-Origin", "*");
    }

    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    res.header("Cross-Origin-Embedder-Policy", "credentialless");
    res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

    // معالجة طلبات OPTIONS
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    // معالجة الخطأ
    try {
      next();
    } catch (error) {
      console.error("Error serving static file:", error);
      res.status(404).send("File not found");
    }
  },
  express.static(uploadsPath, {
    fallthrough: false, // إرجاع خطأ 404 بدلاً من الاستمرار
    setHeaders: (res, path) => {
      res.set("Cache-Control", "public, max-age=31536000"); // تخزين مؤقت لمدة سنة

      // No establecemos Access-Control-Allow-Origin aquí porque ya lo hicimos en el middleware anterior
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

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
app.use("/api/working-hours", require("./routes/workingHours.routes"));

// مسار الاختبار
app.get("/", (_req, res) => {
  res.json({ message: "مرحبًا بك في واجهة برمجة تطبيق JobScope" });
});

// وسائط معالجة الأخطاء
app.use(notFound);
app.use(errorHandler);

// تحديد المنفذ
const PORT = process.env.PORT || 5000;

// استيراد مجدول المهام
const { startCronJobs } = require("./cron/bookingCron");

// بدء الخادم
app.listen(PORT, async () => {
  console.log(
    `الخادم يعمل في البيئة ${process.env.NODE_ENV} على المنفذ ${PORT}`
  );
  console.log(`CORS مفعل للسماح بالوصول من أي مصدر`);

  // اختبار اتصال Supabase
  console.log("🔄 اختبار اتصال Supabase...");
  await testSupabaseConnection();

  // بدء تشغيل مجدول المهام
  startCronJobs();
  console.log("تم بدء تشغيل مجدول المهام لتحديث الطلبات المنتهية");
});
