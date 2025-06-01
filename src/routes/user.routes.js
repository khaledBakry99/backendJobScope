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

// Eliminar cuenta permanentemente
router.delete('/me', userController.deleteMyAccount);

// Subir imagen de perfil
router.post('/upload-profile-image', uploadSingleImage('profileImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ninguna imagen' });
  }

  // Registrar información sobre el archivo subido
  console.log("Archivo subido:", {
    originalname: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size
  });

  const imageUrl = `/uploads/${req.file.filename}`;
  console.log("URL de imagen generada:", imageUrl);
  res.json({ imageUrl });
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
