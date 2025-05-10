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

// Crear una nueva reseña (sin autenticación para pruebas)
router.post(
  '/',
  [
    check('booking', 'معرف الحجز مطلوب').not().isEmpty(),
    check('client', 'معرف العميل مطلوب').not().isEmpty(),
    check('craftsman', 'معرف الحرفي مطلوب').not().isEmpty(),
    check('overallRating', 'التقييم العام يجب أن يكون بين 1 و 5').isFloat({ min: 1, max: 5 }),
    check('qualityRating', 'تقييم الجودة يجب أن يكون بين 1 و 5').isFloat({ min: 1, max: 5 }),
    check('punctualityRating', 'تقييم الالتزام بالمواعيد يجب أن يكون بين 1 و 5').isFloat({ min: 1, max: 5 }),
    check('priceRating', 'تقييم السعر يجب أن يكون بين 1 و 5').isFloat({ min: 1, max: 5 }),
    check('communicationRating', 'تقييم التواصل يجب أن يكون بين 1 و 5').isFloat({ min: 1, max: 5 }),
  ],
  reviewController.createReview
);

// Rutas protegidas (requieren autenticación)
router.use(protect);

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
