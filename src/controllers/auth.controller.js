const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/user.model");
const Craftsman = require("../models/craftsman.model");
const { asyncHandler } = require("../middleware/error.middleware");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const OTP = require("../models/otp.model");
const { supabase, verifySupabaseToken } = require("../config/supabase.config");
const { syncSingleUserToSupabase, findUserBySupabaseId } = require("../middleware/supabase-sync.middleware");

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

  const {
    name,
    email,
    password,
    phone,
    userType,
    address,
    profilePicture,
  } = req.body;

  // طباعة البيانات المستلمة للتشخيص
  console.log("Registration data received:", {
    name,
    email,
    phone,
    userType,
    address,
    hasProfilePicture: !!profilePicture,
    profilePictureLength: profilePicture ? profilePicture.length : 0,
  });

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

  // معالجة الصورة الشخصية إذا كانت موجودة
  let profilePicturePath = "";
  if (profilePicture) {
    // التحقق مما إذا كانت الصورة بتنسيق base64
    if (profilePicture.startsWith("data:image")) {
      // تحويل الصورة من base64 إلى ملف
      const base64Data = profilePicture.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // إنشاء اسم فريد للملف
      const filename = `profile-${Date.now()}.png`;
      const filePath = `uploads/${filename}`;

      // التأكد من وجود المجلد
      const fs = require("fs");
      const path = require("path");
      const uploadDir = path.join(process.cwd(), "uploads");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // حفظ الملف
      fs.writeFileSync(path.join(process.cwd(), filePath), buffer);

      // تعيين مسار الصورة
      profilePicturePath = `/${filePath}`;
      console.log("Saved profile picture to:", profilePicturePath);
    } else {
      // إذا كانت الصورة عبارة عن URL، نستخدمها مباشرة
      profilePicturePath = profilePicture;
    }
  }

  // إنشاء مستخدم جديد (غير مفعل حتى يتم التحقق من البريد الإلكتروني)
  const user = new User({
    name,
    email,
    password,
    phone,
    userType,
    address,
    profilePicture: profilePicturePath,
    isActive: false, // المستخدم غير مفعل حتى يتم التحقق من البريد الإلكتروني
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

  // إرسال رمز التحقق إلى البريد الإلكتروني تلقائياً
  const otp = generateOTP();

  // حفظ رمز التحقق في قاعدة البيانات
  await OTP.findOneAndDelete({ identifier: email }); // حذف أي رمز سابق
  await OTP.create({ identifier: email, otp });

  // إرسال رمز التحقق عبر البريد الإلكتروني
  const sent = await sendOTPByEmail(email, otp);

  if (!sent) {
    // إذا فشل إرسال البريد الإلكتروني، احذف المستخدم المنشأ
    await User.findByIdAndDelete(user._id);
    if (user.userType === "craftsman") {
      await Craftsman.findOneAndDelete({ user: user._id });
    }

    return res.status(500).json({
      success: false,
      message: "فشل في إرسال رمز التحقق، يرجى المحاولة مرة أخرى",
    });
  }

  // إرجاع رسالة نجاح بدون token (المستخدم يحتاج للتحقق من البريد الإلكتروني أولاً)
  res.status(201).json({
    success: true,
    message: "تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
    userId: user._id,
    email: user.email,
    requiresVerification: true,
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
    return res.status(401).json({
      message: "حسابك غير مفعل. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
      requiresVerification: true,
      email: user.email
    });
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
      "professions specializations workRadius location bio features workGallery streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange available"
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
      features: craftsmanInfo.features || [],
      gallery: craftsmanInfo.workGallery || [], // إضافة معرض الصور
      workGallery: craftsmanInfo.workGallery || [], // إضافة معرض الأعمال للتوافق مع الباك إند
      available: craftsmanInfo.available, // إضافة حالة التوفر
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
      "professions specializations workRadius location bio features workingHours workGallery streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange available"
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
      features: craftsmanInfo.features || [],
      gallery: craftsmanInfo.workGallery || [], // إضافة معرض الصور
      workGallery: craftsmanInfo.workGallery || [], // إضافة معرض الأعمال للتوافق مع الباك إند
      workingHours: craftsmanInfo.workingHours || {},
      available: craftsmanInfo.available, // إضافة حالة التوفر
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

// التحقق من وجود البريد الإلكتروني
exports.checkEmailExists = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
  }

  const user = await User.findOne({ email });

  res.json({ exists: !!user });
});

// التحقق من وجود رقم الهاتف
exports.checkPhoneExists = asyncHandler(async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ message: "رقم الهاتف مطلوب" });
  }

  const user = await User.findOne({ phone });

  res.json({ exists: !!user });
});

