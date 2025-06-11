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
    hideContactInfo: {
      type: Boolean,
      default: false,
    },
    hideContactInfoExpiry: {
      type: Date,
      default: null,
    },
    workGallery: [
      {
        type: mongoose.Schema.Types.Mixed, // يدعم كلا من String و Object
        default: [],
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
        end: String,
      },
      default: {
        saturday: { isWorking: false, start: "", end: "" },
        sunday: { isWorking: false, start: "", end: "" },
        monday: { isWorking: false, start: "", end: "" },
        tuesday: { isWorking: false, start: "", end: "" },
        wednesday: { isWorking: false, start: "", end: "" },
        thursday: { isWorking: false, start: "", end: "" },
        friday: { isWorking: false, start: "", end: "" },
      },
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
