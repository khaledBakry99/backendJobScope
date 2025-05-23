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

  // تحويل البيانات إلى كائنات عادية للتعديل
  const craftsmenWithImages = craftsmen.map((craftsman) => {
    const craftsmanObj = craftsman.toObject();

    // إضافة حقل الصورة من بيانات المستخدم إذا كانت متوفرة
    if (craftsmanObj.user && craftsmanObj.user.profilePicture) {
      craftsmanObj.image = craftsmanObj.user.profilePicture;
    }

    // إضافة workingHoursArray إذا كانت workingHours موجودة
    if (craftsmanObj.workingHours) {
      // تحويل كائن ساعات العمل إلى مصفوفة، مع فلترة الأيام التي تم اختيارها فقط
      const workingHoursArray = Object.entries(craftsmanObj.workingHours)
        .filter(([_, data]) => data.isWorking) // فلترة الأيام التي تم اختيارها فقط
        .map(([day, data]) => ({
          day,
          isWorking: true, // نضمن أن isWorking هو true دائمًا للأيام المفلترة
          start: data.start || "",
          end: data.end || "",
        }));

      // إضافة مصفوفة ساعات العمل إلى الاستجابة
      craftsmanObj.workingHoursArray = workingHoursArray;
    }

    return craftsmanObj;
  });

  res.json(craftsmenWithImages);
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
    user: craftsman.user
      ? {
          id: craftsman.user._id,
          profilePicture: craftsman.user.profilePicture,
        }
      : null,
  });

  // تحويل البيانات إلى كائن عادي للتعديل
  const craftsmanObj = craftsman.toObject();

  // إضافة حقل الصورة من بيانات المستخدم إذا كانت متوفرة
  if (
    craftsmanObj.user &&
    craftsmanObj.user.profilePicture &&
    craftsmanObj.user.profilePicture !== ""
  ) {
    craftsmanObj.image = craftsmanObj.user.profilePicture;
  } else {
    // استخدام صورة افتراضية إذا لم تكن هناك صورة
    craftsmanObj.image = "/img/user-avatar.svg";
  }

  // إضافة workingHoursArray إذا كانت workingHours موجودة
  if (craftsmanObj.workingHours) {
    // تحويل كائن ساعات العمل إلى مصفوفة، مع فلترة الأيام التي تم اختيارها فقط
    const workingHoursArray = Object.entries(craftsmanObj.workingHours)
      .filter(([_, data]) => data.isWorking) // فلترة الأيام التي تم اختيارها فقط
      .map(([day, data]) => ({
        day,
        isWorking: true, // نضمن أن isWorking هو true دائمًا للأيام المفلترة
        start: data.start || "",
        end: data.end || "",
      }));

    // إضافة مصفوفة ساعات العمل إلى الاستجابة
    craftsmanObj.workingHoursArray = workingHoursArray;
    console.log(
      "تمت إضافة مصفوفة ساعات العمل إلى الاستجابة:",
      workingHoursArray
    );
  }

  res.json(craftsmanObj);
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

  // تحويل البيانات إلى كائن عادي للتعديل
  const craftsmanObj = craftsman.toObject();

  // التأكد من وجود خصائص
  if (!craftsmanObj.features) {
    console.log("إضافة مصفوفة خصائص فارغة في getMyProfile");
    craftsmanObj.features = [];
  } else if (!Array.isArray(craftsmanObj.features)) {
    console.log("تحويل الخصائص إلى مصفوفة في getMyProfile");
    craftsmanObj.features = [craftsmanObj.features];
  }

  // طباعة الخصائص بعد المعالجة
  console.log("الخصائص بعد المعالجة في getMyProfile:", {
    features: craftsmanObj.features,
    featuresType: typeof craftsmanObj.features,
    featuresIsArray: Array.isArray(craftsmanObj.features),
    featuresLength: craftsmanObj.features.length,
  });

  // إضافة حقل الصورة من بيانات المستخدم إذا كانت متوفرة
  if (
    craftsmanObj.user &&
    craftsmanObj.user.profilePicture &&
    craftsmanObj.user.profilePicture !== ""
  ) {
    craftsmanObj.image = craftsmanObj.user.profilePicture;
  } else {
    // استخدام صورة افتراضية إذا لم تكن هناك صورة
    craftsmanObj.image = "/img/user-avatar.svg";
  }

  // إضافة workingHoursArray إذا كانت workingHours موجودة
  if (craftsmanObj.workingHours) {
    // تحويل كائن ساعات العمل إلى مصفوفة، مع فلترة الأيام التي تم اختيارها فقط
    const workingHoursArray = Object.entries(craftsmanObj.workingHours)
      .filter(([_, data]) => data.isWorking) // فلترة الأيام التي تم اختيارها فقط
      .map(([day, data]) => ({
        day,
        isWorking: true, // نضمن أن isWorking هو true دائمًا للأيام المفلترة
        start: data.start || "",
        end: data.end || "",
      }));

    // إضافة مصفوفة ساعات العمل إلى الاستجابة
    craftsmanObj.workingHoursArray = workingHoursArray;
    console.log(
      "تمت إضافة مصفوفة ساعات العمل إلى الاستجابة في getMyProfile:",
      workingHoursArray
    );
  }

  res.json(craftsmanObj);
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

  // تحويل البيانات إلى كائنات عادية للتعديل
  const craftsmenWithImages = craftsmen.map((craftsman) => {
    const craftsmanObj = craftsman.toObject();

    // إضافة حقل الصورة من بيانات المستخدم إذا كانت متوفرة
    if (
      craftsmanObj.user &&
      craftsmanObj.user.profilePicture &&
      craftsmanObj.user.profilePicture !== ""
    ) {
      craftsmanObj.image = craftsmanObj.user.profilePicture;
    } else {
      // استخدام صورة افتراضية إذا لم تكن هناك صورة
      craftsmanObj.image = "/img/user-avatar.svg";
    }

    // إضافة workingHoursArray إذا كانت workingHours موجودة
    if (craftsmanObj.workingHours) {
      // تحويل كائن ساعات العمل إلى مصفوفة، مع فلترة الأيام التي تم اختيارها فقط
      const workingHoursArray = Object.entries(craftsmanObj.workingHours)
        .filter(([_, data]) => data.isWorking) // فلترة الأيام التي تم اختيارها فقط
        .map(([day, data]) => ({
          day,
          isWorking: true, // نضمن أن isWorking هو true دائمًا للأيام المفلترة
          start: data.start || "",
          end: data.end || "",
        }));

      // إضافة مصفوفة ساعات العمل إلى الاستجابة
      craftsmanObj.workingHoursArray = workingHoursArray;
    }

    return craftsmanObj;
  });

  res.json(craftsmenWithImages);
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
    features,
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

  // طباعة النبذة للتصحيح
  console.log("النبذة المستلمة في updateCraftsmanProfile:", {
    receivedBio: bio,
    currentBio: craftsman.bio,
    bioType: typeof bio,
    bioLength: bio ? bio.length : 0,
    bioEmpty: bio === "",
    bioUndefined: bio === undefined,
    bioNull: bio === null,
  });

  // تحديث النبذة فقط إذا كانت موجودة وليست فارغة
  if (bio !== undefined) {
    craftsman.bio = bio;
    console.log("تم تحديث النبذة إلى:", bio);
  }

  // التأكد من أن الخصائص مصفوفة
  if (features) {
    // تحويل الخصائص الجديدة إلى مصفوفة إذا لم تكن كذلك
    const newFeatures = Array.isArray(features) ? features : [features];

    // التأكد من أن الخصائص الحالية مصفوفة
    if (!craftsman.features) {
      craftsman.features = [];
    } else if (!Array.isArray(craftsman.features)) {
      craftsman.features = [craftsman.features];
    }

    // دمج الخصائص الجديدة مع الخصائص الحالية وإزالة التكرارات
    const uniqueFeatures = [
      ...new Set([...craftsman.features, ...newFeatures]),
    ];
    craftsman.features = uniqueFeatures;

    console.log("تم تحديث الخصائص في updateCraftsmanProfile:", {
      features: craftsman.features,
      featuresType: typeof craftsman.features,
      featuresIsArray: Array.isArray(craftsman.features),
      featuresLength: craftsman.features.length,
    });
  }

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

  // تحسين معالجة ساعات العمل
  if (workingHours) {
    // التأكد من أن كل يوم له قيمة isWorking منطقية صريحة
    const normalizedWorkingHours = {};

    Object.keys(workingHours).forEach((day) => {
      const dayData = workingHours[day];
      normalizedWorkingHours[day] = {
        // تحويل isWorking إلى قيمة منطقية صريحة
        isWorking: dayData.isWorking === true,
        start: dayData.start || "",
        end: dayData.end || "",
      };
    });

    // طباعة ساعات العمل المعالجة للتصحيح
    console.log(
      "ساعات العمل بعد المعالجة:",
      JSON.stringify(normalizedWorkingHours)
    );

    craftsman.workingHours = normalizedWorkingHours;
  }

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

  // تحويل البيانات إلى كائن عادي للتعديل
  const craftsmanObj = craftsman.toObject();

  // طباعة النبذة في الكائن المحول للتصحيح
  console.log("النبذة في الكائن المحول:", {
    bioInCraftsmanObj: craftsmanObj.bio,
    bioInCraftsman: craftsman.bio,
    bioType: typeof craftsmanObj.bio,
    bioLength: craftsmanObj.bio ? craftsmanObj.bio.length : 0,
  });

  // إضافة حقل الصورة من بيانات المستخدم إذا كانت متوفرة
  if (
    craftsmanObj.user &&
    craftsmanObj.user.profilePicture &&
    craftsmanObj.user.profilePicture !== ""
  ) {
    craftsmanObj.image = craftsmanObj.user.profilePicture;
  } else {
    // استخدام صورة افتراضية إذا لم تكن هناك صورة
    craftsmanObj.image = "/img/user-avatar.svg";
  }

  // إضافة workingHoursArray إذا كانت workingHours موجودة
  if (craftsmanObj.workingHours) {
    // تحويل كائن ساعات العمل إلى مصفوفة، مع فلترة الأيام التي تم اختيارها فقط
    const workingHoursArray = Object.entries(craftsmanObj.workingHours)
      .filter(([_, data]) => data.isWorking) // فلترة الأيام التي تم اختيارها فقط
      .map(([day, data]) => ({
        day,
        isWorking: true, // نضمن أن isWorking هو true دائمًا للأيام المفلترة
        start: data.start || "",
        end: data.end || "",
      }));

    // إضافة مصفوفة ساعات العمل إلى الاستجابة
    craftsmanObj.workingHoursArray = workingHoursArray;
    console.log(
      "تمت إضافة مصفوفة ساعات العمل إلى الاستجابة في updateCraftsmanProfile:",
      workingHoursArray
    );
  }

  // طباعة النبذة قبل إرجاع البيانات
  console.log("النبذة قبل إرجاع البيانات:", {
    bioInCraftsmanObj: craftsmanObj.bio,
    bioType: typeof craftsmanObj.bio,
    bioLength: craftsmanObj.bio ? craftsmanObj.bio.length : 0,
  });

  res.json(craftsmanObj);
});

