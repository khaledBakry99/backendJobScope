const { validationResult } = require('express-validator');
const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const Craftsman = require('../models/craftsman.model');
const Notification = require('../models/notification.model');
const { asyncHandler } = require('../middleware/error.middleware');

// Crear una nueva reseña
exports.createReview = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    bookingId,
    overallRating,
    qualityRating,
    punctualityRating,
    priceRating,
    communicationRating,
    comment,
    images,
  } = req.body;

  // Verificar que la reserva existe
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ message: 'Reserva no encontrada' });
  }

  // Verificar que el usuario es el cliente de la reserva
  if (!booking.client.equals(req.user._id)) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  // Verificar que la reserva está completada
  if (booking.status !== 'completed') {
    return res.status(400).json({ message: 'Solo se pueden reseñar reservas completadas' });
  }

  // Verificar que la reserva no tiene ya una reseña
  if (booking.reviewId) {
    return res.status(400).json({ message: 'Esta reserva ya tiene una reseña' });
  }

  // Crear la reseña
  const review = new Review({
    booking: bookingId,
    client: req.user._id,
    craftsman: booking.craftsman,
    overallRating,
    qualityRating,
    punctualityRating,
    priceRating,
    communicationRating,
    comment,
    images: images || [],
  });

  await review.save();

  // Actualizar la reserva con la referencia a la reseña
  booking.reviewId = review._id;
  await booking.save();

  // Actualizar la calificación del artesano
  const craftsman = await Craftsman.findById(booking.craftsman);
  if (craftsman) {
    // Obtener todas las reseñas del artesano
    const reviews = await Review.find({ craftsman: craftsman._id });
    
    // Calcular el promedio de calificación
    const totalRating = reviews.reduce((sum, review) => sum + review.overallRating, 0);
    const averageRating = totalRating / reviews.length;
    
    // Actualizar el artesano
    craftsman.rating = averageRating;
    craftsman.reviewCount = reviews.length;
    await craftsman.save();
  }

  // Crear notificación para el artesano
  const notification = new Notification({
    user: craftsman.user,
    type: 'review_received',
    title: 'Nueva reseña recibida',
    message: `Has recibido una nueva reseña con calificación ${overallRating}/5`,
    data: {
      bookingId: booking._id,
      reviewId: review._id,
    },
    icon: 'star',
  });

  await notification.save();

  res.status(201).json(review);
});

// Obtener reseñas de un artesano
exports.getCraftsmanReviews = asyncHandler(async (req, res) => {
  const craftsmanId = req.params.craftsmanId;

  // Verificar que el artesano existe
  const craftsman = await Craftsman.findById(craftsmanId);
  if (!craftsman) {
    return res.status(404).json({ message: 'Artesano no encontrado' });
  }

  // Obtener las reseñas
  const reviews = await Review.find({ craftsman: craftsmanId })
    .populate('client', 'name profilePicture')
    .sort({ createdAt: -1 });

  res.json(reviews);
});

// Obtener una reseña por ID
exports.getReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('client', 'name profilePicture')
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name',
      },
    })
    .populate('booking');

  if (!review) {
    return res.status(404).json({ message: 'Reseña no encontrada' });
  }

  res.json(review);
});

// Obtener calificaciones detalladas de un artesano
exports.getCraftsmanDetailedRatings = asyncHandler(async (req, res) => {
  const craftsmanId = req.params.craftsmanId;

  // Verificar que el artesano existe
  const craftsman = await Craftsman.findById(craftsmanId);
  if (!craftsman) {
    return res.status(404).json({ message: 'Artesano no encontrado' });
  }

  // Obtener las reseñas
  const reviews = await Review.find({ craftsman: craftsmanId });

  if (reviews.length === 0) {
    return res.json({
      quality: 0,
      punctuality: 0,
      price: 0,
      communication: 0,
      overall: 0,
      count: 0,
    });
  }

  // Calcular promedios para cada criterio
  const quality = reviews.reduce((acc, review) => acc + review.qualityRating, 0) / reviews.length;
  const punctuality = reviews.reduce((acc, review) => acc + review.punctualityRating, 0) / reviews.length;
  const price = reviews.reduce((acc, review) => acc + review.priceRating, 0) / reviews.length;
  const communication = reviews.reduce((acc, review) => acc + review.communicationRating, 0) / reviews.length;
  const overall = reviews.reduce((acc, review) => acc + review.overallRating, 0) / reviews.length;

  res.json({
    quality: quality.toFixed(1),
    punctuality: punctuality.toFixed(1),
    price: price.toFixed(1),
    communication: communication.toFixed(1),
    overall: overall.toFixed(1),
    count: reviews.length,
  });
});
