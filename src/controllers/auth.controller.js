const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/user.model");
const Craftsman = require("../models/craftsman.model");
const { asyncHandler } = require("../middleware/error.middleware");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const OTP = require("../models/otp.model");

// توليد رمز JWT
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// تسجيل مستخدم جديد
exports.register = asyncHandler(async (req, res) => {
  // طباعة محتوى الطلب بالكامل
  console.log("[REGISTER] req.body:", JSON.stringify(req.body, null, 2));
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  console.log("[REGISTER] express-validator errors:", errors.array());
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
  console.log("[REGISTER] Registration data received:", {
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
  console.log("[REGISTER] existingUser:", existingUser);
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

  // إنشاء مستخدم جديد
  const user = new User({
    name,
    email,
    password,
    phone,
    userType,
    address,
    profilePicture: profilePicturePath,
  });

  await user.save();

  // إذا كان المستخدم حرفيًا، قم بإنشاء ملف تعريف للحرفي
  if (userType === "craftsman") {
    // استخراج بيانات الحرفي من الطلب
    let craftsmanData = {};

    // إذا كانت البيانات مرسلة في كائن craftsmanData
    if (req.body.craftsmanData) {
      craftsmanData = req.body.craftsmanData;
      console.log(
        "[REGISTER] craftsmanData object received:",
        JSON.stringify(craftsmanData, null, 2)
      );
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
      console.log(
        "[REGISTER] craftsmanData flat fields:",
        JSON.stringify(craftsmanData, null, 2)
      );
    }
    const location = craftsmanData.location || { lat: 33.5138, lng: 36.2765 }; // Damascus, Syria (default)

    // طباعة بيانات الحرفي للتأكد من استلامها بشكل صحيح
    console.log("[REGISTER] Craftsman data received:", {
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
      "professions specializations workRadius location bio workGallery streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange available workingHours workingHoursArray"
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
      gallery: craftsmanInfo.workGallery || [], // إضافة معرض الصور
      workGallery: craftsmanInfo.workGallery || [], // إضافة معرض الأعمال للتوافق مع الباك إند
      available: craftsmanInfo.available, // إضافة حالة التوفر
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
      "professions specializations workRadius location bio features workGallery streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange available workingHours workingHoursArray"
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
      workingHours: craftsmanInfo.workingHours || {},
      workingHoursArray: craftsmanInfo.workingHoursArray || [],
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
      "professions specializations workRadius location bio features workingHours workingHoursArray workGallery streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange available"
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
      workingHoursArray: craftsmanInfo.workingHoursArray || [],
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

// استيراد خدمة HyperSender
const hyperSenderService = require("../services/hyperSenderService");

// إرسال رمز التحقق عبر رسالة واتساب باستخدام Hypersender API الجديد
const sendOTPBySMS = async (phone, otp) => {
  try {
    console.log(
      `Sending OTP ${otp} to phone ${phone} via Hypersender WhatsApp API`
    );
    const axios = require("axios");
    const apiToken = "348|yNWvDrANrOY4j48sQra4bkGsZ16y0oGpr9k5PrUi15f84a18";
    const instanceId = "9f323941-f7e8-4845-a967-f849163cd110";
    const apiUrl = `https://app.hypersender.com/api/whatsapp/v1/${instanceId}/send-text-safe`;

    // تنسيق رقم الهاتف للواتساب
    let phoneDigits = phone.startsWith("+") ? phone.slice(1) : phone;
    if (phoneDigits.startsWith("0")) {
      phoneDigits = "963" + phoneDigits.slice(1);
    }

    const chatId = `${phoneDigits}@s.whatsapp.net`;
    const message = `رمز التحقق الخاص بك في JobScope هو: ${otp}`;

    console.log(`Formatted phone: ${phoneDigits}, ChatId: ${chatId}`);

    const data = {
      chatId: chatId,
      text: message,
    };

    const headers = {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    };

    console.log("Sending request to Hypersender API...");
    console.log("API URL:", apiUrl);
    console.log("Data:", JSON.stringify(data, null, 2));

    try {
      const response = await axios.post(apiUrl, data, { headers });
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));

      if (response.status === 200 || response.status === 201) {
        console.log("تم إرسال الرسالة بنجاح:", response.data);
        return true;
      } else {
        console.error("تفاصيل رد Hypersender:", response.data);
        return false;
      }
    } catch (err) {
      console.error("خطأ من Hypersender:");
      console.error("Status:", err.response?.status);
      console.error("Data:", err.response?.data);
      console.error("Message:", err.message);
      return false;
    }
  } catch (error) {
    console.error("خطأ غير متوقع أثناء إرسال رمز التحقق:", error);
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

  // تنسيق رقم الهاتف السوري بجميع الصيغ المحتملة
  function normalizePhone(p) {
    if (!p) return "";
    let phoneDigits = p.replace(/[^\d]/g, ""); // أرقام فقط

    // إذا كان يبدأ بـ 963 (رمز سوريا)
    if (phoneDigits.startsWith("963")) {
      return "+" + phoneDigits;
    }

    // إذا كان يبدأ بـ 0 (رقم محلي سوري)
    if (phoneDigits.startsWith("0")) {
      return "+963" + phoneDigits.slice(1);
    }

    // إذا كان يبدأ بـ 9 وطوله 9 أرقام (رقم سوري بدون رمز الدولة أو الصفر)
    if (phoneDigits.length === 9 && phoneDigits.startsWith("9")) {
      return "+963" + phoneDigits;
    }

    // إذا كان يبدأ بـ +963
    if (p.startsWith("+963")) {
      return p;
    }

    // إذا كان رقم أمريكي
    if (phoneDigits.startsWith("1") && phoneDigits.length === 11) {
      return "+" + phoneDigits;
    }

    return phoneDigits;
  }

  const normalizedPhone = normalizePhone(phone);

  // التحقق من صحة رقم الهاتف
  const isValidSyrianPhone = /^(\+?963|0)?9\d{8}$/.test(phone);
  const isValidUSPhone =
    phone.startsWith("+1") || (phone.startsWith("1") && phone.length === 11);

  console.log(
    `Phone validation - Input: ${phone}, Normalized: ${normalizedPhone}`
  );
  console.log(
    `Syrian phone valid: ${isValidSyrianPhone}, US phone valid: ${isValidUSPhone}`
  );

  if (!isValidSyrianPhone && !isValidUSPhone) {
    return res.status(400).json({
      message: "رقم الهاتف غير صالح. يرجى إدخال رقم هاتف سوري صحيح",
    });
  }

  // توليد رمز التحقق
  const otp = generateOTP();

  // حفظ رمز التحقق في قاعدة البيانات مع جميع الصيغ المحتملة
  const possiblePhones = [
    phone,
    normalizedPhone,
    normalizedPhone.replace("+", ""),
    normalizedPhone.startsWith("+963") ? "0" + normalizedPhone.slice(4) : "",
  ].filter(Boolean);

  // حذف أي رموز سابقة لجميع الصيغ
  await OTP.deleteMany({ identifier: { $in: possiblePhones } });

  // حفظ الرمز الجديد
  await OTP.create({ identifier: normalizedPhone, otp });

  console.log(`Sending OTP ${otp} to phone ${normalizedPhone}`);

  // إرسال رمز التحقق عبر رسالة نصية
  try {
    const sent = await sendOTPBySMS(normalizedPhone, otp);

    // نعيد نجاح دائماً مع حفظ الرمز في قاعدة البيانات
    res.json({
      success: true,
      message: "تم إرسال رمز التحقق بنجاح إلى رقم هاتفك عبر WhatsApp",
      phone: normalizedPhone,
      otp: otp, // للتطوير فقط - احذف هذا السطر في الإنتاج
    });
  } catch (smsError) {
    console.error("خطأ في إرسال الرسالة:", smsError);
    // نعيد نجاح مع حفظ الرمز في قاعدة البيانات
    res.json({
      success: true,
      message: "تم إرسال رمز التحقق بنجاح إلى رقم هاتفك عبر WhatsApp",
      phone: normalizedPhone,
      otp: otp, // للتطوير فقط - احذف هذا السطر في الإنتاج
    });
  }
});

// التحقق من صحة رمز التحقق (أكثر مرونة في مطابقة رقم الهاتف)
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

  // توحيد صيغ رقم الهاتف للبحث
  function normalizePhone(p) {
    if (!p) return "";
    let phoneDigits = p.replace(/[^\d]/g, ""); // أرقام فقط
    if (phoneDigits.startsWith("963")) return phoneDigits;
    if (phoneDigits.startsWith("0")) return "963" + phoneDigits.slice(1);
    if (phoneDigits.length === 9 && phoneDigits.startsWith("9"))
      return "963" + phoneDigits;
    return phoneDigits;
  }

  let possiblePhones = [];
  if (phone) {
    const norm = normalizePhone(phone);
    possiblePhones = [
      phone,
      norm,
      norm.startsWith("963") ? "0" + norm.slice(3) : "",
      norm.startsWith("963") ? "+" + norm : "",
    ].filter(Boolean);
  }

  // البحث عن رمز التحقق في قاعدة البيانات
  let otpRecord = null;
  if (email) {
    otpRecord = await OTP.findOne({ identifier: email, otp });
  } else if (possiblePhones.length) {
    otpRecord = await OTP.findOne({ identifier: { $in: possiblePhones }, otp });
  }

  if (!otpRecord) {
    return res.status(400).json({
      success: false,
      message: "رمز التحقق غير صحيح أو منتهي الصلاحية",
    });
  }

  // حذف رمز التحقق بعد التحقق منه
  await OTP.deleteOne({ _id: otpRecord._id });

  res.json({
    success: true,
    message: "تم التحقق من الرمز بنجاح",
  });
});

// تسجيل مستخدم تم إنشاؤه باستخدام Firebase أو Supabase
exports.registerFirebaseUser = asyncHandler(async (req, res) => {
  const {
    uid,
    name,
    phone,
    email,
    userType,
    googleId,
    image,
    isSupabase,
  } = req.body;

  // طباعة البيانات المستلمة للتشخيص
  console.log("Firebase/Supabase user registration request received:", {
    uid,
    name,
    email,
    phone,
    userType,
    googleId,
    hasImage: !!image,
    isSupabase: !!isSupabase,
  });

  if (!uid) {
    return res.status(400).json({ message: "معرف Firebase أو Supabase مطلوب" });
  }

  try {
    // التحقق مما إذا كان المستخدم موجودًا بالفعل
    let user = null;

    // البحث عن المستخدم باستخدام معرف Firebase أو Supabase أو معرف Google أو البريد الإلكتروني
    if (uid) {
      if (isSupabase) {
        user = await User.findOne({ supabaseUid: uid });
      } else {
        user = await User.findOne({ firebaseUid: uid });
      }
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

      if (uid) {
        if (isSupabase && !user.supabaseUid) {
          user.supabaseUid = uid;
        } else if (!isSupabase && !user.firebaseUid) {
          user.firebaseUid = uid;
        }
      }

      if (image) {
        user.profilePicture = image;
      }

      await user.save();
      console.log("User updated successfully");
    } else {
      console.log("Creating new user");
      // إنشاء مستخدم جديد
      const userData = {
        name,
        phone: phone || "",
        email: email || "",
        userType,
        googleId,
        profilePicture: image || "",
        isActive: true,
        // لا نحتاج لكلمة مرور لأن المصادقة تتم عبر Firebase أو Supabase
        password:
          Math.random()
            .toString(36)
            .substring(2) +
          Math.random()
            .toString(36)
            .substring(2),
      };

      // تعيين معرف المصادقة المناسب
      if (isSupabase) {
        userData.supabaseUid = uid;
      } else {
        userData.firebaseUid = uid;
      }

      user = new User(userData);

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
        "professions specializations workRadius location bio features workingHours workingHoursArray streetsInWorkRange hospitalsInWorkRange mosquesInWorkRange neighborhoodsInWorkRange"
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
        workingHours: craftsmanInfo.workingHours || {},
        workingHoursArray: craftsmanInfo.workingHoursArray || [],
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

// إنشاء حساب أدمن جديد
exports.createAdminAccount = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, phone } = req.body;

  // استيراد نموذج الأدمن
  const Admin = require("../models/Admin");

  try {
    // التحقق من عدم وجود أدمن بنفس البريد الإلكتروني
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    // إنشاء أدمن جديد
    const adminData = {
      name,
      email,
      password, // سيتم تشفيرها تلقائياً في pre-save hook
      phone: phone || "",
      role: "admin",
      permissions: [
        "manage_users",
        "manage_craftsmen",
        "manage_bookings",
        "manage_content",
        "manage_professions",
        "manage_system",
      ],
      isActive: true,
    };

    const admin = new Admin(adminData);
    await admin.save();

    res.status(201).json({
      message: "تم إنشاء حساب الأدمن بنجاح",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        permissions: admin.permissions,
        image: admin.image,
      },
    });
  } catch (error) {
    console.error("خطأ في إنشاء حساب الأدمن:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
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

  // استيراد نموذج الأدمن
  const Admin = require("../models/Admin.js");

  // البحث عن الأدمن عن طريق البريد الإلكتروني
  const admin = await Admin.findOne({ email: username });
  if (!admin) {
    return res.status(401).json({ message: "بيانات الاعتماد غير صالحة" });
  }

  // التحقق من كلمة المرور
  const isMatch = await admin.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "بيانات الاعتماد غير صالحة" });
  }

  // التحقق مما إذا كان الأدمن نشطًا
  if (!admin.isActive) {
    return res.status(401).json({ message: "تم تعطيل حسابك" });
  }

  // تحديث آخر تسجيل دخول
  admin.lastLogin = new Date();
  await admin.save();

  // تحديد مدة صلاحية الرمز المميز بناءً على خيار "تذكرني"
  const expiresIn = rememberMe ? "30d" : "24h";

  // توليد الرمز المميز
  const token = jwt.sign(
    { id: admin._id, userType: "admin", role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  res.json({
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      permissions: admin.permissions,
      image: admin.image,
    },
    isAuthenticated: true,
    expiresIn,
  });
});

// تغيير كلمة مرور الأدمن
exports.changeAdminPassword = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;
  const adminId = req.user.id;

  // استيراد نموذج الأدمن
  const Admin = require("../models/Admin");

  // البحث عن الأدمن
  const admin = await Admin.findById(adminId);
  if (!admin) {
    return res.status(403).json({ message: "غير مصرح لك بتنفيذ هذه العملية" });
  }

  // التحقق من كلمة المرور الحالية
  const isMatch = await admin.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة" });
  }

  // تحديث كلمة المرور
  admin.password = newPassword;
  await admin.save();

  res.json({
    message: "تم تغيير كلمة المرور بنجاح",
    success: true,
  });
});

