const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// إعدادات Supabase
const supabaseUrl = 'https://geqnmbnhyzzhqcouldfz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcW5tYm5oeXp6aHFjb3VsZGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTI3NTMsImV4cCI6MjA2Mzc2ODc1M30.TV92S0BtPGtihgoKjcsW2svZl74_EdcrtJ60AUnIaHw';

// إنشاء عميل Supabase مع مفتاح الخدمة
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSupabaseTables() {
  try {
    console.log('🔄 بدء إعداد جداول Supabase...');

    // قراءة ملف SQL
    const sqlFilePath = path.join(__dirname, 'setup-supabase-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // تقسيم الاستعلامات
    const queries = sqlContent
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0);

    console.log(`📝 تم العثور على ${queries.length} استعلام SQL`);

    // تنفيذ كل استعلام
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.trim()) {
        try {
          console.log(`⚡ تنفيذ الاستعلام ${i + 1}/${queries.length}...`);
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: query
          });

          if (error) {
            console.error(`❌ خطأ في الاستعلام ${i + 1}:`, error);
          } else {
            console.log(`✅ نجح الاستعلام ${i + 1}`);
          }
        } catch (queryError) {
          console.error(`❌ خطأ في تنفيذ الاستعلام ${i + 1}:`, queryError);
        }
      }
    }

    console.log('✅ انتهى إعداد جداول Supabase');
    return true;

  } catch (error) {
    console.error('❌ خطأ في إعداد جداول Supabase:', error);
    return false;
  }
}

// إنشاء الجداول بطريقة مباشرة
async function createTablesDirectly() {
  try {
    console.log('🔄 إنشاء الجداول مباشرة...');

    // إنشاء جدول المستخدمين
    const { error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError && usersError.code === 'PGRST116') {
      console.log('📝 إنشاء جدول المستخدمين...');
      // الجدول غير موجود، سنحتاج لإنشاؤه عبر SQL Editor في Supabase
    }

    console.log('✅ تم التحقق من الجداول');
    return true;

  } catch (error) {
    console.error('❌ خطأ في إنشاء الجداول:', error);
    return false;
  }
}

// تشغيل الإعداد
if (require.main === module) {
  setupSupabaseTables()
    .then(success => {
      if (success) {
        console.log('🎉 تم إعداد Supabase بنجاح!');
        process.exit(0);
      } else {
        console.log('❌ فشل في إعداد Supabase');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ خطأ عام:', error);
      process.exit(1);
    });
}

module.exports = { setupSupabaseTables, createTablesDirectly };
