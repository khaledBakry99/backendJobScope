const { createClient } = require('@supabase/supabase-js');

// إعدادات Supabase
const supabaseUrl = 'https://geqnmbnhyzzhqcouldfz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcW5tYm5oeXp6aHFjb3VsZGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTI3NTMsImV4cCI6MjA2Mzc2ODc1M30.TV92S0BtPGtihgoKjcsW2svZl74_EdcrtJ60AUnIaHw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  try {
    console.log('🧪 إنشاء مستخدم تجريبي في Supabase Auth...');

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
        userType: 'craftsman',
        mongoId: '68336826a1263b7e0ee13266'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('✅ المستخدم التجريبي موجود بالفعل في Supabase Auth');
        
        // جلب المستخدم الموجود
        const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(testEmail);
        
        if (existingUser && existingUser.user) {
          console.log('📧 معرف المستخدم في Supabase:', existingUser.user.id);
          
          // تحديث جدول المستخدمين بمعرف Supabase
          const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update({ supabase_uid: existingUser.user.id })
            .eq('email', testEmail);
            
          if (updateError) {
            console.error('❌ خطأ في تحديث معرف Supabase:', updateError);
          } else {
            console.log('✅ تم تحديث معرف Supabase في الجدول');
          }
        }
        
        return true;
      } else {
        console.error('❌ خطأ في إنشاء المستخدم التجريبي:', authError);
        return false;
      }
    }

    console.log('✅ تم إنشاء المستخدم التجريبي بنجاح في Supabase Auth');
    console.log('📧 معرف المستخدم:', authUser.user.id);
    
    // تحديث جدول المستخدمين بمعرف Supabase
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ supabase_uid: authUser.user.id })
      .eq('email', testEmail);
      
    if (updateError) {
      console.error('❌ خطأ في تحديث معرف Supabase:', updateError);
    } else {
      console.log('✅ تم تحديث معرف Supabase في الجدول');
    }

    console.log('\n🎉 تم إعداد المستخدم التجريبي بنجاح!');
    console.log(`📧 البريد الإلكتروني: ${testEmail}`);
    console.log(`🔑 كلمة المرور: ${testPassword}`);
    
    return true;

  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدم التجريبي:', error);
    return false;
  }
}

// اختبار الاتصال بـ Supabase
async function testSupabaseConnection() {
  try {
    console.log('🔄 اختبار الاتصال بـ Supabase...');
    
    // اختبار جلب المستخدمين
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ خطأ في الاتصال بـ Supabase:', error);
      return false;
    }
    
    console.log('✅ تم الاتصال بـ Supabase بنجاح');
    console.log(`📊 عدد المستخدمين في الجدول: ${data ? data.length : 0}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الاتصال:', error);
    return false;
  }
}

// تشغيل الاختبار
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test-connection')) {
    testSupabaseConnection()
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ خطأ:', error);
        process.exit(1);
      });
  } else {
    createTestUser()
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ خطأ:', error);
        process.exit(1);
      });
  }
}

module.exports = { createTestUser, testSupabaseConnection };
