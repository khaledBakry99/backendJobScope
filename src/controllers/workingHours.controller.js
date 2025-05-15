const { validationResult } = require("express-validator");
const Craftsman = require("../models/craftsman.model");
const { asyncHandler } = require("../middleware/error.middleware");
const mongoose = require("mongoose");

// تحديث ساعات العمل للحرفي
exports.updateWorkingHours = asyncHandler(async (req, res) => {
  // التحقق من صحة البيانات المدخلة
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { workingHours } = req.body;

  try {
    // البحث عن الحرفي
    const craftsman = await Craftsman.findOne({ user: req.user._id });
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على الحرفي" });
    }

    // تحويل ساعات العمل إلى الصيغة المناسبة للتخزين
    const normalizedWorkingHours = {};
    const workingHoursArray = [];

    // التحقق من وجود ساعات العمل
    if (workingHours && typeof workingHours === "object") {
      // معالجة كل يوم من أيام الأسبوع
      const days = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      days.forEach((day) => {
        // التأكد من وجود بيانات لهذا اليوم
        if (workingHours[day]) {
          // تحويل قيمة isWorking إلى قيمة منطقية صريحة
          const isWorking = workingHours[day].isWorking === true;

          // تعيين قيم افتراضية لساعات البدء والانتهاء إذا لم تكن موجودة
          const start = workingHours[day].start || "";
          const end = workingHours[day].end || "";

          // إضافة اليوم إلى كائن ساعات العمل المطبع
          normalizedWorkingHours[day] = {
            isWorking,
            start,
            end,
          };

          // إضافة اليوم إلى مصفوفة ساعات العمل
          workingHoursArray.push({
            day,
            isWorking,
            start,
            end,
          });
        } else {
          // إضافة قيم افتراضية إذا لم تكن موجودة
          normalizedWorkingHours[day] = {
            isWorking: false,
            start: "",
            end: "",
          };

          // إضافة اليوم إلى مصفوفة ساعات العمل
          workingHoursArray.push({
            day,
            isWorking: false,
            start: "",
            end: "",
          });
        }
      });
    }

    // تحديث ساعات العمل في قاعدة البيانات
    craftsman.workingHours = normalizedWorkingHours;
    craftsman.workingHoursArray = workingHoursArray;

    // حفظ التغييرات
    await craftsman.save();

    // إرجاع ساعات العمل المحدثة
    return res.status(200).json({
      message: "تم تحديث ساعات العمل بنجاح",
      workingHours: normalizedWorkingHours,
      workingHoursArray,
    });
  } catch (error) {
    console.error("خطأ في تحديث ساعات العمل:", error);
    return res.status(500).json({ message: "حدث خطأ أثناء تحديث ساعات العمل" });
  }
});

// الحصول على ساعات العمل للحرفي الحالي
exports.getWorkingHours = asyncHandler(async (req, res) => {
  try {
    // البحث عن الحرفي
    const craftsman = await Craftsman.findOne({ user: req.user._id });
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على الحرفي" });
    }

    // إرجاع ساعات العمل
    return res.status(200).json({
      workingHours: craftsman.workingHours,
      workingHoursArray: craftsman.workingHoursArray,
    });
  } catch (error) {
    console.error("خطأ في الحصول على ساعات العمل:", error);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء الحصول على ساعات العمل" });
  }
});

// الحصول على ساعات العمل لحرفي محدد بواسطة معرفه
exports.getCraftsmanWorkingHours = asyncHandler(async (req, res) => {
  try {
    const { craftsmanId } = req.params;

    // التحقق من صحة معرف الحرفي
    if (!craftsmanId || !mongoose.Types.ObjectId.isValid(craftsmanId)) {
      return res.status(400).json({ message: "معرف الحرفي غير صالح" });
    }

    // البحث عن الحرفي
    const craftsman = await Craftsman.findById(craftsmanId);
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على الحرفي" });
    }

    // تحقق من وجود ساعات العمل
    let workingHoursArray = [];

    // إذا كان لدى الحرفي مصفوفة workingHoursArray، استخدمها
    if (craftsman.workingHoursArray && craftsman.workingHoursArray.length > 0) {
      workingHoursArray = craftsman.workingHoursArray;
    }
    // وإلا، إذا كان لديه كائن workingHours، قم بتحويله إلى مصفوفة
    else if (craftsman.workingHours) {
      const daysOfWeek = [
        "saturday",
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];

      daysOfWeek.forEach((day) => {
        if (craftsman.workingHours[day]) {
          workingHoursArray.push({
            day,
            isWorking: !!craftsman.workingHours[day].isWorking,
            start:
              craftsman.workingHours[day].start ||
              craftsman.workingHours[day].from ||
              "",
            end:
              craftsman.workingHours[day].end ||
              craftsman.workingHours[day].to ||
              "",
          });
        } else {
          // إضافة يوم بقيم افتراضية إذا لم يكن موجوداً
          workingHoursArray.push({
            day,
            isWorking: false,
            start: "",
            end: "",
          });
        }
      });

      // حفظ المصفوفة المحولة في قاعدة البيانات للاستخدام المستقبلي
      craftsman.workingHoursArray = workingHoursArray;
      await craftsman.save();
    }
    // إذا لم يكن لديه أي من الاثنين، قم بإنشاء مصفوفة افتراضية
    else {
      const daysOfWeek = [
        "saturday",
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];

      daysOfWeek.forEach((day) => {
        workingHoursArray.push({
          day,
          isWorking: false,
          start: "",
          end: "",
        });
      });

      // حفظ المصفوفة الافتراضية في قاعدة البيانات
      craftsman.workingHoursArray = workingHoursArray;
      await craftsman.save();
    }

    // إرجاع ساعات العمل
    return res.status(200).json({
      success: true,
      workingHours: workingHoursArray,
    });
  } catch (error) {
    console.error("خطأ في الحصول على ساعات العمل للحرفي:", error);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء الحصول على ساعات العمل للحرفي" });
  }
});

// تصدير الوظائف
module.exports = {
  updateWorkingHours: exports.updateWorkingHours,
  getWorkingHours: exports.getWorkingHours,
  getCraftsmanWorkingHours: exports.getCraftsmanWorkingHours
};