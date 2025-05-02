const express = require('express');
const { check } = require('express-validator');
const { asyncHandler } = require('../middleware/error.middleware');
const { getStreetsInRadius } = require('../utils/geo.utils');

const router = express.Router();

// الحصول على الشوارع والمستشفيات والمساجد ضمن نطاق معين
router.get(
  '/streets-in-radius',
  [
    check('lat', 'خط العرض مطلوب').isFloat(),
    check('lng', 'خط الطول مطلوب').isFloat(),
    check('radius', 'نصف القطر مطلوب').isFloat({ min: 0.1, max: 10 }),
  ],
  asyncHandler(async (req, res) => {
    const { lat, lng, radius } = req.query;
    
    const data = await getStreetsInRadius(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    );
    
    res.json(data);
  })
);

// الحصول على الأحياء ضمن نطاق معين
router.get(
  '/neighborhoods-in-radius',
  [
    check('lat', 'خط العرض مطلوب').isFloat(),
    check('lng', 'خط الطول مطلوب').isFloat(),
    check('radius', 'نصف القطر مطلوب').isFloat({ min: 0.1, max: 10 }),
  ],
  asyncHandler(async (req, res) => {
    const { lat, lng, radius } = req.query;
    
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
      { name: "ساروجة", lat: 33.5156, lng: 36.3056 },
      { name: "القصاع", lat: 33.5156, lng: 36.3156 },
      { name: "باب توما", lat: 33.5133, lng: 36.3178 },
      { name: "الجسر الأبيض", lat: 33.5111, lng: 36.2922 },
      { name: "الحلبوني", lat: 33.5178, lng: 36.3089 },
      { name: "العباسيين", lat: 33.5211, lng: 36.3211 },
      { name: "القصور", lat: 33.5156, lng: 36.3089 },
      { name: "الشاغور", lat: 33.5067, lng: 36.3089 },
      { name: "باب سريجة", lat: 33.5067, lng: 36.3022 },
      { name: "الصناعة", lat: 33.4978, lng: 36.3089 },
      { name: "التجارة", lat: 33.5022, lng: 36.3056 },
      { name: "الحريقة", lat: 33.5089, lng: 36.3056 },
      { name: "السبع بحرات", lat: 33.5111, lng: 36.3089 },
      { name: "الشيخ محي الدين", lat: 33.5178, lng: 36.2922 },
      { name: "الصالحية الجديدة", lat: 33.5211, lng: 36.2889 },
    ];
    
    // دالة لحساب المسافة بين نقطتين
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
    
    // تصفية الأحياء حسب المسافة
    const neighborhoodsInRadius = neighborhoods.filter((neighborhood) => {
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        neighborhood.lat,
        neighborhood.lng
      );
      return distance <= parseFloat(radius);
    });
    
    res.json(neighborhoodsInRadius);
  })
);

module.exports = router;
