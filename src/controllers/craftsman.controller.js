const { validationResult } = require("express-validator");
const Craftsman = require("../models/craftsman.model");
const User = require("../models/user.model");
const Review = require("../models/review.model");
const { asyncHandler } = require("../middleware/error.middleware");
const { calculateDistance } = require("../utils/geo.utils");

// Obtener todos los artesanos
exports.getAllCraftsmen = asyncHandler(async (req, res) => {
  const craftsmen = await Craftsman.find()
    .populate("user", "name email phone profilePicture")
    .sort({ createdAt: -1 });

  res.json(craftsmen);
});

// Obtener un artesano por ID
exports.getCraftsmanById = asyncHandler(async (req, res) => {
  const craftsman = await Craftsman.findById(req.params.id).populate(
    "user",
    "name email phone profilePicture"
  );

  if (!craftsman) {
    return res.status(404).json({ message: "Artesano no encontrado" });
  }

  // طباعة بيانات الحرفي للتأكد من استرجاعها بشكل صحيح
  console.log("Craftsman data retrieved:", {
    id: craftsman._id,
    location: craftsman.location,
    workRadius: craftsman.workRadius,
    streetsInWorkRange: craftsman.streetsInWorkRange,
    hospitalsInWorkRange: craftsman.hospitalsInWorkRange,
    mosquesInWorkRange: craftsman.mosquesInWorkRange,
    neighborhoodsInWorkRange: craftsman.neighborhoodsInWorkRange,
  });

  res.json(craftsman);
});

// Obtener perfil de artesano del usuario actual
exports.getMyProfile = asyncHandler(async (req, res) => {
  const craftsman = await Craftsman.findOne({ user: req.user._id }).populate(
    "user",
    "name email phone profilePicture"
  );

  if (!craftsman) {
    return res
      .status(404)
      .json({ message: "Perfil de artesano no encontrado" });
  }

  res.json(craftsman);
});

