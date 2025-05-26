const express = require('express');
const router = express.Router();

// إعدادات الموقع الافتراضية
const defaultSiteSettings = {
  siteName: "JobScope",
  siteDescription: "منصة للربط بين طالبي الخدمة والحرفيين",
  siteEmail: "info@jobscope.com",
  siteLogo: "/img/logo.png",
  sitePhone: "+963 912 345 678",
  siteAddress: "دمشق، سوريا",
  siteWorkingHours: "24/7",
  defaultLanguage: "ar",
  defaultTheme: "light"
};

// الحصول على إعدادات الموقع (متاح للجميع)
router.get('/', (req, res) => {
  try {
    console.log('طلب الحصول على إعدادات الموقع');
    res.json(defaultSiteSettings);
  } catch (error) {
    console.error('خطأ في الحصول على إعدادات الموقع:', error);
    res.status(500).json({ 
      message: 'خطأ في الحصول على إعدادات الموقع',
      error: error.message 
    });
  }
});

// تحديث إعدادات الموقع (للمسؤولين فقط)
router.put('/', (req, res) => {
  try {
    console.log('طلب تحديث إعدادات الموقع:', req.body);
    
    // في التطبيق الحقيقي، يجب حفظ هذه البيانات في قاعدة البيانات
    // هنا نرجع البيانات المرسلة كما هي
    const updatedSettings = {
      ...defaultSiteSettings,
      ...req.body
    };
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('خطأ في تحديث إعدادات الموقع:', error);
    res.status(500).json({ 
      message: 'خطأ في تحديث إعدادات الموقع',
      error: error.message 
    });
  }
});

// تحديث إعداد واحد (للمسؤولين فقط)
router.patch('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    console.log(`طلب تحديث إعداد ${key} إلى:`, value);
    
    // في التطبيق الحقيقي، يجب حفظ هذا في قاعدة البيانات
    res.json({ key, value });
  } catch (error) {
    console.error(`خطأ في تحديث إعداد ${req.params.key}:`, error);
    res.status(500).json({ 
      message: `خطأ في تحديث إعداد ${req.params.key}`,
      error: error.message 
    });
  }
});

module.exports = router;
