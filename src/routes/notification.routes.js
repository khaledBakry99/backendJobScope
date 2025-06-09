const express = require("express");
const { check } = require("express-validator");
const notificationController = require("../controllers/notification.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Obtener notificaciones del usuario actual
router.get("/me", notificationController.getMyNotifications);

// Crear una notificación nueva (para usuarios normales)
router.post(
  "/",
  [
    check("type", "El tipo de notificación es obligatorio")
      .not()
      .isEmpty(),
    check("title", "El título es obligatorio")
      .not()
      .isEmpty(),
    check("message", "El mensaje es obligatorio")
      .not()
      .isEmpty(),
  ],
  notificationController.createNotification
);

// Marcar notificación como leída
router.put("/:id/read", notificationController.markAsRead);

// Marcar todas las notificaciones como leídas
router.put("/read-all", notificationController.markAllAsRead);

// Eliminar una notificación
router.delete("/:id", notificationController.deleteNotification);

// Rutas de administrador
router.use(authorize("admin"));

// Crear una notificación del sistema
router.post(
  "/system",
  [
    check("userId", "El ID del usuario es obligatorio")
      .not()
      .isEmpty(),
    check("title", "El título es obligatorio")
      .not()
      .isEmpty(),
    check("message", "El mensaje es obligatorio")
      .not()
      .isEmpty(),
  ],
  notificationController.createSystemNotification
);

module.exports = router;
