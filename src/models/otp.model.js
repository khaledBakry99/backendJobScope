const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // رمز التحقق ينتهي بعد 10 دقائق
    },
  },
  {
    timestamps: true,
  }
);

// إنشاء فهرس مركب للمعرف ورمز التحقق
otpSchema.index({ identifier: 1, otp: 1 });

module.exports = mongoose.model("OTP", otpSchema);
