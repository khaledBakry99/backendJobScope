const { validationResult } = require("express-validator");
const Notification = require("../models/notification.model");
const { asyncHandler } = require("../middleware/error.middleware");

// Obtener notificaciones del usuario actual
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  res.json(notifications);
});

// Marcar notificación como leída
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({ message: "Notificación no encontrada" });
  }

  // Verificar que la notificación pertenece al usuario
  if (!notification.user.equals(req.user._id)) {
    return res.status(403).json({ message: "No autorizado" });
  }

  notification.read = true;
  await notification.save();

  res.json(notification);
});

// Marcar todas las notificaciones como leídas
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true }
  );

  res.json({ message: "Todas las notificaciones marcadas como leídas" });
});

// Eliminar una notificación
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({ message: "Notificación no encontrada" });
  }

  // Verificar que la notificación pertenece al usuario
  if (!notification.user.equals(req.user._id)) {
    return res.status(403).json({ message: "No autorizado" });
  }

  await notification.remove();

  res.json({ message: "Notificación eliminada correctamente" });
});

// Crear una notificación nueva (para usuarios normales)
exports.createNotification = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { type, title, message, data, icon } = req.body;

  const notification = new Notification({
    user: req.user._id,
    type,
    title,
    message,
    data: data || {},
    icon: icon || "bell",
  });

  await notification.save();

  res.status(201).json(notification);
});

// Crear una notificación del sistema
exports.createSystemNotification = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, title, message } = req.body;

  const notification = new Notification({
    user: userId,
    type: "system",
    title,
    message,
    icon: "bell",
  });

  await notification.save();

  res.status(201).json(notification);
});