// اختبار اتصال HyperSender SMS
exports.testSMSConnection = asyncHandler(async (req, res) => {
  try {
    console.log("Testing HyperSender SMS connection...");

    const testResult = await hyperSenderService.testConnection();

    res.json({
      success: testResult.success,
      message: testResult.message,
      result: testResult.result || testResult.error,
      config: {
        apiToken: testResult.apiToken,
        apiUrl: testResult.apiUrl,
        senderId: testResult.senderId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error testing SMS connection:", error);
    res.status(500).json({
      success: false,
      message: "فشل في اختبار اتصال خدمة الرسائل النصية",
      error: error.message,
    });
  }
});

// إرسال رسالة اختبار لرقم حقيقي
exports.sendTestSMS = asyncHandler(async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "رقم الهاتف مطلوب",
      });
    }

    const testMessage =
      message || `اختبار من JobScope - ${new Date().toLocaleString("ar-SY")}`;

    console.log(`Sending test SMS to ${phone}: ${testMessage}`);

    const result = await hyperSenderService.sendSMS(phone, testMessage);

    res.json({
      success: result.success,
      message: result.success
        ? "تم إرسال الرسالة الاختبارية بنجاح"
        : "فشل في إرسال الرسالة الاختبارية",
      result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error sending test SMS:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إرسال الرسالة الاختبارية",
      error: error.message,
    });
  }
});

