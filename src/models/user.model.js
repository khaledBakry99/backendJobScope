const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      // يمكن أن تكون كلمة المرور غير مطلوبة في حالة المصادقة عبر Firebase
      validate: {
        validator: function() {
          return this.firebaseUid || this.googleId || this.password;
        },
        message:
          "يجب توفير كلمة مرور أو استخدام المصادقة عبر Firebase أو Google",
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    userType: {
      type: String,
      enum: ["client", "craftsman", "admin"],
      default: "client",
    },
    profilePicture: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    firebaseUid: {
      type: String,
      sparse: true,
      index: true,
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash de la contraseña antes de guardar
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
