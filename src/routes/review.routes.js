const express = require('express');
const { check } = require('express-validator');
const reviewController = require('../controllers/review.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadMultipleImages } = require('../middleware/upload.middleware');

const router = express.Router();

// Rutas públicas
// Obtener reseñas de un artesano
router.get('/craftsman/:craftsmanId', reviewController.getCraftsmanReviews);

// Obtener calificaciones detalladas de un artesano
router.get('/craftsman/:craftsmanId/ratings', reviewController.getCraftsmanDetailedRatings);

// Obtener una reseña por ID
router.get('/:id', reviewController.getReviewById);

// Rutas protegidas (requieren autenticación)
router.use(protect);

// Crear una nueva reseña (solo clientes)
router.post(
  '/',
  authorize('client'),
  [
    check('bookingId', 'El ID de la reserva es obligatorio').not().isEmpty(),
    check('overallRating', 'La calificación general debe estar entre 1 y 5').isFloat({ min: 1, max: 5 }),
    check('qualityRating', 'La calificación de calidad debe estar entre 1 y 5').isFloat({ min: 1, max: 5 }),
    check('punctualityRating', 'La calificación de puntualidad debe estar entre 1 y 5').isFloat({ min: 1, max: 5 }),
    check('priceRating', 'La calificación de precio debe estar entre 1 y 5').isFloat({ min: 1, max: 5 }),
    check('communicationRating', 'La calificación de comunicación debe estar entre 1 y 5').isFloat({ min: 1, max: 5 }),
  ],
  reviewController.createReview
);

// Subir imágenes para una reseña
router.post(
  '/upload-images',
  authorize('client'),
  uploadMultipleImages('reviewImages', 3),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No se han subido imágenes' });
    }
    
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    res.json({ imageUrls });
  }
);

module.exports = router;
