const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const Craftsman = require('../models/craftsman.model');
const { asyncHandler } = require('../middleware/error.middleware');

// Obtener todos los usuarios
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

// Obtener un usuario por ID
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }
  
  res.json(user);
});

// Actualizar perfil de usuario
exports.updateUserProfile = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, phone, address, profilePicture } = req.body;
  
  // Buscar y actualizar usuario
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }
  
  // Actualizar campos
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (profilePicture) user.profilePicture = profilePicture;
  
  await user.save();
  
  // Si el usuario es un artesano, actualizar también su dirección en el perfil de artesano
  if (user.userType === 'craftsman' && address) {
    const craftsman = await Craftsman.findOne({ user: user._id });
    if (craftsman) {
      craftsman.address = address;
      await craftsman.save();
    }
  }
  
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    userType: user.userType,
    profilePicture: user.profilePicture,
  });
});

// Cambiar contraseña
exports.changePassword = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;
  
  // Buscar usuario
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }
  
  // Verificar contraseña actual
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: 'Contraseña actual incorrecta' });
  }
  
  // Actualizar contraseña
  user.password = newPassword;
  await user.save();
  
  res.json({ message: 'Contraseña actualizada correctamente' });
});

// Desactivar cuenta
exports.deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }
  
  user.isActive = false;
  await user.save();
  
  res.json({ message: 'Cuenta desactivada correctamente' });
});

// [Admin] Actualizar usuario
exports.adminUpdateUser = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, address, userType, isActive } = req.body;
  
  // Buscar y actualizar usuario
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }
  
  // Actualizar campos
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (userType) user.userType = userType;
  if (isActive !== undefined) user.isActive = isActive;
  
  await user.save();
  
  res.json(user);
});