// Buscar artesanos
exports.searchCraftsmen = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    professions,
    specializations,
    rating,
    available,
    location,
    radius,
    street, // إضافة اسم الشارع للبحث
    neighborhood, // إضافة اسم الحي للبحث
  } = req.body;

  // Construir consulta
  let query = {};

  // Filtrar por profesiones
  if (professions && professions.length > 0) {
    query.professions = { $in: professions };
  }

  // Filtrar por especializaciones
  if (specializations && specializations.length > 0) {
    query.specializations = { $in: specializations };
  }

  // Filtrar por calificación
  if (rating) {
    query.rating = { $gte: parseFloat(rating) };
  }

  // Filtrar por disponibilidad
  if (available !== undefined) {
    query.available = available;
  }

  // Filtrar por nombre de calle
  if (street) {
    query.streetsInWorkRange = { $in: [street] };
  }

  // Filtrar por nombre de barrio
  if (neighborhood) {
    query.neighborhoodsInWorkRange = { $in: [neighborhood] };
  }

  // Buscar artesanos que coincidan con la consulta
  let craftsmen = await Craftsman.find(query)
    .populate("user", "name email phone profilePicture")
    .sort({ rating: -1 });

  // Filtrar por ubicación y radio
  if (location && radius) {
    const { lat, lng } = location;
    const maxDistance = parseFloat(radius);

    // Filtrar artesanos por distancia
    craftsmen = craftsmen.filter((craftsman) => {
      if (!craftsman.location) return false;

      // Calcular distancia entre dos puntos
      const distance = calculateDistance(
        lat,
        lng,
        craftsman.location.lat,
        craftsman.location.lng
      );

      return distance <= maxDistance;
    });

    // إذا كان هناك موقع ونطاق ولكن لم يتم تحديد شارع أو حي، قم بالبحث عن الشوارع والأحياء في هذا النطاق
    if (!street && !neighborhood) {
      try {
        // الحصول على الشوارع والأحياء ضمن نطاق البحث
        const { getStreetsInRadius } = require("../utils/geo.utils");
        const placesData = await getStreetsInRadius(lat, lng, maxDistance);

        // بيانات الأحياء في دمشق وضواحيها مع إحداثياتها
        const neighborhoods = [
          { name: "المزة", lat: 33.5038, lng: 36.2478 },
          { name: "المالكي", lat: 33.5125, lng: 36.2789 },
          { name: "أبو رمانة", lat: 33.5167, lng: 36.2833 },
          { name: "الروضة", lat: 33.5189, lng: 36.3033 },
          { name: "كفرسوسة", lat: 33.4978, lng: 36.2689 },
          { name: "المهاجرين", lat: 33.5256, lng: 36.2922 },
          { name: "دمر", lat: 33.5367, lng: 36.2256 },
          { name: "قدسيا", lat: 33.5578, lng: 36.2389 },
          { name: "برزة", lat: 33.5456, lng: 36.3256 },
          { name: "ركن الدين", lat: 33.5367, lng: 36.3056 },
          { name: "الميدان", lat: 33.4889, lng: 36.3022 },
          { name: "القابون", lat: 33.5367, lng: 36.3322 },
          { name: "جوبر", lat: 33.5289, lng: 36.3389 },
          { name: "الشعلان", lat: 33.5133, lng: 36.2922 },
          { name: "الصالحية", lat: 33.5178, lng: 36.2978 },
        ];

        // تصفية الأحياء حسب المسافة
        const neighborhoodsInRadius = neighborhoods
          .filter((neighborhood) => {
            const distance = calculateDistance(
              lat,
              lng,
              neighborhood.lat,
              neighborhood.lng
            );
            return distance <= maxDistance;
          })
          .map((neighborhood) => neighborhood.name);

        // البحث عن الحرفيين الذين يعملون في هذه الشوارع أو الأحياء
        const streetsAndNeighborhoods = [
          ...placesData.streets,
          ...placesData.hospitals.map((h) => `مشفى ${h}`),
          ...placesData.mosques.map((m) => `جامع ${m}`),
          ...neighborhoodsInRadius,
        ];

        if (streetsAndNeighborhoods.length > 0) {
          // الحصول على الحرفيين الذين يعملون في هذه الشوارع أو الأحياء
          const craftsmenByStreets = await Craftsman.find({
            $or: [
              { streetsInWorkRange: { $in: placesData.streets } },
              { hospitalsInWorkRange: { $in: placesData.hospitals } },
              { mosquesInWorkRange: { $in: placesData.mosques } },
              { neighborhoodsInWorkRange: { $in: neighborhoodsInRadius } },
            ],
            ...query, // إضافة باقي شروط البحث
          }).populate("user", "name email phone profilePicture");

          // دمج النتائج وإزالة التكرارات
          const craftsmenIds = new Set(craftsmen.map((c) => c._id.toString()));

          for (const c of craftsmenByStreets) {
            if (!craftsmenIds.has(c._id.toString())) {
              craftsmen.push(c);
              craftsmenIds.add(c._id.toString());
            }
          }

          // إعادة ترتيب النتائج حسب التقييم
          craftsmen.sort((a, b) => b.rating - a.rating);
        }
      } catch (error) {
        console.error("خطأ في البحث عن الشوارع والأحياء:", error);
        // لا نريد إيقاف عملية البحث إذا فشل البحث عن الشوارع والأحياء
      }
    }
  }

  res.json(craftsmen);
});

