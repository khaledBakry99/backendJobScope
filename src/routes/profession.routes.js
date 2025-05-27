const express = require('express');
const { check } = require('express-validator');
const professionController = require('../controllers/profession.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Rutas públicas
// Obtener todas las profesiones
router.get('/', professionController.getAllProfessions);

// Obtener una profesión por ID
router.get('/:id', professionController.getProfessionById);

// Rutas de administrador
router.use(protect, authorize('admin'));

// Crear una nueva profesión
router.post(
  '/',
  [
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('specializations', 'Las especializaciones deben ser un array').optional().isArray(),
  ],
  professionController.createProfession
);

// Actualizar una profesión
router.put(
  '/:id',
  [
    check('name', 'El nombre no puede estar vacío').optional().not().isEmpty(),
    check('specializations', 'Las especializaciones deben ser un array').optional().isArray(),
  ],
  professionController.updateProfession
);

// Eliminar una profesión
router.delete('/:id', professionController.deleteProfession);

module.exports = router;
