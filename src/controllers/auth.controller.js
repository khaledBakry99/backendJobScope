const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/user.model");
const Craftsman = require("../models/craftsman.model");
const { asyncHandler } = require("../middleware/error.middleware");

// توليد رمز JWT
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// تسجيل مستخدم جديد
exports.register = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, phone, userType, address } = req.body;

  // التحقق مما إذا كان المستخدم موجودًا بالفعل
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    return res.status(400).json({
      message:
        existingUser.email === email
          ? "البريد الإلكتروني مستخدم بالفعل"
          : "رقم الهاتف مستخدم بالفعل",
    });
  }

  // إنشاء مستخدم جديد
  const user = new User({
    name,
    email,
    password,
    phone,
    userType,
    address,
  });

  await user.save();

  // إذا كان المستخدم حرفيًا، قم بإنشاء ملف تعريف للحرفي
  if (userType === "craftsman") {
    // استخراج بيانات الحرفي من الطلب
    let craftsmanData = {};

    // إذا كانت البيانات مرسلة في كائن craftsmanData
    if (req.body.craftsmanData) {
      craftsmanData = req.body.craftsmanData;
    } else {
      // إذا كانت البيانات مرسلة مباشرة في الطلب
      const {
        professions,
        specializations,
        workRadius,
        location,
        bio,
      } = req.body;

      craftsmanData = {
        professions,
        specializations,
        workRadius,
        location,
        bio,
      };
    }

    // تأكد من أن موقع الحرفي يتم حفظه بشكل صحيح
    const location = craftsmanData.location || { lat: 33.5138, lng: 36.2765 }; // Damascus, Syria (default)

    // طباعة بيانات الحرفي للتأكد من استلامها بشكل صحيح
    console.log("Craftsman data received:", {
      location: location,
      workRadius: craftsmanData.workRadius,
      streetsInWorkRange: craftsmanData.streetsInWorkRange,
      hospitalsInWorkRange: craftsmanData.hospitalsInWorkRange,
      mosquesInWorkRange: craftsmanData.mosquesInWorkRange,
      neighborhoodsInWorkRange: craftsmanData.neighborhoodsInWorkRange,
    });

    const craftsman = new Craftsman({
      user: user._id,
      professions: craftsmanData.professions || [],
      specializations: craftsmanData.specializations || [],
      workRadius: craftsmanData.workRadius || 5,
      location: location, // استخدام الموقع المحدد
      bio: craftsmanData.bio || "",
      address: address || "",
      // إضافة الشوارع والمستشفيات والمساجد والأحياء ضمن نطاق العمل
      streetsInWorkRange: craftsmanData.streetsInWorkRange || [],
      hospitalsInWorkRange: craftsmanData.hospitalsInWorkRange || [],
      mosquesInWorkRange: craftsmanData.mosquesInWorkRange || [],
      neighborhoodsInWorkRange: craftsmanData.neighborhoodsInWorkRange || [],
    });

    await craftsman.save();
  }

  // توليد الرمز المميز
  const token = generateToken(user._id, user.userType);

  // إضافة خيار تذكرني
  const rememberMe = req.body.rememberMe || false;
  const expiresIn = rememberMe ? "30d" : "24h";

  // إذا كان المستخدم حرفيًا، قم بجلب معلومات الحرفي
  let craftsmanInfo = null;
  if (user.userType === "craftsman") {
    craftsmanInfo = await Craftsman.findOne({ user: user._id }).select(
      "professions specializations workRadius location bio streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange"
    );
  }

  // إذا كان المستخدم حرفيًا، قم بدمج معلومات الحرفي مع معلومات المستخدم
  let userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    userType: user.userType,
    profilePicture: user.profilePicture,
  };

  if (craftsmanInfo) {
    userData = {
      ...userData,
      professions: craftsmanInfo.professions,
      specializations: craftsmanInfo.specializations,
      workRadius: craftsmanInfo.workRadius,
      location: craftsmanInfo.location,
      bio: craftsmanInfo.bio,
      streetsInWorkRange: craftsmanInfo.streetsInWorkRange,
      hospitalsInWorkRange: craftsmanInfo.hospitalsInWorkRange,
      mosquesInWorkRange: craftsmanInfo.mosquesInWorkRange,
      neighborhoodsInWorkRange: craftsmanInfo.neighborhoodsInWorkRange,
    };
  }

  res.status(201).json({
    token,
    user: userData,
    expiresIn,
  });
});