// توليد رمز تحقق من 6 أرقام
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// إرسال رمز التحقق عبر البريد الإلكتروني
const sendOTPByEmail = async (email, otp) => {
  try {
    // إنشاء ناقل بريد إلكتروني
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // إعداد خيارات الرسالة
    const mailOptions = {
      from: process.env.EMAIL_FROM || "JobScope <noreply@jobscope.com>",
      to: email,
      subject: "رمز التحقق من JobScope",
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #3730A3; text-align: center;">JobScope - رمز التحقق</h2>
          <p>مرحباً،</p>
          <p>لقد طلبت رمز تحقق للتسجيل في تطبيق JobScope. رمز التحقق الخاص بك هو:</p>
          <div style="text-align: center; margin: 20px 0;">
            <div style="font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 10px; background-color: #f0f0f0; border-radius: 5px; display: inline-block;">${otp}</div>
          </div>
          <p>هذا الرمز صالح لمدة 10 دقائق فقط.</p>
          <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
          <p style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777;">
            هذه رسالة آلية، يرجى عدم الرد عليها.
          </p>
        </div>
      `,
    };

    // إرسال البريد الإلكتروني
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

// إرسال رمز التحقق عبر رسالة نصية
const sendOTPBySMS = async (phone, otp) => {
  try {
    // هنا يمكنك استخدام خدمة إرسال الرسائل النصية المفضلة لديك
    // مثال: Twilio, Vonage, MessageBird, إلخ.

    // في هذا المثال، سنقوم فقط بتسجيل الرمز في وحدة التحكم
    console.log(`Sending OTP ${otp} to phone ${phone}`);

    // محاكاة نجاح إرسال الرسالة
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
};

// إرسال رمز التحقق إلى البريد الإلكتروني
exports.sendOtpToEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
  }

  // التحقق من صحة البريد الإلكتروني
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "البريد الإلكتروني غير صالح" });
  }

  // توليد رمز التحقق
  const otp = generateOTP();

  // حفظ رمز التحقق في قاعدة البيانات
  await OTP.findOneAndDelete({ identifier: email }); // حذف أي رمز سابق
  await OTP.create({ identifier: email, otp });

  // إرسال رمز التحقق عبر البريد الإلكتروني
  const sent = await sendOTPByEmail(email, otp);

  if (sent) {
    res.json({
      success: true,
      message: "تم إرسال رمز التحقق بنجاح إلى بريدك الإلكتروني",
    });
  } else {
    res.status(500).json({
      success: false,
      message: "فشل في إرسال رمز التحقق، يرجى المحاولة مرة أخرى",
    });
  }
});

// إرسال رمز التحقق إلى رقم الهاتف
exports.sendOtpToPhone = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ message: "رقم الهاتف مطلوب" });
  }

  // التحقق من صحة رقم الهاتف (سوري أو أمريكي)
  if (phone.startsWith("+1") || phone.startsWith("1")) {
    // التحقق من رقم الهاتف الأمريكي
    // يجب أن يتكون من 10 أرقام (منطقة 3 أرقام + 7 أرقام) بعد رمز الدولة
    const phoneWithoutCode = phone.replace(/^\+?1/, "").trim();
    if (!/^\d{10}$/.test(phoneWithoutCode)) {
      return res.status(400).json({ message: "رقم الهاتف الأمريكي غير صالح" });
    }
  } else if (!/^(\+?963|0)?9\d{8}$/.test(phone)) {
    // التحقق من رقم الهاتف السوري
    return res.status(400).json({ message: "رقم الهاتف غير صالح" });
  }

  // توليد رمز التحقق
  const otp = generateOTP();

  // حفظ رمز التحقق في قاعدة البيانات
  await OTP.findOneAndDelete({ identifier: phone }); // حذف أي رمز سابق
  await OTP.create({ identifier: phone, otp });

  // إرسال رمز التحقق عبر رسالة نصية
  const sent = await sendOTPBySMS(phone, otp);

  if (sent) {
    res.json({
      success: true,
      message: "تم إرسال رمز التحقق بنجاح إلى رقم هاتفك",
    });
  } else {
    res.status(500).json({
      success: false,
      message: "فشل في إرسال رمز التحقق، يرجى المحاولة مرة أخرى",
    });
  }
});

// التحقق من صحة رمز التحقق وتفعيل الحساب
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, phone, otp } = req.body;

  if (!otp) {
    return res.status(400).json({ message: "رمز التحقق مطلوب" });
  }

  if (!email && !phone) {
    return res
      .status(400)
      .json({ message: "البريد الإلكتروني أو رقم الهاتف مطلوب" });
  }

  const identifier = email || phone;

  // البحث عن رمز التحقق في قاعدة البيانات
  const otpRecord = await OTP.findOne({ identifier, otp });

  if (!otpRecord) {
    return res.status(400).json({
      success: false,
      message: "رمز التحقق غير صحيح أو منتهي الصلاحية",
    });
  }

  // البحث عن المستخدم وتفعيل حسابه
  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }],
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "المستخدم غير موجود",
    });
  }

  // تفعيل الحساب
  user.isActive = true;
  await user.save();

  // حذف رمز التحقق بعد التحقق منه
  await OTP.deleteOne({ _id: otpRecord._id });

  // توليد الرمز المميز للمستخدم المفعل
  const token = generateToken(user._id, user.userType);

  // إذا كان المستخدم حرفيًا، قم بجلب معلومات الحرفي
  let craftsmanInfo = null;
  if (user.userType === "craftsman") {
    craftsmanInfo = await Craftsman.findOne({ user: user._id }).select(
      "professions specializations workRadius location bio workGallery streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange available"
    );
  }

  // إعداد بيانات المستخدم للإرجاع
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
      gallery: craftsmanInfo.workGallery || [],
      workGallery: craftsmanInfo.workGallery || [],
      available: craftsmanInfo.available,
      streetsInWorkRange: craftsmanInfo.streetsInWorkRange,
      hospitalsInWorkRange: craftsmanInfo.hospitalsInWorkRange,
      mosquesInWorkRange: craftsmanInfo.mosquesInWorkRange,
      neighborhoodsInWorkRange: craftsmanInfo.neighborhoodsInWorkRange,
    };
  }

  res.json({
    success: true,
    message: "تم التحقق من الحساب وتفعيله بنجاح",
    token,
    user: userData,
    expiresIn: "30d",
  });
});

// تسجيل مستخدم تم إنشاؤه باستخدام Firebase
exports.registerFirebaseUser = asyncHandler(async (req, res) => {
  const { uid, name, phone, email, userType, googleId, image } = req.body;

  // طباعة البيانات المستلمة للتشخيص
  console.log("Firebase user registration request received:", {
    uid,
    name,
    email,
    phone,
    userType,
    googleId,
    hasImage: !!image,
  });

  if (!uid) {
    return res.status(400).json({ message: "معرف Firebase مطلوب" });
  }

  try {
    // التحقق مما إذا كان المستخدم موجودًا بالفعل
    let user = null;

    // البحث عن المستخدم باستخدام معرف Firebase أو معرف Google أو البريد الإلكتروني
    if (uid) {
      user = await User.findOne({ firebaseUid: uid });
    }

    if (!user && googleId) {
      user = await User.findOne({ googleId: googleId });
    }

    if (!user && email) {
      user = await User.findOne({ email: email });
    }

    if (user) {
      console.log("Existing user found:", user._id.toString());
      // إذا كان المستخدم موجودًا بالفعل، قم بتحديث بياناته
      user.name = name || user.name;
      user.phone = phone || user.phone;
      user.email = email || user.email;

      // تأكد من تحديث معرفات المصادقة إذا لم تكن موجودة
      if (googleId && !user.googleId) {
        user.googleId = googleId;
      }

      if (uid && !user.firebaseUid) {
        user.firebaseUid = uid;
      }

      if (image) {
        user.profilePicture = image;
      }

      await user.save();
      console.log("User updated successfully");
    } else {
      console.log("Creating new user");
      // إنشاء مستخدم جديد
      user = new User({
        name,
        phone: phone || "",
        email: email || "",
        userType,
        firebaseUid: uid,
        googleId,
        profilePicture: image || "",
        isActive: true,
        // لا نحتاج لكلمة مرور لأن المصادقة تتم عبر Firebase
        password:
          Math.random()
            .toString(36)
            .substring(2) +
          Math.random()
            .toString(36)
            .substring(2),
      });

      await user.save();
      console.log("New user created with ID:", user._id.toString());

      // إذا كان المستخدم حرفيًا، قم بإنشاء ملف تعريف للحرفي
      if (userType === "craftsman") {
        const craftsman = new Craftsman({
          user: user._id,
          professions: [],
          specializations: [],
          workRadius: 5,
          location: { lat: 33.5138, lng: 36.2765 }, // Damascus, Syria (default)
          bio: "",
        });

        await craftsman.save();
        console.log("Craftsman profile created");
      }
    }

    // توليد الرمز المميز
    const token = generateToken(user._id, user.userType);

    // إذا كان المستخدم حرفيًا، قم بجلب معلومات الحرفي
    let craftsmanInfo = null;
    if (user.userType === "craftsman") {
      craftsmanInfo = await Craftsman.findOne({ user: user._id }).select(
        "professions specializations workRadius location bio features streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange"
      );
    }

    // إعداد بيانات المستخدم للإرجاع
    let userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      profilePicture: user.profilePicture,
    };

    // إذا كان المستخدم حرفيًا، قم بدمج معلومات الحرفي مع معلومات المستخدم
    if (craftsmanInfo) {
      userData = {
        ...userData,
        professions: craftsmanInfo.professions,
        specializations: craftsmanInfo.specializations,
        workRadius: craftsmanInfo.workRadius,
        location: craftsmanInfo.location,
        bio: craftsmanInfo.bio,
        features: craftsmanInfo.features || [],
        streetsInWorkRange: craftsmanInfo.streetsInWorkRange,
        hospitalsInWorkRange: craftsmanInfo.hospitalsInWorkRange,
        mosquesInWorkRange: craftsmanInfo.mosquesInWorkRange,
        neighborhoodsInWorkRange: craftsmanInfo.neighborhoodsInWorkRange,
      };
    }

    console.log("User authenticated successfully, returning data");

    res.status(201).json({
      token,
      user: userData,
      expiresIn: "30d",
    });
  } catch (error) {
    console.error("Error in registerFirebaseUser:", error);
    res.status(500).json({
      message: "حدث خطأ أثناء تسجيل المستخدم",
      error: error.message,
    });
  }
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

// تسجيل الدخول المختلط (Supabase + MongoDB)
exports.hybridLogin = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  try {
    // محاولة تسجيل الدخول عبر Supabase أولاً
    const { data: supabaseAuth, error: supabaseError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (supabaseAuth && supabaseAuth.user) {
      // نجح تسجيل الدخول عبر Supabase
      console.log('✅ نجح تسجيل الدخول عبر Supabase');

      // البحث عن المستخدم في MongoDB
      let mongoUser = await findUserBySupabaseId(supabaseAuth.user.id);

      if (!mongoUser) {
        // البحث بالبريد الإلكتروني
        mongoUser = await User.findOne({ email });

        if (mongoUser) {
          // ربط المستخدم مع Supabase
          mongoUser.supabaseUid = supabaseAuth.user.id;
          mongoUser.authProvider = 'supabase';
          await mongoUser.save();
        }
      }

      if (mongoUser) {
        // إرجاع بيانات المستخدم من MongoDB
        const token = generateToken(mongoUser._id, mongoUser.userType);

        // جلب بيانات الحرفي إذا كان المستخدم حرفياً
        let craftsmanInfo = null;
        if (mongoUser.userType === "craftsman") {
          craftsmanInfo = await Craftsman.findOne({ user: mongoUser._id });
        }

        let userData = {
          id: mongoUser._id,
          name: mongoUser.name,
          email: mongoUser.email,
          phone: mongoUser.phone,
          userType: mongoUser.userType,
          profilePicture: mongoUser.profilePicture,
        };

        if (craftsmanInfo) {
          userData = { ...userData, ...craftsmanInfo.toObject() };
        }

        return res.json({
          success: true,
          token,
          user: userData,
          expiresIn: rememberMe ? "30d" : "24h",
          authMethod: "supabase"
        });
      }
    }

    // إذا فشل Supabase، جرب MongoDB التقليدي
    console.log('❌ فشل Supabase، جاري المحاولة مع MongoDB...');

    const user = await User.findOne({
      $or: [{ email }, { phone: email }],
    });

    if (!user) {
      return res.status(401).json({ message: "بيانات الاعتماد غير صالحة" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "بيانات الاعتماد غير صالحة" });
    }

    if (!user.isActive) {
      return res.status(401).json({
        message: "حسابك غير مفعل. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
        requiresVerification: true,
        email: user.email
      });
    }

    // مزامنة المستخدم مع Supabase في الخلفية
    syncSingleUserToSupabase(user).catch(err =>
      console.error('خطأ في مزامنة المستخدم مع Supabase:', err)
    );

    const token = generateToken(user._id, user.userType);

    // جلب بيانات الحرفي
    let craftsmanInfo = null;
    if (user.userType === "craftsman") {
      craftsmanInfo = await Craftsman.findOne({ user: user._id });
    }

    let userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      profilePicture: user.profilePicture,
    };

    if (craftsmanInfo) {
      userData = { ...userData, ...craftsmanInfo.toObject() };
    }

    res.json({
      success: true,
      token,
      user: userData,
      expiresIn: rememberMe ? "30d" : "24h",
      authMethod: "mongodb"
    });

  } catch (error) {
    console.error('خطأ في تسجيل الدخول المختلط:', error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل الدخول"
    });
  }
});

// تسجيل مستخدم تم إنشاؤه باستخدام Supabase
exports.registerSupabaseUser = asyncHandler(async (req, res) => {
  console.log("🔄 تسجيل مستخدم Supabase - البيانات المستلمة:", req.body);

  try {
    const {
      uid,
      id,
      email,
      name,
      displayName,
      phone,
      phoneNumber,
      userType,
      address,
      profilePicture,
      photoURL,
      emailVerified,
      user_metadata,
    } = req.body;

    // استخدام المعرف المناسب (uid من Firebase أو id من Supabase)
    const userId = uid || id;
    const userName = name || displayName || user_metadata?.name;
    const userPhone = phone || phoneNumber || user_metadata?.phone;
    const userPhoto =
      profilePicture || photoURL || user_metadata?.profile_picture;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "معرف المستخدم مطلوب",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني مطلوب",
      });
    }

    // التحقق مما إذا كان المستخدم موجودًا بالفعل
    let existingUser = await User.findOne({
      $or: [
        { _id: userId },
        { email },
        { supabaseUid: userId },
        { firebaseUid: userId },
      ],
    });

    if (existingUser) {
      console.log("✅ المستخدم موجود بالفعل، تحديث البيانات");

      // تحديث بيانات المستخدم الموجود
      existingUser.name = userName || existingUser.name;
      existingUser.email = email;
      existingUser.phone = userPhone || existingUser.phone;
      existingUser.profilePicture = userPhoto || existingUser.profilePicture;
      existingUser.userType = userType || existingUser.userType;
      existingUser.address = address || existingUser.address;
      existingUser.isActive = true;
      // تحديث معرف Supabase ومقدم المصادقة
      existingUser.supabaseUid = userId;
      existingUser.authProvider = "supabase";

      await existingUser.save();

      // توليد رمز مميز جديد
      const token = generateToken(existingUser._id, existingUser.userType);

      // جلب معلومات الحرفي إذا كان المستخدم حرفيًا
      let craftsmanInfo = null;
      if (existingUser.userType === "craftsman") {
        craftsmanInfo = await Craftsman.findOne({ user: existingUser._id });
      }

      // إعداد بيانات المستخدم للاستجابة
      let userData = {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        userType: existingUser.userType,
        profilePicture: existingUser.profilePicture,
        address: existingUser.address,
      };

      if (craftsmanInfo) {
        userData = {
          ...userData,
          professions: craftsmanInfo.professions,
          specializations: craftsmanInfo.specializations,
          workRadius: craftsmanInfo.workRadius,
          location: craftsmanInfo.location,
          bio: craftsmanInfo.bio,
          available: craftsmanInfo.available,
        };
      }

      return res.status(200).json({
        success: true,
        token,
        user: userData,
        message: "تم تحديث بيانات المستخدم بنجاح",
      });
    }

    // إنشاء مستخدم جديد
    console.log("🆕 إنشاء مستخدم جديد");

    const newUser = new User({
      _id: userId,
      name: userName,
      email,
      phone: userPhone,
      userType: userType || "client",
      address: address || "",
      profilePicture: userPhoto || "",
      isActive: true,
      // إضافة معرف Supabase ومقدم المصادقة
      supabaseUid: userId,
      authProvider: "supabase",
      // لا نحتاج لكلمة مرور لأن المصادقة تتم عبر Supabase
      password: "supabase-auth", // كلمة مرور وهمية
    });

    await newUser.save();

    // إذا كان المستخدم حرفيًا، إنشاء ملف تعريف للحرفي
    if (newUser.userType === "craftsman") {
      const craftsman = new Craftsman({
        user: newUser._id,
        professions: [],
        specializations: [],
        workRadius: 5,
        location: { lat: 33.5138, lng: 36.2765 }, // Damascus default
        bio: "",
        available: true,
      });

      await craftsman.save();
    }

    // توليد رمز مميز
    const token = generateToken(newUser._id, newUser.userType);

    // إعداد بيانات المستخدم للاستجابة
    const userData = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      userType: newUser.userType,
      profilePicture: newUser.profilePicture,
      address: newUser.address,
    };

    console.log("✅ تم إنشاء المستخدم بنجاح");

    res.status(201).json({
      success: true,
      token,
      user: userData,
      message: "تم تسجيل المستخدم بنجاح",
    });
  } catch (error) {
    console.error("❌ خطأ في تسجيل مستخدم Supabase:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل المستخدم",
      error: error.message,
    });
  }
});
