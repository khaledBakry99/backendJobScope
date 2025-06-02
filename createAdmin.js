const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// نموذج الأدمن
const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    default: '/img/default-avatar-2-modified.svg'
  },
  role: {
    type: String,
    default: 'admin',
  },
  permissions: [{
    type: String,
  }],
  isActive: {
    type: Boolean,
    default: true
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

const Admin = mongoose.model('Admin', adminSchema);

const createAdmin = async () => {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect('mongodb+srv://jobscope_user:KK381kk4831kk@jobscope.yes86va.mongodb.net/jobscope?retryWrites=true&w=majority&appName=JobScope');
    console.log('تم الاتصال بقاعدة البيانات');

    // التحقق من وجود أدمن بالفعل
    const existingAdmin = await Admin.findOne({ email: 'khaled.bakry.1999@gmail.com' });
    
    if (existingAdmin) {
      console.log('الأدمن موجود بالفعل');
      console.log('البريد الإلكتروني:', existingAdmin.email);
      process.exit(0);
    }

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('111111', salt);

    // إنشاء أدمن جديد
    const adminData = {
      name: 'Khaled Bakry',
      email: 'khaled.bakry.1999@gmail.com',
      password: hashedPassword,
      phone: '+963123456789',
      role: 'admin',
      permissions: [
        'manage_users',
        'manage_craftsmen', 
        'manage_bookings',
        'manage_content',
        'manage_professions',
        'manage_system'
      ],
      isActive: true
    };

    const admin = new Admin(adminData);
    await admin.save();

    console.log('تم إنشاء الأدمن بنجاح:');
    console.log('البريد الإلكتروني:', admin.email);
    console.log('كلمة المرور: 111111');
    
    process.exit(0);
  } catch (error) {
    console.error('خطأ في إنشاء الأدمن:', error);
    process.exit(1);
  }
};

createAdmin();
