const multer = require('multer');
const path = require('path');
const fs = require('fs');

// استخدام الذاكرة بدلاً من حفظ الملفات في مجلد
const storage = multer.memoryStorage();

// Filtrar archivos por tipo
const fileFilter = (req, file, cb) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Configurar límites محسنة للأداء
const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB (زيادة الحد لجودة أفضل)
  files: 10, // حد أقصى 10 ملفات
};

// Crear middleware de multer
const upload = multer({
  storage,
  fileFilter,
  limits,
});

module.exports = {
  // Middleware para subir una sola imagen
  uploadSingleImage: (fieldName) => upload.single(fieldName),

  // Middleware para subir múltiples imágenes
  uploadMultipleImages: (fieldName, maxCount) => upload.array(fieldName, maxCount),

  // Middleware para subir múltiples campos
  uploadFields: (fields) => upload.fields(fields),
};
