const { validationResult } = require('express-validator');
const Profession = require('../models/profession.model');
const { asyncHandler } = require('../middleware/error.middleware');

// Obtener todas las profesiones
exports.getAllProfessions = asyncHandler(async (req, res) => {
  const professions = await Profession.find().sort({ name: 1 });
  res.json(professions);
});

// Obtener una profesión por ID
exports.getProfessionById = asyncHandler(async (req, res) => {
  const profession = await Profession.findById(req.params.id);
  
  if (!profession) {
    return res.status(404).json({ message: 'Profesión no encontrada' });
  }
  
  res.json(profession);
});

// [Admin] Crear una nueva profesión
exports.createProfession = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, specializations, icon } = req.body;

  // Verificar si la profesión ya existe
  const existingProfession = await Profession.findOne({ name });
  if (existingProfession) {
    return res.status(400).json({ message: 'Esta profesión ya existe' });
  }

  // Crear la profesión
  const profession = new Profession({
    name,
    specializations: specializations || [],
    icon,
  });

  await profession.save();

  res.status(201).json(profession);
});

// [Admin] Actualizar una profesión
exports.updateProfession = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, specializations, icon } = req.body;

  // Buscar la profesión
  const profession = await Profession.findById(req.params.id);
  
  if (!profession) {
    return res.status(404).json({ message: 'Profesión no encontrada' });
  }

  // Verificar si el nuevo nombre ya existe (si se está cambiando)
  if (name && name !== profession.name) {
    const existingProfession = await Profession.findOne({ name });
    if (existingProfession) {
      return res.status(400).json({ message: 'Ya existe una profesión con este nombre' });
    }
  }

  // Actualizar campos
  if (name) profession.name = name;
  if (specializations) profession.specializations = specializations;
  if (icon) profession.icon = icon;

  await profession.save();

  res.json(profession);
});

// [Admin] Eliminar una profesión
exports.deleteProfession = asyncHandler(async (req, res) => {
  const profession = await Profession.findById(req.params.id);
  
  if (!profession) {
    return res.status(404).json({ message: 'Profesión no encontrada' });
  }

  await profession.remove();

  res.json({ message: 'Profesión eliminada correctamente' });
});
