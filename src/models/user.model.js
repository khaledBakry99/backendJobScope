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
      // السماح بالبريد الإلكتروني الفارغ للمستخدمين الذين يسجلون باستخدام رقم الهاتف فقط
      validate: {
        validator: function(v) {
          // إذا كان البريد الإلكتروني فارغًا، تحقق من وجود رقم هاتف أو معرف Firebase
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: props => `${props.value} ليس بريدًا إلكترونيًا صالحًا`
      }
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      // يمكن أن تكون كلمة المرور غير مطلوبة في حالة المصادقة عبر Firebase أو Supabase
      validate: {
        validator: function() {
          return this.firebaseUid || this.supabaseUid || this.googleId || this.password;
        },
        message:
          "يجب توفير كلمة مرور أو استخدام المصادقة عبر Firebase أو Supabase أو Google",
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
    bio: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: false, // المستخدمون الجدد غير مفعلين حتى يتم التحقق من البريد الإلكتروني
    },
    firebaseUid: {
      type: String,
      sparse: true,
      index: true,
    },
    supabaseUid: {
      type: String,
      sparse: true,
      index: true,
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "firebase", "supabase", "google"],
      default: "local",
    },
  },
  {
    timestamps: true,
  }
);

// تشفير كلمة المرور قبل الحفظ
userSchema.pre("save", async function(next) {
  // تخطي تشفير كلمة المرور إذا لم يتم تعديلها
  if (!this.isModified("password")) return next();

  try {
    // طباعة معلومات تشخيصية
    console.log(`Hashing password for user: ${this._id || 'new user'}`);

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    console.log("Password hashed successfully");
    next();
  } catch (error) {
    console.error("Error hashing password:", error);
    next(error);
  }
});

// دالة لمقارنة كلمات المرور
userSchema.methods.comparePassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
};

const User = mongoose.model("User", userSchema);

module.exports = User;
