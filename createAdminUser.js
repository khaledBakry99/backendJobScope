const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// نموذج المستخدم
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
      validate: {
        validator: function(v) {
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: (props) => `${props.value} ليس بريدًا إلكترونيًا صالحًا`,
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    userType: {
      type: String,
      enum: ["client", "craftsman", "admin"],
      default: "client",
    },
    profilePicture: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// تشفير كلمة المرور قبل الحفظ
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// دالة لمقارنة كلمات المرور
userSchema.methods.comparePassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    return false;
  }
};

const User = mongoose.model('User', userSchema);

const createAdminUser = async () => {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect('mongodb+srv://jobscope_user:KK381kk4831kk@jobscope.yes86va.mongodb.net/jobscope?retryWrites=true&w=majority&appName=JobScope');
    console.log('تم الاتصال بقاعدة البيانات');

    // التحقق من وجود أدمن بالفعل
    const existingAdmin = await User.findOne({ 
      email: 'khaled.bakry.1999@gmail.com',
      userType: 'admin'
    });
    
    if (existingAdmin) {
      console.log('الأدمن موجود بالفعل');
      console.log('البريد الإلكتروني:', existingAdmin.email);
      console.log('النوع:', existingAdmin.userType);
      process.exit(0);
    }

    // إنشاء أدمن جديد
    const adminData = {
      name: 'Khaled Bakry',
      email: 'khaled.bakry.1999@gmail.com',
      password: '111111', // سيتم تشفيرها تلقائياً
      phone: '+963123456789',
      userType: 'admin',
      profilePicture: '/img/default-avatar-2-modified.svg',
      isActive: true
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('تم إنشاء الأدمن بنجاح:');
    console.log('البريد الإلكتروني:', admin.email);
    console.log('كلمة المرور: 111111');
    console.log('النوع:', admin.userType);
    
    process.exit(0);
  } catch (error) {
    console.error('خطأ في إنشاء الأدمن:', error);
    process.exit(1);
  }
};

createAdminUser();j
