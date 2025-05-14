const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const colors = require('colors');
const { errorHandler } = require('./middleware/errorMiddleware');
const connectDB = require('./config/db');
const path = require('path');

// تحميل متغيرات البيئة
dotenv.config();

// اتصال بقاعدة البيانات
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS
app.use(cors());

// مجلد التحميلات
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// مسارات API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/craftsmen', require('./routes/craftsmanRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/professions', require('./routes/professionRoutes'));
app.use('/api/specializations', require('./routes/specializationRoutes'));
app.use('/api/site-settings', require('./routes/siteSettingsRoutes'));
app.use('/api', require('./routes/workingHoursRoutes')); // إضافة مسارات ساعات العمل

// معالج الأخطاء
app.use(errorHandler);

// تشغيل الخادم
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`.yellow.bold);
});