// Actualizar galería de trabajos
exports.updateWorkGallery = asyncHandler(async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { workGallery } = req.body;

  console.log("Solicitud de actualización de galería recibida:", {
    userId: req.user.id || req.user._id,
    workGalleryLength: workGallery ? workGallery.length : 0,
  });

  // Buscar perfil de artesano
  let craftsman = await Craftsman.findOne({ user: req.user._id });

  if (!craftsman) {
    console.log(
      "Perfil de artesano no encontrado con user._id, intentando con user.id"
    );
    craftsman = await Craftsman.findOne({ user: req.user.id });

    if (!craftsman) {
      console.log("Perfil de artesano no encontrado con ningún ID");
      return res
        .status(404)
        .json({ message: "Perfil de artesano no encontrado" });
    }
  }

  // Filtrar URLs vacías o inválidas
  const validGallery = Array.isArray(workGallery)
    ? workGallery.filter((url) => url && url !== "undefined" && url !== "null")
    : [];

  console.log("Galería filtrada:", {
    original: workGallery ? workGallery.length : 0,
    filtered: validGallery.length,
  });

  // Actualizar galería
  craftsman.workGallery = validGallery;
  await craftsman.save();

  console.log("Galería actualizada con éxito:", {
    craftsmanId: craftsman._id,
    gallerySize: craftsman.workGallery.length,
  });

  // تحويل البيانات إلى كائن عادي للتعديل
  const craftsmanObj = craftsman.toObject();

  // إضافة حقل الصورة من بيانات المستخدم إذا كانت متوفرة
  if (
    craftsmanObj.user &&
    craftsmanObj.user.profilePicture &&
    craftsmanObj.user.profilePicture !== ""
  ) {
    craftsmanObj.image = craftsmanObj.user.profilePicture;
  } else {
    // استخدام صورة افتراضية إذا لم تكن هناك صورة
    craftsmanObj.image = "/img/user-avatar.svg";
  }

  // إضافة معرض الأعمال للاستجابة بكلا الاسمين للتوافق
  craftsmanObj.gallery = craftsman.workGallery;
  craftsmanObj.workGallery = craftsman.workGallery;

  res.json(craftsmanObj);
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

// الحصول على معرض أعمال الحرفي
exports.getCraftsmanGallery = asyncHandler(async (req, res) => {
  // يمكن أن يكون المعرف هو معرف المستخدم أو معرف الحرفي
  let craftsman;

  try {
    console.log("طلب الحصول على معرض الأعمال للحرفي:", {
      id: req.params.id,
      path: req.originalUrl,
    });

    // أولاً نحاول البحث باستخدام معرف الحرفي
    craftsman = await Craftsman.findById(req.params.id);

    if (craftsman) {
      console.log("تم العثور على الحرفي باستخدام معرف الحرفي");
    } else {
      console.log(
        "لم يتم العثور على الحرفي باستخدام معرف الحرفي، محاولة البحث باستخدام معرف المستخدم"
      );
      // إذا لم نجد الحرفي، نحاول البحث باستخدام معرف المستخدم
      craftsman = await Craftsman.findOne({ user: req.params.id });
    }

    if (!craftsman) {
      console.log("لم يتم العثور على الحرفي باستخدام أي من المعرفات");
      return res.status(404).json({ message: "Artesano no encontrado" });
    }

    // طباعة معلومات التصحيح
    console.log("تم العثور على الحرفي في getCraftsmanGallery:", {
      id: craftsman._id,
      userId: craftsman.user,
      workGallery: craftsman.workGallery ? craftsman.workGallery.length : 0,
    });

    // تصفية أي مسارات فارغة أو غير صالحة
    const validGallery = Array.isArray(craftsman.workGallery)
      ? craftsman.workGallery.filter(
          (url) => url && url !== "undefined" && url !== "null"
        )
      : [];

    console.log("معرض الصور بعد التصفية:", {
      original: craftsman.workGallery ? craftsman.workGallery.length : 0,
      filtered: validGallery.length,
    });

    // إذا كان هناك اختلاف بين المعرض الأصلي والمعرض المصفى، قم بتحديث المعرض في قاعدة البيانات
    if (
      validGallery.length !==
      (craftsman.workGallery ? craftsman.workGallery.length : 0)
    ) {
      console.log("تحديث معرض الصور في قاعدة البيانات بعد التصفية");
      craftsman.workGallery = validGallery;
      await craftsman.save();
    }

    // إرجاع معرض الأعمال مع دعم الاسمين (gallery و workGallery) للتوافق
    res.json({
      gallery: validGallery,
      workGallery: validGallery,
    });
  } catch (error) {
    console.error("خطأ في الحصول على معرض الأعمال:", error);
    res.status(500).json({
      message: "Error al obtener la galería",
      error: error.message,
      stack: error.stack,
    });
  }
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
