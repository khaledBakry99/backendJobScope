const fs = require('fs');
const path = require('path');

// دالة حذف مجلد uploads بالكامل
const removeUploadsFolder = () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  
  console.log('🗑️ بدء حذف مجلد uploads...');
  console.log(`مسار المجلد: ${uploadsDir}`);
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('✅ مجلد uploads غير موجود - لا حاجة للحذف');
    return;
  }
  
  try {
    // حذف المجلد بالكامل مع جميع محتوياته
    fs.rmSync(uploadsDir, { recursive: true, force: true });
    console.log('✅ تم حذف مجلد uploads بنجاح!');
    
    // التحقق من الحذف
    if (!fs.existsSync(uploadsDir)) {
      console.log('✅ تأكيد: مجلد uploads لم يعد موجود');
    } else {
      console.log('⚠️ تحذير: مجلد uploads لا يزال موجود');
    }
    
  } catch (error) {
    console.error('❌ خطأ في حذف مجلد uploads:', error.message);
  }
};

// تشغيل السكريبت
console.log('🚀 بدء حذف مجلد uploads...\n');
removeUploadsFolder();
console.log('\n🎉 انتهى السكريبت!');
