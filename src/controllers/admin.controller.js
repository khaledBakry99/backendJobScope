const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const Admin = require("../models/Admin");
const User = require("../models/user.model");
const Craftsman = require("../models/craftsman.model");
const Booking = require("../models/booking.model");
const multer = require("multer");
const path = require("path");

// إعداد multer لرفع الصور
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads/admin/");
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "admin-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: function(req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("يجب أن يكون الملف صورة"), false);
    }
  },
});

// الحصول على بيانات الأدمن
exports.getAdminProfile = asyncHandler(async (req, res) => {
  try {
    // البحث عن الأدمن باستخدام المعرف من التوكن
    const admin = await Admin.findById(req.user.id).select("-password");

    if (!admin) {
      return res.status(404).json({ message: "الأدمن غير موجود" });
    }

    res.json(admin);
  } catch (error) {
    console.error("خطأ في الحصول على بيانات الأدمن:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// تحديث بيانات الأدمن
exports.updateAdminProfile = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, phone, image } = req.body;

    // البحث عن الأدمن
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ message: "الأدمن غير موجود" });
    }

    // التحقق من عدم وجود بريد إلكتروني مكرر
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res
          .status(400)
          .json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      }
    }

    // تحديث البيانات
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    if (image) admin.image = image;

    await admin.save();

    // إرجاع البيانات المحدثة بدون كلمة المرور
    const updatedAdmin = await Admin.findById(admin._id).select("-password");

    res.json(updatedAdmin);
  } catch (error) {
    console.error("خطأ في تحديث بيانات الأدمن:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// تحديث كلمة مرور الأدمن
exports.updateAdminPassword = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    // البحث عن الأدمن
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ message: "الأدمن غير موجود" });
    }

    // التحقق من كلمة المرور الحالية (اختياري)
    if (currentPassword) {
      const isMatch = await admin.matchPassword(currentPassword);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "كلمة المرور الحالية غير صحيحة" });
      }
    }

    // تحديث كلمة المرور (سيتم تشفيرها تلقائياً في pre-save hook)
    admin.password = newPassword;

    await admin.save();

    res.json({ message: "تم تحديث كلمة المرور بنجاح" });
  } catch (error) {
    console.error("خطأ في تحديث كلمة مرور الأدمن:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// رفع صورة الأدمن
exports.uploadAdminImage = [
  upload.single("image"),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم رفع أي صورة" });
      }

      // إنشاء رابط الصورة
      const imageUrl = `/uploads/admin/${req.file.filename}`;

      res.json({
        message: "تم رفع الصورة بنجاح",
        imageUrl: imageUrl,
        url: imageUrl,
      });
    } catch (error) {
      console.error("خطأ في رفع صورة الأدمن:", error);
      res.status(500).json({ message: "خطأ في رفع الصورة" });
    }
  }),
];