// Actualizar perfil de artesano
exports.updateCraftsmanProfile = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    professions,
    specializations,
    bio,
    workRadius,
    location,
    address,
    available,
    workingHours,
  } = req.body;

  // Buscar perfil de artesano
  let craftsman = await Craftsman.findOne({ user: req.user._id });

  if (!craftsman) {
    return res
      .status(404)
      .json({ message: "Perfil de artesano no encontrado" });
  }

  // Actualizar campos
  if (professions) craftsman.professions = professions;
  if (specializations) craftsman.specializations = specializations;
  if (bio) craftsman.bio = bio;

  // تحديث نطاق العمل والموقع
  let shouldUpdateStreets = false;

  if (workRadius) {
    craftsman.workRadius = workRadius;
    shouldUpdateStreets = true;
  }

  if (location) {
    craftsman.location = location;
    shouldUpdateStreets = true;
  }

  if (address) {
    craftsman.address = address;

    // Actualizar también la dirección en el perfil de usuario
    await User.findByIdAndUpdate(req.user._id, { address });
  }

  if (available !== undefined) craftsman.available = available;
  if (workingHours) craftsman.workingHours = workingHours;

  // إذا تم تغيير الموقع أو نطاق العمل، قم بتحديث الشوارع والأحياء
  if (shouldUpdateStreets && craftsman.location && craftsman.workRadius) {
    try {
      // الحصول على الشوارع والمستشفيات والمساجد ضمن نطاق العمل
      const { getStreetsInRadius } = require("../utils/geo.utils");
      const placesData = await getStreetsInRadius(
        craftsman.location.lat,
        craftsman.location.lng,
        craftsman.workRadius
      );

      // تحديث الشوارع والمستشفيات والمساجد في ملف الحرفي
      craftsman.streetsInWorkRange = placesData.streets || [];
      craftsman.hospitalsInWorkRange = placesData.hospitals || [];
      craftsman.mosquesInWorkRange = placesData.mosques || [];

      // الحصول على الأحياء ضمن نطاق العمل
      const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // نصف قطر الأرض بالكيلومتر
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // المسافة بالكيلومتر
        return distance;
      };

      // بيانات الأحياء في دمشق وضواحيها مع إحداثياتها
      const neighborhoods = [
        { name: "المزة", lat: 33.5038, lng: 36.2478 },
        { name: "المالكي", lat: 33.5125, lng: 36.2789 },
        { name: "أبو رمانة", lat: 33.5167, lng: 36.2833 },
        { name: "الروضة", lat: 33.5189, lng: 36.3033 },
        { name: "كفرسوسة", lat: 33.4978, lng: 36.2689 },
        { name: "المهاجرين", lat: 33.5256, lng: 36.2922 },
        { name: "دمر", lat: 33.5367, lng: 36.2256 },
        { name: "قدسيا", lat: 33.5578, lng: 36.2389 },
        { name: "برزة", lat: 33.5456, lng: 36.3256 },
        { name: "ركن الدين", lat: 33.5367, lng: 36.3056 },
        { name: "الميدان", lat: 33.4889, lng: 36.3022 },
        { name: "القابون", lat: 33.5367, lng: 36.3322 },
        { name: "جوبر", lat: 33.5289, lng: 36.3389 },
        { name: "الشعلان", lat: 33.5133, lng: 36.2922 },
        { name: "الصالحية", lat: 33.5178, lng: 36.2978 },
      ];

      // تصفية الأحياء حسب المسافة
      const neighborhoodsInRadius = neighborhoods
        .filter((neighborhood) => {
          const distance = calculateDistance(
            craftsman.location.lat,
            craftsman.location.lng,
            neighborhood.lat,
            neighborhood.lng
          );
          return distance <= craftsman.workRadius;
        })
        .map((neighborhood) => neighborhood.name);

      craftsman.neighborhoodsInWorkRange = neighborhoodsInRadius;
    } catch (error) {
      console.error("خطأ في تحديث الشوارع والأحياء:", error);
      // لا نريد إيقاف عملية التحديث إذا فشل تحديث الشوارع
    }
  }

  await craftsman.save();

  res.json(craftsman);
});

// Actualizar galería de trabajos
exports.updateWorkGallery = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { workGallery } = req.body;

  // Buscar perfil de artesano
  let craftsman = await Craftsman.findOne({ user: req.user._id });

  if (!craftsman) {
    return res
      .status(404)
      .json({ message: "Perfil de artesano no encontrado" });
  }

  // Actualizar galería
  craftsman.workGallery = workGallery;
  await craftsman.save();

  res.json(craftsman);
});

// Actualizar disponibilidad
exports.updateAvailability = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { available } = req.body;

  // Buscar perfil de artesano
  let craftsman = await Craftsman.findOne({ user: req.user._id });

  if (!craftsman) {
    return res
      .status(404)
      .json({ message: "Perfil de artesano no encontrado" });
  }

  // Actualizar disponibilidad
  craftsman.available = available;
  await craftsman.save();

  res.json({ available: craftsman.available });
});

