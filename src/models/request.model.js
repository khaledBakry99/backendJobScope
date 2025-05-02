const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
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
    service: {
      type: String,
      required: [true, 'وصف الخدمة مطلوب'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'وصف المشكلة مطلوب'],
      trim: true,
    },
    location: {
      address: {
        type: String,
        required: [true, 'العنوان مطلوب'],
      },
      lat: {
        type: Number,
        required: [true, 'خط العرض مطلوب'],
      },
      lng: {
        type: Number,
        required: [true, 'خط الطول مطلوب'],
      },
    },
    images: [String],
    preferredDates: [
      {
        date: {
          type: Date,
          required: true,
        },
        timeFrom: {
          type: String,
          required: true,
        },
        timeTo: {
          type: String,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    acceptedDate: {
      date: Date,
      timeFrom: String,
      timeTo: String,
    },
    price: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// إضافة مؤشر لتحسين أداء البحث
requestSchema.index({ client: 1, status: 1 });
requestSchema.index({ craftsman: 1, status: 1 });
requestSchema.index({ createdAt: -1 });

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
