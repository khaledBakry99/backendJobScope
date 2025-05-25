require('dotenv').config();
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');

// الاتصال بـ MongoDB
const connectDB = require('../src/config/db.config');

// نماذج MongoDB
const User = require('../src/models/user.model');
const Craftsman = require('../src/models/craftsman.model');

// إعدادات Supabase
const supabaseUrl = 'https://geqnmbnhyzzhqcouldfz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcW5tYm5oeXp6aHFjb3VsZGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTI3NTMsImV4cCI6MjA2Mzc2ODc1M30.TV92S0BtPGtihgoKjcsW2svZl74_EdcrtJ60AUnIaHw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateUsers() {
  try {
    console.log('🔄 بدء ترحيل المستخدمين من MongoDB إلى Supabase...');

    // الاتصال بـ MongoDB
    await connectDB();
    console.log('✅ تم الاتصال بـ MongoDB');

    // جلب جميع المستخدمين من MongoDB
    const users = await User.find({});
    console.log(`📊 تم العثور على ${users.length} مستخدم في MongoDB`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`🔄 معالجة المستخدم: ${user.email}`);

        // إنشاء المستخدم في Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'temp-password-123', // كلمة مرور مؤقتة
          email_confirm: true,
          user_metadata: {
            name: user.name,
            phone: user.phone,
            userType: user.userType,
            mongoId: user._id.toString()
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`⚠️ المستخدم ${user.email} موجود بالفعل في Supabase Auth`);
            
            // جلب المستخدم الموجود
            const { data: existingUser } = await supabase.auth.admin.getUserByEmail(user.email);
            if (existingUser && existingUser.user) {
              // تحديث معرف Supabase في MongoDB
              user.supabaseUid = existingUser.user.id;
              user.authProvider = 'supabase';
              await user.save();
              successCount++;
            }
          } else {
            console.error(`❌ خطأ في إنشاء المستخدم ${user.email}:`, authError);
            errorCount++;
          }
          continue;
        }

        // تحديث معرف Supabase في MongoDB
        user.supabaseUid = authUser.user.id;
        user.authProvider = 'supabase';
        await user.save();

        console.log(`✅ تم ترحيل المستخدم ${user.email} بنجاح`);
        successCount++;

        // إذا كان المستخدم حرفياً، قم بترحيل بياناته أيضاً
        if (user.userType === 'craftsman') {
          const craftsman = await Craftsman.findOne({ user: user._id });
          if (craftsman) {
            console.log(`🔧 ترحيل بيانات الحرفي للمستخدم ${user.email}`);
            // يمكن إضافة منطق ترحيل بيانات الحرفي هنا لاحقاً
          }
        }

        // تأخير صغير لتجنب rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (userError) {
        console.error(`❌ خطأ في معالجة المستخدم ${user.email}:`, userError);
        errorCount++;
      }
    }

    console.log('\n📊 ملخص الترحيل:');
    console.log(`✅ نجح: ${successCount} مستخدم`);
    console.log(`❌ فشل: ${errorCount} مستخدم`);
    console.log(`📊 المجموع: ${users.length} مستخدم`);

    return { success: successCount, errors: errorCount, total: users.length };

  } catch (error) {
    console.error('❌ خطأ عام في الترحيل:', error);
    throw error;
  }
}

// إنشاء مستخدم تجريبي للاختبار
async function createTestUser() {
  try {
    console.log('🧪 إنشاء مستخدم تجريبي...');

    const testEmail = '36142879ad@emaily.pro';
    const testPassword = '111111';

    // إنشاء المستخدم في Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Khaled Bakry',
        phone: '0945364616',
        userType: 'craftsman'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('✅ المستخدم التجريبي موجود بالفعل');
        return true;
      } else {
        console.error('❌ خطأ في إنشاء المستخدم التجريبي:', authError);
        return false;
      }
    }

    console.log('✅ تم إنشاء المستخدم التجريبي بنجاح');
    console.log(`📧 البريد الإلكتروني: ${testEmail}`);
    console.log(`🔑 كلمة المرور: ${testPassword}`);
    
    return true;

  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدم التجريبي:', error);
    return false;
  }
}

// تشغيل الترحيل
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test-user')) {
    createTestUser()
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ خطأ:', error);
        process.exit(1);
      });
  } else {
    migrateUsers()
      .then(result => {
        console.log('🎉 انتهى الترحيل!');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ فشل الترحيل:', error);
        process.exit(1);
      });
  }
}

module.exports = { migrateUsers, createTestUser };