// الحصول على رصيد الحساب
exports.getSMSBalance = asyncHandler(async (req, res) => {
  try {
    console.log("Getting SMS account balance...");

    const balanceResult = await hyperSenderService.getAccountBalance();

    res.json({
      success: balanceResult.success,
      balance: balanceResult.balance,
      currency: balanceResult.currency,
      message: balanceResult.success
        ? "تم الحصول على الرصيد بنجاح"
        : "فشل في الحصول على الرصيد",
      error: balanceResult.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting SMS balance:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء الحصول على رصيد الحساب",
      error: error.message,
    });
  }
});

// إعادة تعيين كلمة المرور
exports.resetPassword = asyncHandler(async (req, res) => {
  const { phone, newPassword } = req.body;

  if (!phone || !newPassword) {
    return res.status(400).json({
      message: "رقم الهاتف وكلمة المرور الجديدة مطلوبان",
    });
  }

  // تنسيق رقم الهاتف
  function normalizePhone(p) {
    if (!p) return "";
    let phoneDigits = p.replace(/[^\d]/g, ""); // أرقام فقط
    if (phoneDigits.startsWith("963")) return "+" + phoneDigits;
    if (phoneDigits.startsWith("0")) return "+963" + phoneDigits.slice(1);
    if (phoneDigits.length === 9 && phoneDigits.startsWith("9"))
      return "+963" + phoneDigits;
    return phoneDigits;
  }

  const normalizedPhone = normalizePhone(phone);

  // البحث عن المستخدم بجميع الصيغ المحتملة لرقم الهاتف
  const possiblePhones = [
    phone,
    normalizedPhone,
    normalizedPhone.replace("+", ""),
    normalizedPhone.startsWith("+963") ? "0" + normalizedPhone.slice(4) : "",
  ].filter(Boolean);

  try {
    // البحث عن المستخدم
    const user = await User.findOne({
      phone: { $in: possiblePhones },
    });

    if (!user) {
      return res.status(404).json({
        message: "المستخدم غير موجود",
      });
    }

    // تحديث كلمة المرور
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إعادة تعيين كلمة المرور",
      error: error.message,
    });
  }
});
