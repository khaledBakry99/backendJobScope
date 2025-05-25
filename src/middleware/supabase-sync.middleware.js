const { supabase } = require('../config/supabase.config');
const User = require('../models/user.model');
const Craftsman = require('../models/craftsman.model');

// مزامنة المستخدمين من MongoDB إلى Supabase
const syncUsersToSupabase = async () => {
  try {
    console.log('🔄 بدء مزامنة المستخدمين من MongoDB إلى Supabase...');
    
    // جلب جميع المستخدمين من MongoDB
    const users = await User.find({ email: { $exists: true, $ne: '' } });
    
    console.log(`📊 تم العثور على ${users.length} مستخدم في MongoDB`);
    
    for (const user of users) {
      try {
        // التحقق من وجود المستخدم في Supabase
        const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(user.email);
        
        if (existingUser && existingUser.user) {
          console.log(`✅ المستخدم ${user.email} موجود بالفعل في Supabase`);
          
          // تحديث معرف Supabase في MongoDB
          if (!user.supabaseUid) {
            user.supabaseUid = existingUser.user.id;
            user.authProvider = 'supabase';
            await user.save();
            console.log(`🔄 تم تحديث معرف Supabase للمستخدم ${user.email}`);
          }
          continue;
        }
        
        // إنشاء المستخدم في Supabase
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'temp-password-123', // كلمة مرور مؤقتة
          email_confirm: true, // تأكيد البريد الإلكتروني تلقائياً
          user_metadata: {
            name: user.name,
            phone: user.phone,
            userType: user.userType,
            mongoId: user._id.toString()
          }
        });
        
        if (createError) {
          console.error(`❌ خطأ في إنشاء المستخدم ${user.email} في Supabase:`, createError);
          continue;
        }
        
        // تحديث معرف Supabase في MongoDB
        user.supabaseUid = newUser.user.id;
        user.authProvider = 'supabase';
        await user.save();
        
        console.log(`✅ تم إنشاء ومزامنة المستخدم ${user.email} بنجاح`);
        
        // إضافة تأخير صغير لتجنب rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (userError) {
        console.error(`❌ خطأ في معالجة المستخدم ${user.email}:`, userError);
      }
    }
    
    console.log('✅ انتهت مزامنة المستخدمين');
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في مزامنة المستخدمين:', error);
    return false;
  }
};

// مزامنة مستخدم واحد إلى Supabase
const syncSingleUserToSupabase = async (mongoUser) => {
  try {
    // التحقق من وجود المستخدم في Supabase
    const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(mongoUser.email);
    
    if (existingUser && existingUser.user) {
      // تحديث معرف Supabase في MongoDB
      if (!mongoUser.supabaseUid) {
        mongoUser.supabaseUid = existingUser.user.id;
        mongoUser.authProvider = 'supabase';
        await mongoUser.save();
      }
      return existingUser.user;
    }
    
    // إنشاء المستخدم في Supabase
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: mongoUser.email,
      password: 'temp-password-123',
      email_confirm: true,
      user_metadata: {
        name: mongoUser.name,
        phone: mongoUser.phone,
        userType: mongoUser.userType,
        mongoId: mongoUser._id.toString()
      }
    });
    
    if (createError) {
      console.error('خطأ في إنشاء المستخدم في Supabase:', createError);
      return null;
    }
    
    // تحديث معرف Supabase في MongoDB
    mongoUser.supabaseUid = newUser.user.id;
    mongoUser.authProvider = 'supabase';
    await mongoUser.save();
    
    return newUser.user;
    
  } catch (error) {
    console.error('خطأ في مزامنة المستخدم الواحد:', error);
    return null;
  }
};

// البحث عن مستخدم في MongoDB باستخدام معرف Supabase
const findUserBySupabaseId = async (supabaseUid) => {
  try {
    const user = await User.findOne({ supabaseUid });
    return user;
  } catch (error) {
    console.error('خطأ في البحث عن المستخدم:', error);
    return null;
  }
};

module.exports = {
  syncUsersToSupabase,
  syncSingleUserToSupabase,
  findUserBySupabaseId
};
