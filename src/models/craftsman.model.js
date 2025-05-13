const mongoose = require("mongoose");

const craftsmanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    professions: [
      {
        type: String,
        required: true,
      },
    ],
    specializations: [
      {
        type: String,
      },
    ],
    bio: {
      type: String,
      trim: true,
    },
    features: {
      type: [String],
      default: [],
    },
    workRadius: {
      type: Number,
      default: 5, // بالكيلومتر
    },
    location: {
      lat: Number,
      lng: Number,
    },
    address: {
      type: String,
      trim: true,
    },
    // إضافة قائمة الشوارع ضمن نطاق العمل
    streetsInWorkRange: [
      {
        type: String,
        trim: true,
      },
    ],
    // إضافة المستشفيات ضمن نطاق العمل
    hospitalsInWorkRange: [
      {
        type: String,
        trim: true,
      },
    ],
    // إضافة المساجد ضمن نطاق العمل
    mosquesInWorkRange: [
      {
        type: String,
        trim: true,
      },
    ],
    // إضافة الأحياء ضمن نطاق العمل
    neighborhoodsInWorkRange: [
      {
        type: String,
        trim: true,
      },
    ],
    available: {
      type: Boolean,
      default: true,
    },
    workGallery: [
      {
        type: String,
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    workingHours: {
      monday: { start: String, end: String, isWorking: Boolean },
      tuesday: { start: String, end: String, isWorking: Boolean },
      wednesday: { start: String, end: String, isWorking: Boolean },
      thursday: { start: String, end: String, isWorking: Boolean },
      friday: { start: String, end: String, isWorking: Boolean },
      saturday: { start: String, end: String, isWorking: Boolean },
      sunday: { start: String, end: String, isWorking: Boolean },
    },
  },
  {
    timestamps: true,
  }
);

// Crear índice para consultas geoespaciales
craftsmanSchema.index({ location: "2dsphere" });

const Craftsman = mongoose.model("Craftsman", craftsmanSchema);

module.exports = Craftsman;
