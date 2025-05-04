const mongoose = require("mongoose");

// دالة للاتصال بقاعدة البيانات MongoDB
const connectDB = async () => {
  try {
    // طباعة معلومات الاتصال للتشخيص (مع إخفاء كلمة المرور)
    const connectionString = process.env.MONGODB_URI;
    const maskedConnectionString = connectionString.replace(
      /mongodb\+srv:\/\/([^:]+):([^@]+)@/,
      'mongodb+srv://$1:****@'
    );

    console.log(`محاولة الاتصال بقاعدة البيانات: ${maskedConnectionString}`);

    // إضافة خيارات إضافية للاتصال
    const options = {
      serverSelectionTimeoutMS: 30000, // زيادة مهلة اختيار الخادم
      socketTimeoutMS: 45000, // زيادة مهلة الاتصال
      family: 4, // استخدام IPv4 فقط
      retryWrites: true,
      w: "majority",
      maxPoolSize: 10, // زيادة حجم تجمع الاتصالات
      connectTimeoutMS: 30000, // زيادة مهلة الاتصال
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`تم الاتصال بقاعدة البيانات MongoDB: ${conn.connection.host}`);
    console.log(`اسم قاعدة البيانات: ${conn.connection.name}`);

    // التحقق من حالة الاتصال
    console.log(`حالة الاتصال: ${mongoose.connection.readyState === 1 ? 'متصل' : 'غير متصل'}`);

    return conn;
  } catch (error) {
    console.error(`خطأ في الاتصال بقاعدة البيانات: ${error.message}`);
    console.error(`تفاصيل الخطأ:`, error);

    // محاولة إعادة الاتصال بعد فترة
    console.log("سيتم محاولة إعادة الاتصال بعد 5 ثوانٍ...");
    setTimeout(() => {
      connectDB();
    }, 5000);
  }
};

module.exports = connectDB;
