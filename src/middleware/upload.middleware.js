const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Usar ruta absoluta para el directorio de uploads
    const uploadDir = path.join(process.cwd(), 'uploads');

    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      console.log("Creating uploads directory from middleware:", uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtrar archivos por tipo
const fileFilter = (req, file, cb) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Configurar límites
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
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