// الحصول على الشوارع ضمن نطاق عمل الحرفي
exports.getStreetsInWorkRange = asyncHandler(async (req, res) => {
  const craftsman = await Craftsman.findById(req.params.id);

  if (!craftsman) {
    return res.status(404).json({ message: "Artesano no encontrado" });
  }

  // تجميع كل البيانات المكانية
  const data = {
    streets: craftsman.streetsInWorkRange || [],
    hospitals: craftsman.hospitalsInWorkRange || [],
    mosques: craftsman.mosquesInWorkRange || [],
    neighborhoods: craftsman.neighborhoodsInWorkRange || [],
    workRadius: craftsman.workRadius,
    location: craftsman.location,
  };

  res.json(data);
});

// تحديث الشوارع ضمن نطاق عمل الحرفي
exports.updateStreetsInWorkRange = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // البحث عن ملف الشخصي للحرفي
  let craftsman = await Craftsman.findOne({ user: req.user._id });

  if (!craftsman) {
    return res
      .status(404)
      .json({ message: "Perfil de artesano no encontrado" });
  }

  if (!craftsman.location || !craftsman.workRadius) {
    return res.status(400).json({
      message: "Debe establecer la ubicación y el radio de trabajo primero",
    });
  }

  try {
    // الحصول على الشوارع والمستشفيات والمساجد ضمن نطاق العمل
    const { getStreetsInRadius } = require("../utils/geo.utils");
    const placesData = await getStreetsInRadius(
      craftsman.location.lat,
      craftsman.location.lng,
      craftsman.workRadius
    );

    // تحديث الشوارع والمستشفيات والمساجد في ملف الحرفي
    craftsman.streetsInWorkRange = placesData.streets || [];
    craftsman.hospitalsInWorkRange = placesData.hospitals || [];
    craftsman.mosquesInWorkRange = placesData.mosques || [];

    // الحصول على الأحياء ضمن نطاق العمل
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // نصف قطر الأرض بالكيلومتر
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // المسافة بالكيلومتر
      return distance;
    };

    // بيانات الأحياء في دمشق وضواحيها مع إحداثياتها
    const neighborhoods = [
      { name: "المزة", lat: 33.5038, lng: 36.2478 },
      { name: "المالكي", lat: 33.5125, lng: 36.2789 },
      { name: "أبو رمانة", lat: 33.5167, lng: 36.2833 },
      { name: "الروضة", lat: 33.5189, lng: 36.3033 },
      { name: "كفرسوسة", lat: 33.4978, lng: 36.2689 },
      { name: "المهاجرين", lat: 33.5256, lng: 36.2922 },
      { name: "دمر", lat: 33.5367, lng: 36.2256 },
      { name: "قدسيا", lat: 33.5578, lng: 36.2389 },
      { name: "برزة", lat: 33.5456, lng: 36.3256 },
      { name: "ركن الدين", lat: 33.5367, lng: 36.3056 },
      { name: "الميدان", lat: 33.4889, lng: 36.3022 },
      { name: "القابون", lat: 33.5367, lng: 36.3322 },
      { name: "جوبر", lat: 33.5289, lng: 36.3389 },
      { name: "الشعلان", lat: 33.5133, lng: 36.2922 },
      { name: "الصالحية", lat: 33.5178, lng: 36.2978 },
    ];

    // تصفية الأحياء حسب المسافة
    const neighborhoodsInRadius = neighborhoods
      .filter((neighborhood) => {
        const distance = calculateDistance(
          craftsman.location.lat,
          craftsman.location.lng,
          neighborhood.lat,
          neighborhood.lng
        );
        return distance <= craftsman.workRadius;
      })
      .map((neighborhood) => neighborhood.name);

    craftsman.neighborhoodsInWorkRange = neighborhoodsInRadius;

    await craftsman.save();

    // تجميع كل البيانات المكانية
    const data = {
      streets: craftsman.streetsInWorkRange,
      hospitals: craftsman.hospitalsInWorkRange,
      mosques: craftsman.mosquesInWorkRange,
      neighborhoods: craftsman.neighborhoodsInWorkRange,
      workRadius: craftsman.workRadius,
      location: craftsman.location,
    };

    res.json(data);
  } catch (error) {
    console.error("خطأ في تحديث الشوارع والأحياء:", error);
    res
      .status(500)
      .json({ message: "Error al actualizar las calles y barrios" });
  }
});
