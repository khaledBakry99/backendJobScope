const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    craftsman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Craftsman',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    endDate: {
      type: Date,
    },
    endTime: {
      type: String,
    },
    location: {
      address: String,
      lat: Number,
      lng: Number,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    price: {
      type: Number,
    },
    notes: {
      type: String,
    },
    canEdit: {
      type: Boolean,
      default: true,
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
    },
  },
  {
    timestamps: true,
  }
);

// Método virtual para verificar si la reserva puede ser editada (dentro de los primeros 10 minutos)
bookingSchema.virtual('isEditable').get(function() {
  const createdAt = new Date(this.createdAt);
  const now = new Date();
  const diffInMinutes = (now - createdAt) / (1000 * 60);

  return diffInMinutes <= 10;
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
