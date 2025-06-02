const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const multer = require('multer');
const path = require('path');

// إعداد multer لرفع الصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/admin/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'admin-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف صورة'), false);
    }
  }
});

// الحصول على بيانات الأدمن
exports.getAdminProfile = asyncHandler(async (req, res) => {
  try {
    // البحث عن الأدمن باستخدام المعرف من التوكن
    const admin = await Admin.findById(req.user.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'الأدمن غير موجود' });
    }

    res.json(admin);
  } catch (error) {
    console.error('خطأ في الحصول على بيانات الأدمن:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// تحديث بيانات الأدمن
exports.updateAdminProfile = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, phone, image } = req.body;

    // البحث عن الأدمن
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'الأدمن غير موجود' });
    }

    // التحقق من عدم وجود بريد إلكتروني مكرر
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
      }
    }

    // تحديث البيانات
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    if (image) admin.image = image;

    await admin.save();

    // إرجاع البيانات المحدثة بدون كلمة المرور
    const updatedAdmin = await Admin.findById(admin._id).select('-password');
    
    res.json(updatedAdmin);
  } catch (error) {
    console.error('خطأ في تحديث بيانات الأدمن:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// تحديث كلمة مرور الأدمن
exports.updateAdminPassword = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    // البحث عن الأدمن
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'الأدمن غير موجود' });
    }

    // التحقق من كلمة المرور الحالية (اختياري)
    if (currentPassword) {
      const isMatch = await admin.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
      }
    }

    // تحديث كلمة المرور (سيتم تشفيرها تلقائياً في pre-save hook)
    admin.password = newPassword;

    await admin.save();

    res.json({ message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (error) {
    console.error('خطأ في تحديث كلمة مرور الأدمن:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// رفع صورة الأدمن
exports.uploadAdminImage = [
  upload.single('image'),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'لم يتم رفع أي صورة' });
      }

      // إنشاء رابط الصورة
      const imageUrl = `/uploads/admin/${req.file.filename}`;

      res.json({
        message: 'تم رفع الصورة بنجاح',
        imageUrl: imageUrl,
        url: imageUrl
      });
    } catch (error) {
      console.error('خطأ في رفع صورة الأدمن:', error);
      res.status(500).json({ message: 'خطأ في رفع الصورة' });
    }
  })
];

// تسجيل دخول الأدمن
exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    // البحث عن الأدمن
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    // التحقق من كلمة المرور
    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    // إنشاء التوكن
    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // إرجاع البيانات بدون كلمة المرور
    const adminData = await Admin.findById(admin._id).select('-password');

    res.json({
      token,
      admin: adminData
    });
  } catch (error) {
    console.error('خطأ في تسجيل دخول الأدمن:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = {
  getAdminProfile: exports.getAdminProfile,
  updateAdminProfile: exports.updateAdminProfile,
  updateAdminPassword: exports.updateAdminPassword,
  uploadAdminImage: exports.uploadAdminImage,
  adminLogin: exports.adminLogin
};