// تسجيل الدخول
exports.login = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, rememberMe } = req.body;

  // البحث عن المستخدم عن طريق البريد الإلكتروني أو رقم الهاتف
  const user = await User.findOne({
    $or: [{ email }, { phone: email }],
  });

  if (!user) {
    return res.status(401).json({ message: "بيانات الاعتماد غير صالحة" });
  }

  // التحقق من كلمة المرور
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "بيانات الاعتماد غير صالحة" });
  }

  // التحقق مما إذا كان المستخدم نشطًا
  if (!user.isActive) {
    return res.status(401).json({ message: "تم تعطيل حسابك" });
  }

  // تحديد مدة صلاحية الرمز المميز بناءً على خيار "تذكرني"
  const expiresIn = rememberMe ? "30d" : "24h";

  // توليد الرمز المميز
  const token = jwt.sign(
    { id: user._id, userType: user.userType },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  // إذا كان المستخدم حرفيًا، قم بجلب معلومات الحرفي
  let craftsmanInfo = null;
  if (user.userType === "craftsman") {
    craftsmanInfo = await Craftsman.findOne({ user: user._id }).select(
      "professions specializations workRadius location bio streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange"
    );
  }

  // إذا كان المستخدم حرفيًا، قم بدمج معلومات الحرفي مع معلومات المستخدم
  let userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    userType: user.userType,
    profilePicture: user.profilePicture,
  };

  if (craftsmanInfo) {
    userData = {
      ...userData,
      professions: craftsmanInfo.professions,
      specializations: craftsmanInfo.specializations,
      workRadius: craftsmanInfo.workRadius,
      location: craftsmanInfo.location,
      bio: craftsmanInfo.bio,
      streetsInWorkRange: craftsmanInfo.streetsInWorkRange,
      hospitalsInWorkRange: craftsmanInfo.hospitalsInWorkRange,
      mosquesInWorkRange: craftsmanInfo.mosquesInWorkRange,
      neighborhoodsInWorkRange: craftsmanInfo.neighborhoodsInWorkRange,
    };
  }

  res.json({
    token,
    user: userData,
    expiresIn,
  });
});

// الحصول على المستخدم الحالي
exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    return res.status(404).json({ message: "المستخدم غير موجود" });
  }

  // إذا كان المستخدم حرفيًا، قم بجلب معلومات الحرفي
  let craftsmanInfo = null;
  if (user.userType === "craftsman") {
    craftsmanInfo = await Craftsman.findOne({ user: user._id }).select(
      "professions specializations workRadius location bio workingHours streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange"
    );
  }

  // إذا كان المستخدم حرفيًا، قم بدمج معلومات الحرفي مع معلومات المستخدم
  let userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    userType: user.userType,
    profilePicture: user.profilePicture,
    address: user.address,
  };

  if (craftsmanInfo) {
    userData = {
      ...userData,
      professions: craftsmanInfo.professions,
      specializations: craftsmanInfo.specializations,
      workRadius: craftsmanInfo.workRadius,
      location: craftsmanInfo.location,
      bio: craftsmanInfo.bio,
      streetsInWorkRange: craftsmanInfo.streetsInWorkRange,
      hospitalsInWorkRange: craftsmanInfo.hospitalsInWorkRange,
      mosquesInWorkRange: craftsmanInfo.mosquesInWorkRange,
      neighborhoodsInWorkRange: craftsmanInfo.neighborhoodsInWorkRange,
    };
  }

  res.json({
    user: userData,
  });
});

// تسجيل الدخول كمدير
exports.adminLogin = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, rememberMe } = req.body;

  // البحث عن المستخدم عن طريق البريد الإلكتروني والتحقق من أنه مدير
  const user = await User.findOne({ email: username, userType: "admin" });
  if (!user) {
    return res.status(401).json({ message: "بيانات الاعتماد غير صالحة" });
  }

  // التحقق من كلمة المرور
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "بيانات الاعتماد غير صالحة" });
  }

  // التحقق مما إذا كان المستخدم نشطًا
  if (!user.isActive) {
    return res.status(401).json({ message: "تم تعطيل حسابك" });
  }

  // تحديد مدة صلاحية الرمز المميز بناءً على خيار "تذكرني"
  const expiresIn = rememberMe ? "30d" : "24h";

  // توليد الرمز المميز
  const token = jwt.sign(
    { id: user._id, userType: user.userType },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  res.json({
    token,
    admin: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.userType,
      permissions: [
        "manage_users",
        "manage_craftsmen",
        "manage_bookings",
        "manage_content",
        "manage_professions",
      ],
      image: user.profilePicture,
    },
    isAuthenticated: true,
    expiresIn,
  });
});
