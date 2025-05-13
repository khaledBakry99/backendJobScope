const mongoose = require("mongoose");
const workingHoursSchema = require("./workingHours.model");

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
    // ساعات العمل - تخزين كمصفوفة من الأيام مع حالة العمل والوقت
    workingHours: {
      type: Map,
      of: {
        isWorking: Boolean,
        start: String,
        end: String
      },
      default: {
        monday: { isWorking: false, start: "09:00", end: "17:00" },
        tuesday: { isWorking: false, start: "09:00", end: "17:00" },
        wednesday: { isWorking: false, start: "09:00", end: "17:00" },
        thursday: { isWorking: false, start: "09:00", end: "17:00" },
        friday: { isWorking: false, start: "09:00", end: "17:00" },
        saturday: { isWorking: false, start: "09:00", end: "17:00" },
        sunday: { isWorking: false, start: "09:00", end: "17:00" }
      }
    },
    // ساعات العمل كمصفوفة (للتوافق مع الواجهة الجديدة)
    workingHoursArray: [workingHoursSchema],
  },
  {
    timestamps: true,
  }
);

// Crear índice para consultas geoespaciales
craftsmanSchema.index({ location: "2dsphere" });

const Craftsman = mongoose.model("Craftsman", craftsmanSchema);

module.exports = Craftsman;
