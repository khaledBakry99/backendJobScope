const express = require("express");
const { check } = require("express-validator");
const bookingController = require("../controllers/booking.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Crear una nueva reserva (solo clientes)
router.post(
  "/",
  [
    check("craftsmanId", "El ID del artesano es obligatorio")
      .not()
      .isEmpty(),
    check("date", "La fecha es obligatoria")
      .not()
      .isEmpty(),
    check("time", "La hora es obligatoria")
      .not()
      .isEmpty(),
    check("description", "La descripción es obligatoria")
      .not()
      .isEmpty(),
  ],
  bookingController.createBooking
);

// Obtener todas las reservas del usuario actual
router.get("/me", bookingController.getMyBookings);

// Obtener una reserva por ID
router.get("/:id", bookingController.getBookingById);

// Actualizar estado de una reserva
router.put(
  "/:id/status",
  [
    check("status", "El estado es obligatorio").isIn([
      "pending",
      "accepted",
      "rejected",
      "completed",
      "cancelled",
      "cancelled_expired",
    ]),
  ],
  bookingController.updateBookingStatus
);

// Confirmar una reserva y enviarla inmediatamente
router.patch("/:id/confirm", bookingController.confirmBooking);

// تحديث الطلبات المنتهية (للمسؤولين فقط)
router.post("/process-expired", bookingController.processExpiredBookings);

// إلغاء الطلبات المنتهية الصلاحية تلقائياً
router.post("/cancel-expired", bookingController.cancelExpiredBookingsEndpoint);

// Editar una reserva (solo dentro de los primeros 5 minutos)
router.put(
  "/:id",
  [
    check("date", "La fecha debe ser válida").optional(),
    check("time", "La hora debe ser válida").optional(),
    check("description", "La descripción no puede estar vacía")
      .optional()
      .not()
      .isEmpty(),
  ],
  bookingController.updateBooking
);

// تحديث الحجز بمعرف التقييم
router.put(
  "/:id/review",
  [
    check("reviewId", "معرف التقييم مطلوب")
      .not()
      .isEmpty(),
  ],
  bookingController.updateBookingWithReview
);

module.exports = router;
