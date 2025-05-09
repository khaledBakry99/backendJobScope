const { validationResult } = require('express-validator');
const Booking = require('../models/booking.model');
const Craftsman = require('../models/craftsman.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { asyncHandler } = require('../middleware/error.middleware');

// Crear una nueva reserva
exports.createBooking = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { craftsmanId, date, time, endDate, endTime, location, description } = req.body;

  // Verificar que el artesano existe
  const craftsman = await Craftsman.findById(craftsmanId).populate('user');
  if (!craftsman) {
    return res.status(404).json({ message: 'Artesano no encontrado' });
  }

  // Verificar que el artesano está disponible
  if (!craftsman.available) {
    return res.status(400).json({ message: 'El artesano no está disponible actualmente' });
  }

  // Crear la reserva
  const booking = new Booking({
    client: req.user._id,
    craftsman: craftsmanId,
    date,
    time,
    endDate,
    endTime,
    location,
    description,
    status: 'pending',
  });

  await booking.save();

  // Crear notificación para el artesano
  const notification = new Notification({
    user: craftsman.user._id,
    type: 'booking_created',
    title: 'Nueva solicitud de servicio',
    message: `Has recibido una nueva solicitud de servicio de ${req.user.name}`,
    data: {
      bookingId: booking._id,
    },
    icon: 'clipboard-list',
  });

  await notification.save();

  // Obtener la reserva con datos completos para enviar al cliente
  const populatedBooking = await Booking.findById(booking._id)
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name phone profilePicture',
      },
    })
    .populate('client', 'name phone profilePicture');

  // Crear un objeto con los datos necesarios para el cliente
  const responseBooking = {
    ...populatedBooking.toObject(),
    craftsmanName: populatedBooking.craftsman.user.name,
    clientName: populatedBooking.client.name,
  };

  res.status(201).json(responseBooking);
});

// Obtener todas las reservas del usuario actual
exports.getMyBookings = asyncHandler(async (req, res) => {
  let bookings;

  if (req.user.userType === 'client') {
    // Si es cliente, obtener sus reservas
    bookings = await Booking.find({ client: req.user._id })
      .populate({
        path: 'craftsman',
        populate: {
          path: 'user',
          select: 'name phone profilePicture',
        },
      })
      .populate('client', 'name phone')
      .populate('reviewId')
      .sort({ createdAt: -1 });
  } else if (req.user.userType === 'craftsman') {
    // Si es artesano, obtener las reservas donde es el artesano
    const craftsmanProfile = await Craftsman.findOne({ user: req.user._id });

    if (!craftsmanProfile) {
      return res.status(404).json({ message: 'Perfil de artesano no encontrado' });
    }

    bookings = await Booking.find({ craftsman: craftsmanProfile._id })
      .populate('client', 'name phone profilePicture')
      .populate({
        path: 'craftsman',
        populate: {
          path: 'user',
          select: 'name phone',
        },
      })
      .populate('reviewId')
      .sort({ createdAt: -1 });
  } else {
    return res.status(403).json({ message: 'No autorizado' });
  }

  // Transformar los resultados para incluir nombres de artesanos y clientes
  const transformedBookings = bookings.map(booking => {
    const bookingObj = booking.toObject();

    // Añadir nombres para facilitar el acceso en el frontend
    if (booking.craftsman && booking.craftsman.user) {
      bookingObj.craftsmanName = booking.craftsman.user.name;
    }

    if (booking.client) {
      bookingObj.clientName = booking.client.name;
    }

    return bookingObj;
  });

  res.json(transformedBookings);
});

// Obtener una reserva por ID
exports.getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name phone profilePicture',
      },
    })
    .populate('client', 'name phone profilePicture')
    .populate('reviewId');

  if (!booking) {
    return res.status(404).json({ message: 'Reserva no encontrada' });
  }

  // Verificar que el usuario es el cliente o el artesano de la reserva
  const craftsmanProfile = await Craftsman.findOne({ user: req.user._id });
  const isCraftsman = craftsmanProfile && booking.craftsman.equals(craftsmanProfile._id);
  const isClient = booking.client.equals(req.user._id);

  if (!isClient && !isCraftsman && req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'No autorizado' });
  }

  res.json(booking);
});

