// تكوين تحميل الملفات
module.exports = {
  // المجلد الذي سيتم تخزين الملفات المحملة فيه
  uploadDir: "uploads",

  // الحد الأقصى لحجم الملف (بالبايت)
  maxFileSize: 5 * 1024 * 1024, // 5 ميجابايت

  // أنواع الملفات المسموح بها
  allowedMimeTypes: {
    images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    documents: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },

  // الحد الأقصى لعدد الملفات في التحميل المتعدد
  maxFiles: {
    gallery: 6,
    review: 10,
    profile: 1,
  },
};
