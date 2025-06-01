const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'الاسم مطلوب'],
    trim: true,
    maxlength: [50, 'الاسم يجب أن يكون أقل من 50 حرف']
  },
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'يرجى إدخال بريد إلكتروني صالح'
    ]
  },
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[0-9]{9,15}$/, 'يرجى إدخال رقم هاتف صالح']
  },
  image: {
    type: String,
    default: '/img/default-avatar-2-modified.svg'
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin', 'super_admin']
  },
  permissions: [{
    type: String,
    enum: [
      'manage_users',
      'manage_craftsmen', 
      'manage_bookings',
      'manage_content',
      'manage_professions',
      'manage_system'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// تحديث updatedAt قبل الحفظ
adminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// تشفير كلمة المرور قبل الحفظ
adminSchema.pre('save', async function(next) {
  // فقط إذا تم تعديل كلمة المرور
  if (!this.isModified('password')) return next();

  try {
    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// طريقة للمقارنة بين كلمات المرور
adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// طريقة لإرجاع البيانات بدون كلمة المرور
adminSchema.methods.toJSON = function() {
  const admin = this.toObject();
  delete admin.password;
  return admin;
};

// إنشاء فهرس للبريد الإلكتروني
adminSchema.index({ email: 1 });

module.exports = mongoose.model('Admin', adminSchema);
