const express = require('express');
const { check } = require('express-validator');
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadSingleImage } = require('../middleware/upload.middleware');

const router = express.Router();

// Rutas protegidas (requieren autenticación)
router.use(protect);

// Obtener perfil del usuario actual
router.get('/me', userController.getUserById);

// Actualizar perfil de usuario
router.put(
  '/me',
  [
    check('name', 'El nombre no puede estar vacío').optional().not().isEmpty(),
    check('phone', 'El teléfono no puede estar vacío').optional().not().isEmpty(),
  ],
  userController.updateUserProfile
);

// Cambiar contraseña
router.put(
  '/change-password',
  [
    check('currentPassword', 'La contraseña actual es obligatoria').not().isEmpty(),
    check('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  ],
  userController.changePassword
);

// Desactivar cuenta
router.put('/deactivate', userController.deactivateAccount);

// Subir imagen de perfil (مباشرة إلى Base64)
router.post('/upload-profile-image', uploadSingleImage('profileImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ninguna imagen' });
  }

  try {
    // تحويل الملف إلى Base64 مباشرة من buffer
    const base64String = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    console.log("تم تحويل صورة الملف الشخصي إلى Base64 مباشرة:", {
      originalname: req.file.originalname,
      size: req.file.size,
      base64Length: base64String.length
    });

    res.json({ imageUrl: base64String });
  } catch (error) {
    console.error("خطأ في تحويل صورة الملف الشخصي:", error);
    res.status(500).json({ message: 'خطأ في معالجة الصورة' });
  }
});

// Rutas de administrador
router.use(authorize('admin'));

// Obtener todos los usuarios
router.get('/', userController.getAllUsers);

// Obtener un usuario por ID
router.get('/:id', userController.getUserById);

// Actualizar usuario (admin)
router.put(
  '/:id',
  [
    check('name', 'El nombre no puede estar vacío').optional().not().isEmpty(),
    check('email', 'Por favor incluya un email válido').optional().isEmail(),
    check('userType', 'Tipo de usuario inválido').optional().isIn(['client', 'craftsman', 'admin']),
  ],
  userController.adminUpdateUser
);

module.exports = router;
