const mongoose = require('mongoose');
const User = require('../src/models/user.model');

// الاتصال بقاعدة البيانات
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://jobscope_user:KK381kk4831kk@jobscope.yes86va.mongodb.net/?retryWrites=true&w=majority&appName=JobScope');
    console.log('تم الاتصال بقاعدة البيانات بنجاح');
  } catch (error) {
    console.error('خطأ في الاتصال بقاعدة البيانات:', error);
    process.exit(1);
  }
};

// إصلاح حقل passwordChangedAt للمستخدمين الموجودين
const fixPasswordChangedAt = async () => {
  try {
    console.log('بدء إصلاح حقل passwordChangedAt...');
    
    // البحث عن جميع المستخدمين الذين لديهم passwordChangedAt مُعيّن
    const usersWithPasswordChangedAt = await User.find({
      passwordChangedAt: { $exists: true, $ne: null }
    });
    
    console.log(`تم العثور على ${usersWithPasswordChangedAt.length} مستخدم لديهم passwordChangedAt مُعيّن`);
    
    // إزالة passwordChangedAt للمستخدمين الذين لم يغيروا كلمة المرور فعلياً
    // (نفترض أن المستخدمين الذين تم إنشاؤهم مؤخراً لم يغيروا كلمة المرور)
    const result = await User.updateMany(
      {
        passwordChangedAt: { $exists: true, $ne: null },
        // إزالة passwordChangedAt للمستخدمين الذين تم إنشاؤهم في نفس وقت passwordChangedAt
        // (هذا يعني أنه تم تعيينه تلقائياً عند الإنشاء وليس بسبب تغيير كلمة المرور)
        $expr: {
          $lte: [
            { $abs: { $subtract: ["$passwordChangedAt", "$createdAt"] } },
            5000 // 5 ثوانٍ فرق
          ]
        }
      },
      {
        $unset: { passwordChangedAt: "" }
      }
    );
    
    console.log(`تم إصلاح ${result.modifiedCount} مستخدم`);
    
    // عرض المستخدمين الذين ما زال لديهم passwordChangedAt (هؤلاء غيروا كلمة المرور فعلياً)
    const remainingUsers = await User.find({
      passwordChangedAt: { $exists: true, $ne: null }
    }).select('name email passwordChangedAt createdAt');
    
    console.log(`المستخدمين الذين ما زال لديهم passwordChangedAt (غيروا كلمة المرور فعلياً): ${remainingUsers.length}`);
    remainingUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}): passwordChangedAt=${user.passwordChangedAt}, createdAt=${user.createdAt}`);
    });
    
  } catch (error) {
    console.error('خطأ في إصلاح passwordChangedAt:', error);
  }
};

// تشغيل السكريبت
const runScript = async () => {
  await connectDB();
  await fixPasswordChangedAt();
  await mongoose.connection.close();
  console.log('تم إنهاء السكريبت');
  process.exit(0);
}

runScript();
