const { validationResult } = require("express-validator");
const User = require("../models/user.model");
const Craftsman = require("../models/craftsman.model");
const { asyncHandler } = require("../middleware/error.middleware");

// Obtener todos los usuarios
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

// Obtener un usuario por ID
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  res.json(user);
});

// Actualizar perfil de usuario
exports.updateUserProfile = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, address, profilePicture, bio } = req.body;

  // Imprimir los datos recibidos para depuración
  console.log("Updating user profile with data:", {
    name,
    email,
    phone,
    address,
    bio,
    bioType: typeof bio,
    bioLength: bio ? bio.length : 0,
    hasProfilePicture: !!profilePicture,
    profilePictureLength: profilePicture ? profilePicture.length : 0,
  });

  // Buscar y actualizar usuario
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  // Actualizar campos
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  // تحديث النبذة إذا كانت موجودة
  if (bio !== undefined) {
    user.bio = bio;
    console.log("تم تحديث النبذة في ملف المستخدم:", bio);
  }

  // Manejar la imagen de perfil
  if (profilePicture) {
    // Verificar si es una URL o una imagen en base64
    if (profilePicture.startsWith("data:image")) {
      // Es una imagen en base64, necesitamos guardarla como archivo
      const base64Data = profilePicture.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Generar un nombre de archivo único
      const filename = `profile-${user._id}-${Date.now()}.png`;
      const filePath = `uploads/${filename}`;

      // Asegurarse de que el directorio existe
      const fs = require("fs");
      const path = require("path");
      const uploadDir = path.join(process.cwd(), "uploads");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Guardar el archivo
      fs.writeFileSync(path.join(process.cwd(), filePath), buffer);

      // Actualizar la URL de la imagen en el usuario
      user.profilePicture = `/${filePath}`;
      console.log("Saved profile picture to:", user.profilePicture);
    } else {
      // Es una URL, simplemente la guardamos
      user.profilePicture = profilePicture;
    }
  }

  await user.save();

  // Si el usuario es un artesano, actualizar también su dirección en el perfil de artesano
  if (user.userType === "craftsman" && address) {
    const craftsman = await Craftsman.findOne({ user: user._id });
    if (craftsman) {
      craftsman.address = address;
      await craftsman.save();
    }
  }

  // طباعة النبذة قبل إرجاع البيانات
  console.log("النبذة قبل إرجاع البيانات:", {
    bio: user.bio,
    bioType: typeof user.bio,
    bioLength: user.bio ? user.bio.length : 0,
  });

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    userType: user.userType,
    profilePicture: user.profilePicture,
    bio: user.bio || "", // إضافة النبذة إلى الاستجابة
  });
});

// Cambiar contraseña
exports.changePassword = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "بيانات غير صحيحة",
      errors: errors.array(),
    });
  }

  const { currentPassword, newPassword } = req.body;

  // Buscar usuario
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "المستخدم غير موجود" });
  }

  // التحقق من نوع المستخدم (Supabase أم عادي)
  if (user.firebaseUid || user.supabaseUid) {
    // مستخدم Supabase - نقوم بتحديث كلمة المرور مباشرة دون التحقق من كلمة المرور الحالية
    // لأن كلمة المرور مشفرة بطريقة مختلفة في Supabase
    console.log("تحديث كلمة المرور لمستخدم Supabase:", user.email);

    // تحديث كلمة المرور مباشرة
    user.password = newPassword;

    // إضافة حقل لتتبع آخر تغيير لكلمة المرور لإبطال الجلسات القديمة
    user.passwordChangedAt = new Date();

    await user.save();

    return res.json({
      message: "تم تغيير كلمة المرور بنجاح",
      success: true,
      isSupabaseUser: true,
      // إرسال إشارة للعميل لتسجيل الخروج وإعادة تسجيل الدخول
      requireReauth: true,
    });
  }

  // Verificar contraseña actual للمستخدمين العاديين فقط
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
  }

  // Actualizar contraseña للمستخدمين العاديين
  user.password = newPassword;

  // إضافة حقل لتتبع آخر تغيير لكلمة المرور لإبطال الجلسات القديمة
  user.passwordChangedAt = new Date();

  await user.save();

  res.json({
    message: "تم تغيير كلمة المرور بنجاح",
    success: true,
    // إرسال إشارة للعميل لتسجيل الخروج وإعادة تسجيل الدخول
    requireReauth: true,
  });
});

// Desactivar cuenta
exports.deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  user.isActive = false;
  await user.save();

  res.json({ message: "Cuenta desactivada correctamente" });
});

// Eliminar cuenta permanentemente
exports.deleteMyAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  try {
    // Si es un artesano, también eliminar su perfil de artesano
    if (user.userType === "craftsman") {
      await Craftsman.findOneAndDelete({ user: req.user._id });
    }

    // Aquí se pueden agregar más eliminaciones de datos relacionados
    // Por ejemplo: reservas, reseñas, notificaciones, etc.

    // Eliminar el usuario de la base de datos
    await User.findByIdAndDelete(req.user._id);

    res.json({
      message: "Cuenta eliminada permanentemente",
      success: true,
    });
  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    res.status(500).json({
      message: "Error interno del servidor al eliminar la cuenta",
    });
  }
});

// [Admin] Actualizar usuario
exports.adminUpdateUser = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, address, userType, isActive } = req.body;

  // Buscar y actualizar usuario
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  // Actualizar campos
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (userType) user.userType = userType;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  res.json(user);
});
