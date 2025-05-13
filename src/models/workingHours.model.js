const mongoose = require("mongoose");

// نموذج ساعات العمل
const workingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    required: true
  },
  isWorking: {
    type: Boolean,
    default: false
  },
  start: {
    type: String,
    default: "09:00"
  },
  end: {
    type: String,
    default: "17:00"
  }
});

// إنشاء فهرس مركب لليوم وحالة العمل
workingHoursSchema.index({ day: 1, isWorking: 1 });

module.exports = workingHoursSchema;
