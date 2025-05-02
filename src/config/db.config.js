const mongoose = require("mongoose");

// دالة للاتصال بقاعدة البيانات MongoDB
const connectDB = async () => {
  try {
    // إضافة خيارات إضافية للاتصال (تم إزالة الخيارات القديمة)
    const options = {
      serverSelectionTimeoutMS: 30000, // زيادة مهلة اختيار الخادم
      socketTimeoutMS: 45000, // زيادة مهلة الاتصال
      family: 4, // استخدام IPv4 فقط
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`تم الاتصال بقاعدة البيانات MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`خطأ في الاتصال بقاعدة البيانات: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
