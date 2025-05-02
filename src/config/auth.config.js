// تكوين المصادقة
module.exports = {
  // مدة صلاحية الرمز المميز (JWT)
  jwtExpiration: 86400, // 24 ساعة (بالثواني)
  
  // مدة صلاحية رمز التحديث
  jwtRefreshExpiration: 604800, // 7 أيام (بالثواني)
  
  // خيارات تشفير كلمة المرور
  saltRounds: 10,
  
  // رسائل الخطأ
  errorMessages: {
    invalidCredentials: 'بيانات الاعتماد غير صالحة',
    accountDisabled: 'تم تعطيل الحساب',
    unauthorized: 'غير مصرح لك بالوصول',
    tokenExpired: 'انتهت صلاحية الرمز المميز',
    invalidToken: 'الرمز المميز غير صالح',
  }
};
