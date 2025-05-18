// Función para calcular la distancia entre dos puntos en kilómetros (fórmula de Haversine)
exports.calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distancia en km
  return distance;
};

// استيراد خدمة Geoapify
const { getPlacesFromGeoapify } = require('./geoapify.utils');

// دالة للحصول على الشوارع والمستشفيات والمساجد ضمن نطاق معين
exports.getStreetsInRadius = async (lat, lng, radius) => {
  try {
    console.log("استخدام Geoapify Places API للحصول على البيانات");

    // استخدام Geoapify Places API بدلاً من Overpass API
    const result = await getPlacesFromGeoapify(lat, lng, radius);

    return result;
  } catch (error) {
    console.error("Error fetching data from Geoapify Places API:", error);
    return { streets: [], hospitals: [], mosques: [] };
  }
};
