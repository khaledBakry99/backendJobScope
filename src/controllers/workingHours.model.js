const mongoose = require("mongoose");

// نموذج ساعات العمل
const workingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"],
    required: true
  },
  isWorking: {
    type: Boolean,
    default: false
  },
  start: {
    type: String,
    default: ""
  },
  end: {
    type: String,
    default: ""
  }
});

// إنشاء فهرس مركب لليوم وحالة العمل
workingHoursSchema.index({ day: 1, isWorking: 1 });

module.exports = workingHoursSchema;