// تسجيل دخول الأدمن
exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    // البحث عن الأدمن
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    // التحقق من كلمة المرور
    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    // إنشاء التوكن
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // إرجاع البيانات بدون كلمة المرور
    const adminData = await Admin.findById(admin._id).select("-password");

    res.json({
      token,
      admin: adminData,
    });
  } catch (error) {
    console.error("خطأ في تسجيل دخول الأدمن:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ===== إدارة المستخدمين =====

// الحصول على جميع المستخدمين
exports.getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -profilePicture -image")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("خطأ في جلب المستخدمين:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// تحديث مستخدم
exports.updateUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    res.json(user);
  } catch (error) {
    console.error("خطأ في تحديث المستخدم:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// حذف مستخدم
exports.deleteUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    res.json({ message: "تم حذف المستخدم بنجاح" });
  } catch (error) {
    console.error("خطأ في حذف المستخدم:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ===== الإحصائيات =====

// الحصول على إحصائيات لوحة التحكم
exports.getDashboardStats = asyncHandler(async (req, res) => {
  try {
    // جلب جميع المستخدمين
    const users = await User.find({}).select("userType isActive createdAt");

    // جلب جميع الحرفيين
    const craftsmen = await Craftsman.find({}).populate(
      "user",
      "isActive createdAt"
    );

    // جلب جميع الحجوزات
    const bookings = await Booking.find({}).select("status createdAt");

    // حساب الإحصائيات
    const totalUsers = users.length;
    const totalCraftsmen = craftsmen.length;
    const totalClients = users.filter((user) => user.userType === "client")
      .length;
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(
      (booking) => booking.status === "pending"
    ).length;
    const completedBookings = bookings.filter(
      (booking) => booking.status === "completed"
    ).length;
    const activeUsers = users.filter((user) => user.isActive).length;

    // المستخدمين الجدد هذا الشهر
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newUsersThisMonth = users.filter((user) => {
      const userDate = new Date(user.createdAt);
      return (
        userDate.getMonth() === currentMonth &&
        userDate.getFullYear() === currentYear
      );
    }).length;

    res.json({
      totalUsers,
      totalCraftsmen,
      totalClients,
      totalBookings,
      pendingBookings,
      completedBookings,
      activeUsers,
      newUsersThisMonth,
    });
  } catch (error) {
    console.error("خطأ في جلب الإحصائيات:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
});

// ===== إدارة الحرفيين =====

// الحصول على جميع الحرفيين
exports.getAllCraftsmen = asyncHandler(async (req, res) => {
  try {
    console.log("بدء جلب الحرفيين...");
    const craftsmen = await Craftsman.find({})
      .populate("user", "name email phone isActive userType")
      .sort({ createdAt: -1 });
    console.log(`تم العثور على ${craftsmen.length} حرفي`);
    res.json(craftsmen);
  } catch (error) {
    console.error("خطأ في جلب الحرفيين:", error);
    console.error("تفاصيل الخطأ:", error.message);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
});

// تحديث حرفي
exports.updateCraftsman = asyncHandler(async (req, res) => {
  try {
    const { craftsmanId } = req.params;
    const updateData = req.body;

    const craftsman = await Craftsman.findByIdAndUpdate(
      craftsmanId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!craftsman) {
      return res.status(404).json({ message: "الحرفي غير موجود" });
    }

    res.json(craftsman);
  } catch (error) {
    console.error("خطأ في تحديث الحرفي:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// حذف حرفي
exports.deleteCraftsman = asyncHandler(async (req, res) => {
  try {
    const { craftsmanId } = req.params;

    const craftsman = await Craftsman.findByIdAndDelete(craftsmanId);

    if (!craftsman) {
      return res.status(404).json({ message: "الحرفي غير موجود" });
    }

    res.json({ message: "تم حذف الحرفي بنجاح" });
  } catch (error) {
    console.error("خطأ في حذف الحرفي:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ===== إدارة الحجوزات =====

// الحصول على جميع الحجوزات
exports.getAllBookings = asyncHandler(async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("client", "name email phone")
      .populate({
        path: "craftsman",
        populate: {
          path: "user",
          select: "name email phone",
        },
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error("خطأ في جلب الحجوزات:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// تحديث حالة الحجز
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true, runValidators: true }
    )
      .populate("client", "name email phone")
      .populate({
        path: "craftsman",
        populate: {
          path: "user",
          select: "name email phone",
        },
      });

    if (!booking) {
      return res.status(404).json({ message: "الحجز غير موجود" });
    }

    res.json(booking);
  } catch (error) {
    console.error("خطأ في تحديث حالة الحجز:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// معالجة الحجوزات المنتهية الصلاحية
exports.processExpiredBookings = asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    const expiredBookings = await Booking.updateMany(
      {
        status: "pending",
        scheduledDate: { $lt: now },
      },
      {
        status: "cancelled",
        cancellationReason: "cancelled due to time expiration",
      }
    );

    res.json({
      message: "تم معالجة الحجوزات المنتهية الصلاحية",
      modifiedCount: expiredBookings.modifiedCount,
    });
  } catch (error) {
    console.error("خطأ في معالجة الحجوزات المنتهية الصلاحية:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

module.exports = {
  getAdminProfile: exports.getAdminProfile,
  updateAdminProfile: exports.updateAdminProfile,
  updateAdminPassword: exports.updateAdminPassword,
  uploadAdminImage: exports.uploadAdminImage,
  adminLogin: exports.adminLogin,
  // الإحصائيات
  getDashboardStats: exports.getDashboardStats,
  // إدارة المستخدمين
  getAllUsers: exports.getAllUsers,
  updateUser: exports.updateUser,
  deleteUser: exports.deleteUser,
  // إدارة الحرفيين
  getAllCraftsmen: exports.getAllCraftsmen,
  updateCraftsman: exports.updateCraftsman,
  deleteCraftsman: exports.deleteCraftsman,
  // إدارة الحجوزات
  getAllBookings: exports.getAllBookings,
  updateBookingStatus: exports.updateBookingStatus,
  processExpiredBookings: exports.processExpiredBookings,
};
