const { spawn } = require('child_process');
const path = require('path');

// دالة تشغيل سكريبت
const runScript = (scriptName) => {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 تشغيل ${scriptName}...`);
    
    const scriptPath = path.join(__dirname, scriptName);
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ انتهى ${scriptName} بنجاح`);
        resolve();
      } else {
        console.error(`❌ فشل ${scriptName} برمز الخروج ${code}`);
        reject(new Error(`Script ${scriptName} failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ خطأ في تشغيل ${scriptName}:`, error);
      reject(error);
    });
  });
};

// دالة رئيسية
const main = async () => {
  console.log('🧹 بدء تنظيف شامل للنظام...\n');
  
  try {
    // 1. تنظيف مسارات الصور القديمة من قاعدة البيانات
    await runScript('cleanOldImagePaths.js');
    
    // 2. حذف مجلد uploads
    await runScript('removeUploadsFolder.js');
    
    console.log('\n🎉 تم الانتهاء من جميع عمليات التنظيف بنجاح!');
    console.log('\n📋 ملخص العمليات:');
    console.log('✅ تم تنظيف مسارات الصور القديمة من قاعدة البيانات');
    console.log('✅ تم حذف مجلد uploads');
    console.log('✅ النظام الآن يستخدم Base64 فقط لحفظ الصور');
    
  } catch (error) {
    console.error('\n❌ فشل في إكمال عمليات التنظيف:', error.message);
    process.exit(1);
  }
};

// تشغيل السكريبت
main();
