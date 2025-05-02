# JobScope Backend API

هذا هو الواجهة الخلفية (Backend) لتطبيق JobScope، منصة تربط بين طالبي الخدمة والحرفيين في سوريا.

## التقنيات المستخدمة

- **Node.js**: بيئة تشغيل JavaScript
- **Express.js**: إطار عمل لبناء واجهات برمجة التطبيقات (API)
- **MongoDB**: قاعدة بيانات NoSQL
- **Mongoose**: مكتبة نمذجة البيانات لـ MongoDB
- **JWT**: JSON Web Tokens للمصادقة
- **bcryptjs**: لتشفير كلمات المرور
- **Multer**: لتحميل الملفات

## متطلبات التشغيل

- Node.js (الإصدار 14 أو أحدث)
- MongoDB (محلي أو Atlas)

## التثبيت

1. قم بتثبيت الاعتماديات:
   ```bash
   npm install
   ```

2. قم بإنشاء ملف `.env` في المجلد الرئيسي للمشروع وأضف المتغيرات البيئية التالية:
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/jobscope
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```

3. قم بإضافة البيانات الافتراضية (اختياري):
   ```bash
   npm run seed
   ```

## تشغيل الخادم

- للتطوير:
  ```bash
  npm run dev
  ```

- للإنتاج:
  ```bash
  npm start
  ```

## هيكل المشروع

```
backend/
├── src/                  # مصدر الكود
│   ├── config/           # ملفات التكوين
│   ├── controllers/      # وحدات التحكم
│   ├── middleware/       # الوسائط
│   ├── models/           # نماذج البيانات
│   ├── routes/           # مسارات API
│   ├── services/         # الخدمات
│   ├── utils/            # الأدوات المساعدة
│   └── server.js         # نقطة الدخول للخادم
├── uploads/              # مجلد الملفات المحملة
├── .env                  # متغيرات البيئة
└── package.json          # تبعيات المشروع
```

## نقاط النهاية API

### المصادقة

- `POST /api/auth/register`: تسجيل مستخدم جديد
- `POST /api/auth/login`: تسجيل الدخول
- `POST /api/auth/admin/login`: تسجيل دخول المدير
- `GET /api/auth/me`: الحصول على بيانات المستخدم الحالي

### المستخدمين

- `GET /api/users/me`: الحصول على الملف الشخصي للمستخدم الحالي
- `PUT /api/users/me`: تحديث الملف الشخصي
- `PUT /api/users/change-password`: تغيير كلمة المرور
- `PUT /api/users/deactivate`: تعطيل الحساب
- `POST /api/users/upload-profile-image`: تحميل صورة الملف الشخصي

### الحرفيين

- `GET /api/craftsmen`: الحصول على جميع الحرفيين
- `GET /api/craftsmen/:id`: الحصول على حرفي بواسطة المعرف
- `POST /api/craftsmen/search`: البحث عن الحرفيين
- `GET /api/craftsmen/me/profile`: الحصول على الملف الشخصي للحرفي الحالي
- `PUT /api/craftsmen/me/profile`: تحديث الملف الشخصي للحرفي
- `PUT /api/craftsmen/me/gallery`: تحديث معرض الأعمال
- `PUT /api/craftsmen/me/availability`: تحديث حالة التوفر
- `POST /api/craftsmen/me/upload-gallery`: تحميل صور لمعرض الأعمال

### الحجوزات

- `POST /api/bookings`: إنشاء حجز جديد
- `GET /api/bookings/me`: الحصول على حجوزات المستخدم الحالي
- `GET /api/bookings/:id`: الحصول على حجز بواسطة المعرف
- `PUT /api/bookings/:id/status`: تحديث حالة الحجز
- `PUT /api/bookings/:id`: تعديل حجز

### التقييمات

- `POST /api/reviews`: إنشاء تقييم جديد
- `GET /api/reviews/craftsman/:craftsmanId`: الحصول على تقييمات حرفي
- `GET /api/reviews/craftsman/:craftsmanId/ratings`: الحصول على تقييمات مفصلة لحرفي
- `GET /api/reviews/:id`: الحصول على تقييم بواسطة المعرف
- `POST /api/reviews/upload-images`: تحميل صور للتقييم

### المهن

- `GET /api/professions`: الحصول على جميع المهن
- `GET /api/professions/:id`: الحصول على مهنة بواسطة المعرف

### الإشعارات

- `GET /api/notifications/me`: الحصول على إشعارات المستخدم الحالي
- `PUT /api/notifications/:id/read`: تعليم إشعار كمقروء
- `PUT /api/notifications/read-all`: تعليم جميع الإشعارات كمقروءة
- `DELETE /api/notifications/:id`: حذف إشعار

### الخرائط

- `GET /api/map/streets-in-radius`: الحصول على الشوارع والمستشفيات والمساجد ضمن نطاق معين
- `GET /api/map/neighborhoods-in-radius`: الحصول على الأحياء ضمن نطاق معين
