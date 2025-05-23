const asyncHandler = require("express-async-handler");

// إعدادات الموقع الافتراضية
const defaultSettings = {
  siteName: "JobScope",
  siteDescription: "منصة ربط طالبي الخدمات بالحرفيين في سوريا",
  contactEmail: "info@jobscope.com",
  contactPhone: "+963-XXX-XXXX",
  address: "دمشق، سوريا",
  socialMedia: {
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: ""
  },
  features: {
    enableNotifications: true,
    enableReviews: true,
    enableBookings: true,
    enableChat: true
  },
  maintenance: {
    enabled: false,
    message: "الموقع تحت الصيانة، سنعود قريباً"
  },
  version: "1.0.0",
  lastUpdated: new Date()
};

// @desc    Get site settings
// @route   GET /api/site-settings
// @access  Public
exports.getSiteSettings = asyncHandler(async (req, res) => {
  try {
    // إرجاع الإعدادات الافتراضية
    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    console.error("خطأ في جلب إعدادات الموقع:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب إعدادات الموقع",
      error: error.message
    });
  }
});

// @desc    Update site settings
// @route   PUT /api/site-settings
// @access  Admin only
exports.updateSiteSettings = asyncHandler(async (req, res) => {
  try {
    // التحقق من أن المستخدم مسؤول
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بتحديث إعدادات الموقع"
      });
    }

    const updatedSettings = {
      ...defaultSettings,
      ...req.body,
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: updatedSettings,
      message: "تم تحديث إعدادات الموقع بنجاح"
    });
  } catch (error) {
    console.error("خطأ في تحديث إعدادات الموقع:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في تحديث إعدادات الموقع",
      error: error.message
    });
  }
});

// @desc    Get site status
// @route   GET /api/site-settings/status
// @access  Public
exports.getSiteStatus = asyncHandler(async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: "online",
        maintenance: defaultSettings.maintenance,
        version: defaultSettings.version,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error("خطأ في جلب حالة الموقع:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب حالة الموقع",
      error: error.message
    });
  }
});