// Actualizar estado de una reserva
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { status } = req.body;

  // Verificar estado válido
  const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Estado inválido' });
  }

  // Buscar la reserva
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name _id',
      },
    })
    .populate('client', 'name _id');

  if (!booking) {
    return res.status(404).json({ message: 'Reserva no encontrada' });
  }

  // Verificar permisos según el estado
  const craftsmanProfile = await Craftsman.findOne({ user: req.user._id });
  const isCraftsman = craftsmanProfile && booking.craftsman._id.equals(craftsmanProfile._id);
  const isClient = booking.client._id.equals(req.user._id);

  if (status === 'accepted' || status === 'rejected') {
    // Solo el artesano puede aceptar o rechazar
    if (!isCraftsman) {
      return res.status(403).json({ message: 'Solo el artesano puede aceptar o rechazar reservas' });
    }
  } else if (status === 'cancelled') {
    // Solo el cliente puede cancelar
    if (!isClient) {
      return res.status(403).json({ message: 'Solo el cliente puede cancelar reservas' });
    }

    // Solo se puede cancelar si está pendiente o aceptada
    if (booking.status !== 'pending' && booking.status !== 'accepted') {
      return res.status(400).json({ message: 'Solo se pueden cancelar reservas pendientes o aceptadas' });
    }
  } else if (status === 'completed') {
    // Solo el artesano puede marcar como completada
    if (!isCraftsman) {
      return res.status(403).json({ message: 'Solo el artesano puede marcar reservas como completadas' });
    }

    // Solo se puede completar si está aceptada
    if (booking.status !== 'accepted') {
      return res.status(400).json({ message: 'Solo se pueden completar reservas aceptadas' });
    }
  }

  // Actualizar estado
  booking.status = status;
  await booking.save();

  // Crear notificación
  let notificationType, title, message, icon;
  let recipientId;

  switch (status) {
    case 'accepted':
      notificationType = 'booking_accepted';
      title = 'Solicitud aceptada';
      message = `Tu solicitud de servicio ha sido aceptada por ${booking.craftsman.user.name}`;
      icon = 'check-circle';
      recipientId = booking.client._id;
      break;
    case 'rejected':
      notificationType = 'booking_rejected';
      title = 'Solicitud rechazada';
      message = `Tu solicitud de servicio ha sido rechazada por ${booking.craftsman.user.name}`;
      icon = 'x-circle';
      recipientId = booking.client._id;
      break;
    case 'completed':
      notificationType = 'booking_completed';
      title = 'Servicio completado';
      message = `El servicio ha sido marcado como completado por ${booking.craftsman.user.name}`;
      icon = 'check-square';
      recipientId = booking.client._id;
      break;
    case 'cancelled':
      notificationType = 'booking_cancelled';
      title = 'Reserva cancelada';
      message = `La reserva ha sido cancelada por ${booking.client.name}`;
      icon = 'x-square';
      recipientId = booking.craftsman.user._id;
      break;
  }

  if (notificationType) {
    const notification = new Notification({
      user: recipientId,
      type: notificationType,
      title,
      message,
      data: {
        bookingId: booking._id,
      },
      icon,
    });

    await notification.save();
  }

  res.json(booking);
});

// Editar una reserva (solo dentro de los primeros 5 minutos)
exports.updateBooking = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { date, time, endDate, endTime, location, description } = req.body;

  // Buscar la reserva
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: 'Reserva no encontrada' });
  }

  // Verificar que el usuario es el cliente
  if (!booking.client.equals(req.user._id)) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  // Verificar que la reserva está pendiente
  if (booking.status !== 'pending') {
    return res.status(400).json({ message: 'Solo se pueden editar reservas pendientes' });
  }

  // Verificar que está dentro de los primeros 5 minutos
  const createdAt = new Date(booking.createdAt);
  const now = new Date();
  const diffInMinutes = (now - createdAt) / (1000 * 60);

  if (diffInMinutes > 5) {
    return res.status(400).json({ message: 'Solo se pueden editar reservas dentro de los primeros 5 minutos' });
  }

  // Actualizar campos
  if (date) booking.date = date;
  if (time) booking.time = time;
  if (endDate) booking.endDate = endDate;
  if (endTime) booking.endTime = endTime;
  if (location) booking.location = location;
  if (description) booking.description = description;

  // تحديث تاريخ التعديل
  booking.updatedAt = new Date();

  await booking.save();

  // إرجاع الطلب المحدث مع تاريخ التحديث الجديد
  res.json(booking);
});

// Confirmar una reserva y enviarla inmediatamente
exports.confirmBooking = asyncHandler(async (req, res) => {
  // Buscar la reserva
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: 'Reserva no encontrada' });
  }

  // Verificar que el usuario es el cliente
  if (!booking.client.equals(req.user._id)) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  // Verificar que la reserva está pendiente
  if (booking.status !== 'pending') {
    return res.status(400).json({ message: 'Solo se pueden confirmar reservas pendientes' });
  }

  // Marcar la reserva como confirmada (no cambia el estado, solo se envía inmediatamente)
  booking.canEdit = false; // Deshabilitar la edición
  await booking.save();

  // Crear notificación para el artesano
  const craftsman = await Craftsman.findById(booking.craftsman).populate('user');

  if (craftsman && craftsman.user) {
    const notification = new Notification({
      user: craftsman.user._id,
      type: 'booking_confirmed',
      title: 'تم تأكيد طلب الخدمة',
      message: `تم تأكيد طلب الخدمة من ${req.user.name} وإرساله إليك فورًا`,
      data: {
        bookingId: booking._id,
      },
      icon: 'check-circle',
    });

    await notification.save();
  }

  res.json({
    ...booking.toObject(),
    confirmed: true,
    message: 'تم تأكيد الطلب وإرساله للحرفي بنجاح'
  });
});
