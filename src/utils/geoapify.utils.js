// خدمة Geoapify Places API للخادم الخلفي
const fetch = require("node-fetch");

// مفتاح API الخاص بـ Geoapify من متغيرات البيئة
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

/**
 * دالة للحصول على الشوارع والمستشفيات والمساجد ضمن نطاق معين باستخدام Geoapify Places API
 * @param {number} lat - خط العرض
 * @param {number} lng - خط الطول
 * @param {number} radius - نصف القطر بالكيلومتر
 * @returns {Promise<Object>} - كائن يحتوي على قوائم الشوارع والمستشفيات والمساجد
 */
exports.getPlacesFromGeoapify = async (lat, lng, radius) => {
  try {
    // تحويل نصف القطر من كيلومتر إلى متر
    const radiusInMeters = radius * 1000;

    // جلب الشوارع
    const streets = await fetchStreets(lat, lng, radiusInMeters);

    // جلب المستشفيات
    const hospitals = await fetchHospitals(lat, lng, radiusInMeters);

    // جلب المساجد
    const mosques = await fetchMosques(lat, lng, radiusInMeters);

    return {
      streets,
      hospitals,
      mosques,
    };
  } catch (error) {
    console.error("Error fetching data from Geoapify:", error);
    return { streets: [], hospitals: [], mosques: [] };
  }
};

/**
 * دالة لجلب الشوارع ضمن نطاق معين
 * @param {number} lat - خط العرض
 * @param {number} lng - خط الطول
 * @param {number} radius - نصف القطر بالمتر
 * @returns {Promise<Array>} - قائمة بأسماء الشوارع
 */
const fetchStreets = async (lat, lng, radius) => {
  try {
    const url = `https://api.geoapify.com/v2/places?categories=street&filter=circle:${lng},${lat},${radius}&limit=50&apiKey=${GEOAPIFY_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // استخراج أسماء الشوارع من البيانات
    const streets = [];

    if (data && data.features && Array.isArray(data.features)) {
      data.features.forEach((feature) => {
        if (feature.properties && feature.properties.name) {
          const name = feature.properties.name.trim();
          streets.push(name);
        }
      });
    }

    // إزالة التكرارات
    return [...new Set(streets)];
  } catch (error) {
    console.error("Error fetching streets from Geoapify:", error);
    return [];
  }
};

/**
 * دالة لجلب المستشفيات ضمن نطاق معين
 * @param {number} lat - خط العرض
 * @param {number} lng - خط الطول
 * @param {number} radius - نصف القطر بالمتر
 * @returns {Promise<Array>} - قائمة بأسماء المستشفيات
 */
const fetchHospitals = async (lat, lng, radius) => {
  try {
    const url = `https://api.geoapify.com/v2/places?categories=healthcare.hospital,healthcare.clinic,healthcare.doctor&filter=circle:${lng},${lat},${radius}&limit=50&apiKey=${GEOAPIFY_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // استخراج أسماء المستشفيات من البيانات
    const hospitals = [];

    if (data && data.features && Array.isArray(data.features)) {
      data.features.forEach((feature) => {
        if (feature.properties && feature.properties.name) {
          const name = feature.properties.name.trim();
          hospitals.push(name);
        }
      });
    }

    // إزالة التكرارات
    return [...new Set(hospitals)];
  } catch (error) {
    console.error("Error fetching hospitals from Geoapify:", error);
    return [];
  }
};

/**
 * دالة لجلب المساجد ضمن نطاق معين
 * @param {number} lat - خط العرض
 * @param {number} lng - خط الطول
 * @param {number} radius - نصف القطر بالمتر
 * @returns {Promise<Array>} - قائمة بأسماء المساجد
 */
const fetchMosques = async (lat, lng, radius) => {
  try {
    const url = `https://api.geoapify.com/v2/places?categories=religion.muslim,religion.place&filter=circle:${lng},${lat},${radius}&limit=50&apiKey=${GEOAPIFY_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // استخراج أسماء المساجد من البيانات
    const mosques = [];

    if (data && data.features && Array.isArray(data.features)) {
      data.features.forEach((feature) => {
        if (feature.properties && feature.properties.name) {
          const name = feature.properties.name.trim();
          // التحقق من أن الاسم يحتوي على كلمة مسجد أو جامع أو أنه مكان عبادة إسلامي
          if (
            name.includes("مسجد") ||
            name.includes("جامع") ||
            (feature.properties.categories &&
              feature.properties.categories.includes("religion.muslim")) ||
            feature.properties.religion === "muslim" ||
            feature.properties.religion === "islam"
          ) {
            mosques.push(name);
          }
        }
      });
    }

    // إزالة التكرارات
    return [...new Set(mosques)];
  } catch (error) {
    console.error("Error fetching mosques from Geoapify:", error);
    return [];
  }
};
