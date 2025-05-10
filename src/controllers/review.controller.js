const { validationResult } = require("express-validator");
const Review = require("../models/review.model");
const Booking = require("../models/booking.model");
const Craftsman = require("../models/craftsman.model");
const Notification = require("../models/notification.model");
const { asyncHandler } = require("../middleware/error.middleware");

// Crear una nueva reseña
exports.createReview = asyncHandler(async (req, res) => {
  console.log("بيانات التقييم المستلمة:", JSON.stringify(req.body, null, 2));
  console.log("معلومات المستخدم:", req.user ? req.user._id : "غير متاح");

  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("أخطاء التحقق من الصحة:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // التحقق من وجود جميع الحقول المطلوبة
    const requiredFields = [
      "booking",
      "client",
      "craftsman",
      "overallRating",
      "qualityRating",
      "punctualityRating",
      "priceRating",
      "communicationRating",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      console.error("الحقول المفقودة:", missingFields);
      return res
        .status(400)
        .json({
          message: `الحقول التالية مطلوبة: ${missingFields.join(", ")}`,
        });
    }

    const {
      booking: bookingId,
      client: clientId,
      craftsman: craftsmanId,
      overallRating,
      qualityRating,
      punctualityRating,
      priceRating,
      communicationRating,
      comment,
      images,
    } = req.body;

    console.log("معرفات التقييم:", { bookingId, clientId, craftsmanId });

    // Verificar que la reserva existe
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.error("الحجز غير موجود:", bookingId);
      return res.status(404).json({ message: "الحجز غير موجود" });
    }
    console.log("تم العثور على الحجز:", booking._id);

    // التحقق من أن المستخدم هو العميل في الحجز
    // نتحقق من المستخدم المصرح له أو نستخدم معرف العميل المرسل
    const userToCheck = req.user ? req.user._id : clientId;

    // التحقق من تطابق معرفات العملاء
    const clientIdFromBooking = booking.client.toString();
    const userIdToCheck = userToCheck.toString();

    console.log("مقارنة معرفات العملاء:", {
      clientIdFromBooking,
      userIdToCheck,
      isEqual: clientIdFromBooking === userIdToCheck,
    });

    if (clientIdFromBooking !== userIdToCheck) {
      console.error(
        "غير مصرح به: معرف العميل لا يتطابق مع معرف المستخدم في الحجز"
      );
      return res
        .status(403)
        .json({
          message:
            "غير مصرح به: معرف العميل لا يتطابق مع معرف المستخدم في الحجز",
        });
    }

    // التحقق من حالة الحجز
    console.log("حالة الحجز:", booking.status);
    const allowedStatuses = ["completed", "accepted", "rejected", "cancelled"];
    if (!allowedStatuses.includes(booking.status)) {
      console.error("حالة الحجز غير مسموح بها للتقييم:", booking.status);
      return res
        .status(400)
        .json({ message: `لا يمكن تقييم الحجوزات في حالة ${booking.status}` });
    }

    // التحقق من عدم وجود تقييم سابق للحجز
    if (booking.reviewId) {
      console.error("الحجز لديه تقييم بالفعل:", booking.reviewId);
      return res.status(400).json({ message: "هذا الحجز لديه تقييم بالفعل" });
    }

    // التحقق من وجود الحرفي
    const craftsman = await Craftsman.findById(craftsmanId);
    if (!craftsman) {
      console.error("الحرفي غير موجود:", craftsmanId);
      return res.status(404).json({ message: "الحرفي غير موجود" });
    }
    console.log("تم العثور على الحرفي:", craftsman._id);

    // إنشاء التقييم
    const review = new Review({
      booking: bookingId,
      client: clientId,
      craftsman: craftsmanId,
      overallRating,
      qualityRating,
      punctualityRating,
      priceRating,
      communicationRating,
      comment,
      images: images || [],
    });

    console.log("التقييم قبل الحفظ:", {
      booking: review.booking,
      client: review.client,
      craftsman: review.craftsman,
      ratings: {
        overall: review.overallRating,
        quality: review.qualityRating,
        punctuality: review.punctualityRating,
        price: review.priceRating,
        communication: review.communicationRating,
      },
    });

    await review.save();
    console.log("تم حفظ التقييم بنجاح:", review._id);

    // تحديث الحجز بمعرف التقييم
    booking.reviewId = review._id;
    await booking.save();
    console.log("تم تحديث الحجز بمعرف التقييم:", booking.reviewId);

    // تحديث تقييم الحرفي
    try {
      const craftsmanToUpdate = await Craftsman.findById(craftsmanId);
      if (craftsmanToUpdate) {
        console.log("تحديث تقييم الحرفي:", craftsmanId);

        // الحصول على جميع تقييمات الحرفي
        const reviews = await Review.find({ craftsman: craftsmanId });

        // حساب متوسط التقييم
        const totalRating = reviews.reduce(
          (sum, review) => sum + review.overallRating,
          0
        );
        const averageRating = totalRating / reviews.length;

        // تحديث بيانات الحرفي
        craftsmanToUpdate.rating = averageRating;
        craftsmanToUpdate.reviewCount = reviews.length;
        await craftsmanToUpdate.save();

        console.log("تم تحديث تقييم الحرفي:", {
          averageRating,
          reviewCount: reviews.length,
        });
      }

      // إنشاء إشعار للحرفي
      if (craftsman && craftsman.user) {
        console.log("إنشاء إشعار للحرفي:", craftsman.user);

        const notification = new Notification({
          user: craftsman.user,
          type: "review_received",
          title: "تقييم جديد",
          message: `لقد تلقيت تقييمًا جديدًا بدرجة ${overallRating}/5`,
          data: {
            bookingId: booking._id,
            reviewId: review._id,
          },
          icon: "star",
        });

        await notification.save();
        console.log("تم إنشاء الإشعار بنجاح:", notification._id);
      }

      // إرجاع التقييم كاستجابة
      console.log("إرجاع التقييم كاستجابة:", review._id);
      return res.status(201).json(review);
    } catch (error) {
      console.error("خطأ أثناء تحديث تقييم الحرفي أو إنشاء الإشعار:", error);
      // لا نريد إرجاع خطأ هنا لأن التقييم تم إنشاؤه بالفعل
    }
  } catch (error) {
    console.error("خطأ أثناء إنشاء التقييم:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء إنشاء التقييم",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Obtener reseñas de un artesano
exports.getCraftsmanReviews = asyncHandler(async (req, res) => {
  const craftsmanId = req.params.craftsmanId;

  // Verificar que el artesano existe
  const craftsman = await Craftsman.findById(craftsmanId);
  if (!craftsman) {
    return res.status(404).json({ message: "Artesano no encontrado" });
  }

  // Obtener las reseñas
  const reviews = await Review.find({ craftsman: craftsmanId })
    .populate("client", "name profilePicture")
    .sort({ createdAt: -1 });

  res.json(reviews);
});

// Obtener una reseña por ID
exports.getReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate("client", "name profilePicture")
    .populate({
      path: "craftsman",
      populate: {
        path: "user",
        select: "name",
      },
    })
    .populate("booking");

  if (!review) {
    return res.status(404).json({ message: "Reseña no encontrada" });
  }

  res.json(review);
});

// Obtener calificaciones detalladas de un artesano
exports.getCraftsmanDetailedRatings = asyncHandler(async (req, res) => {
  const craftsmanId = req.params.craftsmanId;

  // Verificar que el artesano existe
  const craftsman = await Craftsman.findById(craftsmanId);
  if (!craftsman) {
    return res.status(404).json({ message: "Artesano no encontrado" });
  }

  // Obtener las reseñas
  const reviews = await Review.find({ craftsman: craftsmanId });

  if (reviews.length === 0) {
    return res.json({
      quality: 0,
      punctuality: 0,
      price: 0,
      communication: 0,
      overall: 0,
      count: 0,
    });
  }

  // Calcular promedios para cada criterio
  const quality =
    reviews.reduce((acc, review) => acc + review.qualityRating, 0) /
    reviews.length;
  const punctuality =
    reviews.reduce((acc, review) => acc + review.punctualityRating, 0) /
    reviews.length;
  const price =
    reviews.reduce((acc, review) => acc + review.priceRating, 0) /
    reviews.length;
  const communication =
    reviews.reduce((acc, review) => acc + review.communicationRating, 0) /
    reviews.length;
  const overall =
    reviews.reduce((acc, review) => acc + review.overallRating, 0) /
    reviews.length;

  res.json({
    quality: quality.toFixed(1),
    punctuality: punctuality.toFixed(1),
    price: price.toFixed(1),
    communication: communication.toFixed(1),
    overall: overall.toFixed(1),
    count: reviews.length,
  });
});
