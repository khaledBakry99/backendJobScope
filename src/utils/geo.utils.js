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

// Función para obtener calles dentro de un radio
exports.getStreetsInRadius = async (lat, lng, radius) => {
  try {
    // Overpass QL: consulta para obtener calles (highway), hospitales y mezquitas dentro de un radio
    const query = `
      [out:json];
      (
        way["highway"]["name"](around:${radius * 1000},${lat},${lng});
        node["amenity"="hospital"](around:${radius * 1000},${lat},${lng});
        node["amenity"="clinic"](around:${radius * 1000},${lat},${lng});
        node["amenity"="doctors"](around:${radius * 1000},${lat},${lng});
        node["amenity"="mosque"](around:${radius * 1000},${lat},${lng});
        node["building"="mosque"](around:${radius * 1000},${lat},${lng});
      );
      out tags;
    `;
    const url = "https://overpass-api.de/api/interpreter";
    const res = await fetch(url, {
      method: "POST",
      body: query,
      headers: { "Content-Type": "text/plain" },
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();

    // Verificar la estructura de datos
    if (!data || !Array.isArray(data.elements)) {
      console.error("Invalid data structure from Overpass API:", data);
      return { streets: [], hospitals: [], mosques: [] };
    }

    // Extraer nombres de calles, hospitales y mezquitas
    const streets = [];
    const hospitals = [];
    const mosques = [];

    data.elements.forEach((el) => {
      if (!el.tags || !el.tags.name) return;

      const name = el.tags.name.trim();

      if (el.type === "way" && el.tags.highway) {
        streets.push(name);
      } else if (
        el.type === "node" &&
        (el.tags.amenity === "hospital" ||
          el.tags.amenity === "clinic" ||
          el.tags.amenity === "doctors")
      ) {
        hospitals.push(name);
      } else if (
        el.type === "node" &&
        (el.tags.amenity === "mosque" || el.tags.building === "mosque")
      ) {
        mosques.push(name);
      }
    });

    // Eliminar duplicados
    return {
      streets: [...new Set(streets)],
      hospitals: [...new Set(hospitals)],
      mosques: [...new Set(mosques)],
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return { streets: [], hospitals: [], mosques: [] };
  }
};
