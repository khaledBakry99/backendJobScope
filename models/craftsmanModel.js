const mongoose = require('mongoose');

// نموذج ساعات العمل
const workingHourSchema = mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  isWorking: {
    type: Boolean,
    default: false
  },
  start: {
    type: String,
    default: ''
  },
  end: {
    type: String,
    default: ''
  }
}, { _id: false });

// نموذج الحرفي
const craftsmanSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  bio: {
    type: String,
    required: false
  },
  professions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profession'
  }],
  specializations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Specialization'
  }],
  features: {
    type: [String],
    default: []
  },
  rating: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    },
    workRange: {
      type: Number,
      default: 5
    },
    neighborhoodsInWorkRange: {
      type: [String],
      default: []
    }
  },
  available: {
    type: Boolean,
    default: true
  },
  workGallery: {
    type: [String],
    default: []
  },
  // كائن ساعات العمل (للتوافق مع الكود القديم)
  workingHours: {
    type: Object,
    default: {}
  },
  // مصفوفة ساعات العمل (النموذج الجديد)
  workingHoursArray: {
    type: [workingHourSchema],
    default: []
  }
}, {
  timestamps: true
});

// إضافة فهرس جغرافي للموقع
craftsmanSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Craftsman', craftsmanSchema);
