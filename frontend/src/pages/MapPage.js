import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

// Her mod için farklı OSRM backend — tümü ücretsiz, API key gerekmez
const OSRM_BACKENDS = {
  driving: 'https://router.project-osrm.org/route/v1/driving',
  walking: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
  cycling: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving',
};

const MODE_META = {
  driving: { label: '🚗 Araba',    color: '#4338CA' },
  walking: { label: '🚶 Yürüyüş', color: '#0f6e56' },
  cycling: { label: '🚲 Bisiklet', color: '#D97706' },
};

async function fetchOSRMRoute(waypoints, mode = 'driving') {
  if (waypoints.length < 2) return null;
  try {
    const coords = waypoints.map(wp => `${wp.lon},${wp.lat}`).join(';');
    const base = OSRM_BACKENDS[mode] || OSRM_BACKENDS.driving;
    const res = await fetch(`${base}/${coords}?overview=full&geometries=geojson`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    // OSRM [lon, lat] döndürür → Leaflet [lat, lon] ister
    return data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  } catch { return null; }
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Wikipedia'dan fotoğraf çek (isim bazlı) — popup önizlemesi için
async function fetchWikiImage(name) {
  try {
    const s = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*&srlimit=1`);
    const sd = await s.json();
    const title = sd?.query?.search?.[0]?.title;
    if (!title) {
      // Türkçe Wikipedia dene
      const ts = await fetch(`https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*&srlimit=1`);
      const tsd = await ts.json();
      const ttitle = tsd?.query?.search?.[0]?.title;
      if (!ttitle) return null;
      const ti = await fetch(`https://tr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(ttitle)}&prop=pageimages&format=json&origin=*&pithumbsize=500`);
      const tid = await ti.json();
      const tp = Object.values(tid?.query?.pages || {})[0];
      return tp?.thumbnail?.source || null;
    }
    const i = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&origin=*&pithumbsize=500`);
    const id = await i.json();
    const p = Object.values(id?.query?.pages || {})[0];
    return p?.thumbnail?.source || null;
  } catch { return null; }
}

/**
 * Wikipedia'dan hem fotoğraf hem açıklama çek (tek API çağrısı per dil).
 * Mekanları listeye eklerken kullanılır.
 * @returns {{ image: string|null, description: string|null }}
 */
async function fetchWikiData(name) {
  const tryWiki = async (base) => {
    try {
      const sr = await fetch(
        `${base}?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*&srlimit=1`
      );
      const sd = await sr.json();
      const title = sd?.query?.search?.[0]?.title;
      if (!title) return null;
      // pageimages + extracts tek seferde
      const dr = await fetch(
        `${base}?action=query&titles=${encodeURIComponent(title)}&prop=pageimages|extracts&exintro=true&exsentences=4&explaintext=true&pithumbsize=640&format=json&origin=*`
      );
      const dd = await dr.json();
      const page = Object.values(dd?.query?.pages || {})[0];
      if (!page || page.missing !== undefined) return null;
      return {
        image: page?.thumbnail?.source || null,
        description: page?.extract?.trim() || null,
      };
    } catch { return null; }
  };

  // Önce İngilizce, sonra Türkçe
  const en = await tryWiki("https://en.wikipedia.org/w/api.php");
  if (en?.image || en?.description) return en;
  const tr = await tryWiki("https://tr.wikipedia.org/w/api.php");
  return tr || { image: null, description: null };
}

// Overpass API — birden fazla sunucuyla fallback + timeout
const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchCityPlaces(lat, lon, radiusKm = 15) {
  const r = radiusKm * 1000;
  const query = [
    "[out:json][timeout:25];(",
    `node["tourism"~"attraction|museum|viewpoint|gallery|artwork|theme_park|zoo|aquarium"](around:${r},${lat},${lon});`,
    `node["historic"~"monument|castle|archaeological_site|ruins|memorial|fort|palace"](around:${r},${lat},${lon});`,
    `node["leisure"~"park|nature_reserve|garden"](around:${r},${lat},${lon});`,
    `node["amenity"~"theatre|cinema|library|place_of_worship"](around:${r},${lat},${lon});`,
    ");out body 40;",
  ].join("");

  for (const server of OVERPASS_SERVERS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000); // 15s per server
      const res = await fetch(server, { method: "POST", body: query, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      return (data.elements || []).filter(e => e.tags?.name);
    } catch { continue; } // timeout veya ağ hatası → sonraki sunucu
  }
  return []; // tüm sunucular başarısız → boş dizi (hata fırlatma)
}

/**
 * Nearest-neighbour TSP heuristic.
 * Waypoint'leri birbirine en yakın sırayla dizer.
 * İlk nokta sabit kalır, geriye kalanlar greedy olarak seçilir.
 * @param {Array<{lat, lon, ...}>} points
 * @returns {Array} – aynı nesneler, yeni sırada
 */
function nearestNeighbourSort(points) {
  if (points.length <= 2) return [...points];
  const remaining = [...points];
  const sorted = [remaining.shift()]; // ilk nokta sabit

  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      // Haversine yerine Öklid yeterli (küçük mesafeler için)
      const dLat = last.lat - remaining[i].lat;
      const dLon = last.lon - remaining[i].lon;
      const dist = dLat * dLat + dLon * dLon; // karesi yeterli — sqrt gerekmez
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }

    sorted.push(remaining.splice(bestIdx, 1)[0]);
  }
  return sorted;
}

// Nominatim ile şehir merkezi koordinatı bul
async function geocodeCity(cityName) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&addressdetails=1`,
    { headers: { "Accept-Language": "tr" } }
  );
  const data = await res.json();
  return data[0] || null;
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.4 }); }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng); }
  });
  return null;
}

/**
 * Yoğunluk Haritası (Heatmap) Katmanı
 * points: [[lat, lon, intensity], ...] formatında dizi
 */
function HeatmapLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const heat = L.heatLayer(points, {
      radius: 35,
      blur: 28,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.1: "#3b82f6",   // mavi  – seyrek
        0.35: "#10b981",  // yeşil – az yoğun
        0.6: "#f59e0b",   // turuncu – orta yoğun
        0.82: "#ef4444",  // kırmızı – yoğun
        1.0: "#7c3aed",   // mor – çok yoğun
      },
    }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);
  return null;
}

function colorIcon(color, size = 12) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function numberedIcon(num) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:linear-gradient(135deg,#0f6e56,#1d9e75);
      border:2.5px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:12px;font-weight:800;font-family:system-ui;
    ">${num}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const POI_COLOR = "#7C3AED";
const ROUTE_COLOR = "#4338CA";
const CUSTOM_PIN_COLOR = "#F59E0B";

const osmTagToCategory = (tags) => {
  if (tags.tourism === "museum") return "müze";
  if (tags.tourism === "attraction" || tags.tourism === "viewpoint") return "tarihi";
  if (tags.tourism === "gallery") return "müze";
  if (tags.tourism === "theme_park" || tags.tourism === "zoo") return "eğlence";
  if (tags.historic) return "tarihi";
  if (tags.leisure) return "park";
  if (tags.amenity === "theatre" || tags.amenity === "cinema") return "eğlence";
  return "tarihi";
};

// Popup içeriği — fotoğrafı lazy yükler
function PopupContent({ poi, isInRoute, isAdded, isAdding, onToggleRoute, onAdd }) {
  const [img, setImg] = useState(null);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchWikiImage(poi.tags.name).then(url => {
      if (!cancelled) { setImg(url); setImgLoading(false); }
    });
    return () => { cancelled = true; };
  }, [poi.tags.name]);

  return (
    <div style={{ width: "200px", fontFamily: "system-ui", overflow: "hidden" }}>
      {/* Fotoğraf alanı */}
      <div style={{ height: "120px", background: "#F1F5F9", borderRadius: "8px", overflow: "hidden", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {imgLoading
          ? <div style={{ fontSize: "12px", color: "#94A3B8" }}>🖼️ Yükleniyor...</div>
          : img
            ? <img src={img} alt={poi.tags.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML = '<div style="font-size:32px;color:#94A3B8;display:flex;align-items:center;justify-content:center;width:100%;height:100%">📍</div>'; }} />
            : <div style={{ fontSize: "32px", color: "#94A3B8" }}>📍</div>
        }
      </div>
      <div style={{ fontWeight: 700, fontSize: "13px", color: "#1E293B", marginBottom: "3px", lineHeight: 1.3 }}>{poi.tags.name}</div>
      <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "10px" }}>
        {osmTagToCategory(poi.tags)}
        {poi.tags["addr:city"] ? ` · ${poi.tags["addr:city"]}` : ""}
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <button onClick={onToggleRoute} style={popupBtnStyle(isInRoute ? "#EEF2FF" : "#F8FAFC", isInRoute ? "#4338CA" : "#475569")}>
          {isInRoute ? "📍 Rotada" : "+ Rota"}
        </button>
        <button onClick={onAdd} disabled={isAdded || isAdding} style={popupBtnStyle(isAdded ? "#ECFDF5" : "#F8FAFC", isAdded ? "#10B981" : "#475569")}>
          {isAdding ? "⏳" : isAdded ? "✅" : "+ Ekle"}
        </button>
      </div>
    </div>
  );
}

export default function MapPage() {
  const { token } = useAuth();
  const [mapCenter, setMapCenter] = useState([39.0, 35.0]);
  const [mapZoom, setMapZoom] = useState(6);
  const [route, setRoute] = useState([]);
  const [cityQuery, setCityQuery] = useState("");
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState("");
  const [pois, setPois] = useState([]);
  const [addedIds, setAddedIds] = useState(new Set());
  const [addingId, setAddingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [customPins, setCustomPins] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [savingRoute, setSavingRoute] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [mapType, setMapType] = useState("street"); // "street" | "satellite"
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMarker, setGpsMarker] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState([]); // OSRM'den gelen gerçek yol koordinatları
  const [routingLoading, setRoutingLoading] = useState(false);
  const [travelMode, setTravelMode] = useState('driving'); // 'driving' | 'walking' | 'cycling'
  const [showHeatmap, setShowHeatmap] = useState(false);
  const pinCountRef = useRef(0);
  const routingTimerRef = useRef(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get("http://localhost:5001/api/routes/", authHeader)
      .then(r => setSavedRoutes(r.data.routes || []))
      .catch(() => {});
    // Rotalarım sayfasından "Haritada Aç" ile gelen rotayı yükle
    const pendingRoute = localStorage.getItem("load_route");
    if (pendingRoute) {
      try {
        const saved = JSON.parse(pendingRoute);
        if (saved?.waypoints?.length) {
          const pts = saved.waypoints.map((wp, i) => ({
            id: `loaded-${saved.id}-${i}-${Date.now()}`,
            lat: wp.lat, lon: wp.lng, isLoaded: true,
            duration: wp.duration || null,
            tags: { name: wp.name },
          }));
          setRoute(pts);
          setMapCenter([pts[0].lat, pts[0].lon]);
          setMapZoom(12);
          setSuccessMsg(`"${saved.name}" rotası yüklendi!`);
          setTimeout(() => setSuccessMsg(""), 3000);
        }
      } catch { /* sessiz */ }
      localStorage.removeItem("load_route");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route veya ulaşım modu değişince OSRM'den gerçek yol geometrisini çek
  useEffect(() => {
    if (route.length < 2) {
      setRouteGeometry([]);
      setRoutingLoading(false);
      return;
    }
    if (routingTimerRef.current) clearTimeout(routingTimerRef.current);
    setRoutingLoading(true);
    routingTimerRef.current = setTimeout(async () => {
      const geometry = await fetchOSRMRoute(route, travelMode);
      // OSRM başarısız olursa düz çizgiye fallback
      setRouteGeometry(geometry || route.map(p => [p.lat, p.lon]));
      setRoutingLoading(false);
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, travelMode]);

  const saveCurrentRoute = async () => {
    if (!routeName.trim()) { setSaveError("Rota adı zorunludur."); return; }
    setSavingRoute(true); setSaveError("");
    const waypoints = route.map(p => ({
      lat: p.lat, lng: p.lon, name: p.tags?.name || p.name || "Nokta",
    }));
    try {
      const res = await axios.post("http://localhost:5001/api/routes/", { name: routeName.trim(), waypoints }, authHeader);
      setSavedRoutes(prev => [res.data.route, ...prev]);
      setShowSaveModal(false);
      setRouteName("");
      setSuccessMsg(`"${res.data.route.name}" rotası kaydedildi!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      setSaveError(e.response?.data?.error || "Kayıt başarısız.");
    } finally { setSavingRoute(false); }
  };

  const loadSavedRoute = (saved) => {
    const pts = saved.waypoints.map((wp, i) => ({
      id: `loaded-${saved.id}-${i}-${Date.now()}`,
      lat: wp.lat, lon: wp.lng, isLoaded: true,
      duration: wp.duration || null,
      tags: { name: wp.name },
    }));
    setRoute(pts);
    if (pts.length > 0) { setMapCenter([pts[0].lat, pts[0].lon]); setMapZoom(12); }
    setSuccessMsg(`"${saved.name}" rotası yüklendi!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const deleteSavedRoute = async (routeId) => {
    if (!window.confirm("Bu rota silinsin mi?")) return;
    try {
      await axios.delete(`http://localhost:5001/api/routes/${routeId}`, authHeader);
      setSavedRoutes(prev => prev.filter(r => r.id !== routeId));
    } catch { alert("Rota silinemedi."); }
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setCityError("Tarayıcınız konum desteklemiyor.");
      return;
    }
    setGpsLoading(true);
    setCityError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsMarker({ lat, lng });
        setMapCenter([lat, lng]);
        setMapZoom(14);
        setGpsLoading(false);
        setSuccessMsg("Konumunuz haritada gösteriliyor!");
        setTimeout(() => setSuccessMsg(""), 3000);
      },
      (err) => {
        setCityError("Konum alınamadı: " + (err.message || "İzin verilmedi."));
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  const searchCity = useCallback(async (query) => {
    if (!query.trim()) return;
    setCityLoading(true);
    setCityError("");
    setPois([]);
    try {
      // 1. Şehri geocode et (Nominatim)
      const city = await geocodeCity(query);
      if (!city) { setCityError("Şehir bulunamadı. Farklı bir yazım dene."); setCityLoading(false); return; }

      const lat = parseFloat(city.lat);
      const lon = parseFloat(city.lon);
      setMapCenter([lat, lon]);
      setMapZoom(12);

      // 2. POI'ları çek — başarısız olursa boş dizi döner, fırlatmaz
      const results = await fetchCityPlaces(lat, lon);
      setPois(results);
      if (results.length === 0) {
        setCityError("Harita şehre taşındı fakat popüler mekan verisi alınamadı. Haritayı kullanmaya devam edebilirsin.");
      }
    } catch {
      // Bu noktaya sadece geocode tamamen çökerse gelinir
      setCityError("Şehir konumu alınamadı. İnternet bağlantını kontrol et.");
    } finally {
      setCityLoading(false);
    }
  }, []);

  const handleKeyDown = (e) => { if (e.key === "Enter") searchCity(cityQuery); };

  const handleMapClick = useCallback((latlng) => {
    pinCountRef.current += 1;
    const pin = {
      id: `custom-${Date.now()}`,
      lat: latlng.lat,
      lon: latlng.lng,
      isCustom: true,
      tags: { name: `📌 Nokta ${pinCountRef.current}` },
    };
    setCustomPins(prev => [...prev, pin]);
  }, []);

  const removeCustomPin = useCallback((id) => {
    setCustomPins(prev => prev.filter(p => p.id !== id));
    setRoute(prev => prev.filter(p => p.id !== id));
  }, []);

  const toggleRoute = (poi) => {
    const id = poi.id;
    setRoute(prev => prev.find(p => p.id === id) ? prev.filter(p => p.id !== id) : [...prev, poi]);
  };

  const addToPlaces = async (poi) => {
    setAddingId(poi.id);
    try {
      // Wikipedia'dan fotoğraf + açıklama çek (paralel'de başlar, await ile bekle)
      const wikiData = await fetchWikiData(poi.tags.name);

      const payload = {
        name: poi.tags.name,
        city: poi.tags["addr:city"] || cityQuery,
        category: osmTagToCategory(poi.tags),
        description: poi.tags["description"] || wikiData.description || poi.tags["wikipedia"] || "",
        latitude: poi.lat,
        longitude: poi.lon,
        rating: 0,
        image_url: wikiData.image || null,
      };
      await axios.post("http://localhost:5001/api/places/", payload, authHeader);
      setAddedIds(prev => new Set([...prev, poi.id]));
      setSuccessMsg(`"${poi.tags.name}" mekanlar listene eklendi!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch { /* sessizce geç */ }
    finally { setAddingId(null); }
  };

  const allRoutePoints = [...route];
  const routeCoords = allRoutePoints.map(p => [p.lat, p.lon]);

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.sideTitle}>🗺️ Şehir Keşfet</div>

        {/* Şehir arama */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Şehir Ara</div>
          <div style={s.searchRow}>
            <input
              style={s.cityInput}
              placeholder="ör. İstanbul, Paris, Roma..."
              value={cityQuery}
              onChange={e => setCityQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button style={s.searchBtn} onClick={() => searchCity(cityQuery)} disabled={cityLoading}>
              {cityLoading ? "⏳" : "🔍"}
            </button>
          </div>
          {cityError && <div style={s.errorMsg}>{cityError}</div>}
          {cityLoading && <div style={s.loadingMsg}>Popüler mekanlar yükleniyor...</div>}
          {successMsg && <div style={s.successMsg}>✅ {successMsg}</div>}

          {/* GPS + harita türü */}
          <div style={s.toolRow}>
            <button style={s.gpsBtn} onClick={locateMe} disabled={gpsLoading} title="Beni bul">
              {gpsLoading ? "⏳" : "📍"} {gpsLoading ? "Konum alınıyor..." : "Beni Bul"}
            </button>
            <div style={s.mapTypeTabs}>
              <button
                style={{...s.mapTypeBtn, ...(mapType === "street" ? s.mapTypeBtnActive : {})}}
                onClick={() => setMapType("street")}
                title="Sokak haritası"
              >🗺️</button>
              <button
                style={{...s.mapTypeBtn, ...(mapType === "satellite" ? s.mapTypeBtnActive : {})}}
                onClick={() => setMapType("satellite")}
                title="Uydu görüntüsü"
              >🛰️</button>
            </div>
          </div>

          {/* Yoğunluk haritası toggle */}
          <button
            style={{
              ...s.heatmapToggleBtn,
              ...(showHeatmap ? s.heatmapToggleBtnActive : {}),
              ...(pois.length === 0 ? { opacity: 0.45, cursor: "not-allowed" } : {}),
            }}
            onClick={() => pois.length > 0 && setShowHeatmap(v => !v)}
            title={pois.length === 0 ? "Önce bir şehir ara" : (showHeatmap ? "Yoğunluk haritasını gizle" : "Yoğunluk haritasını göster")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            {showHeatmap ? "Yoğunluk Açık" : "Yoğunluk Haritası"}
          </button>

          {/* Renk skalası — sadece heatmap açıkken göster */}
          {showHeatmap && pois.length > 0 && (
            <div style={s.heatLegend}>
              <div style={s.heatLegendBar} />
              <div style={s.heatLegendLabels}>
                <span>Seyrek</span>
                <span>Orta</span>
                <span>Yoğun</span>
              </div>
            </div>
          )}

          {/* Ulaşım modu */}
          <div style={s.modeRow}>
            <div style={s.sectionLabel} >Ulaşım Modu</div>
            <div style={s.modeTabs}>
              {Object.entries(MODE_META).map(([key, meta]) => (
                <button
                  key={key}
                  style={{
                    ...s.modeBtn,
                    ...(travelMode === key ? { ...s.modeBtnActive, borderColor: meta.color, color: meta.color, background: meta.color + '18' } : {}),
                  }}
                  onClick={() => setTravelMode(key)}
                  title={meta.label}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* POI Listesi */}
        {pois.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>{pois.length} Mekan Bulundu</div>
            <div style={s.poiList}>
              {pois.slice(0, 30).map(poi => {
                const isInRoute = route.find(p => p.id === poi.id);
                const isAdded = addedIds.has(poi.id);
                return (
                  <div key={poi.id} style={{...s.poiItem, ...(isInRoute ? s.poiItemActive : {})}}>
                    <div style={s.poiName}>{poi.tags.name}</div>
                    <div style={s.poiTag}>{osmTagToCategory(poi.tags)}</div>
                    <div style={s.poiBtns}>
                      <button
                        style={{...s.poiBtn, ...(isInRoute ? s.poiBtnActive : {})}}
                        onClick={() => toggleRoute(poi)}
                        title="Rotaya ekle"
                      >
                        {isInRoute ? "📍 Rotada" : "+ Rota"}
                      </button>
                      <button
                        style={{...s.poiBtn, ...(isAdded ? s.poiBtnDone : {})}}
                        onClick={() => !isAdded && addToPlaces(poi)}
                        disabled={addingId === poi.id}
                        title="Mekanlarıma ekle"
                      >
                        {addingId === poi.id ? "⏳" : isAdded ? "✅" : "+ Ekle"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rota Özeti */}
        {route.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>
              Oluşturulan Rota ({route.length} nokta)
              {routingLoading && <span style={s.routingBadge}>⏳ {MODE_META[travelMode].label} rotası hesaplanıyor...</span>}
              {!routingLoading && routeGeometry.length > 1 && <span style={{...s.routedBadge, color: MODE_META[travelMode].color}}>{MODE_META[travelMode].label} rotası</span>}
            </div>
            <div style={s.routeList}>
              {route.map((p, i) => (
                <div key={p.id} style={s.routeItem}>
                  <span style={s.routeNum}>{i + 1}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={s.routeName}>{p.tags?.name || p.name || "Nokta"}</div>
                    {p.duration && <div style={s.routeDuration}>⏱️ {p.duration}</div>}
                  </div>
                  <button style={s.removeBtn} onClick={() => p.isCustom ? removeCustomPin(p.id) : toggleRoute(p)}>×</button>
                </div>
              ))}
            </div>
            <div style={s.routeActions}>
              <button style={s.saveRouteBtn} onClick={() => { setRouteName(""); setSaveError(""); setShowSaveModal(true); }}>
                💾 Kaydet
              </button>
              {route.length >= 3 && (
                <button
                  style={s.optimizeBtn}
                  title="Birbirine en yakın noktaları sırayla gez (nearest-neighbour)"
                  onClick={() => {
                    setRoute(prev => nearestNeighbourSort(prev));
                    setSuccessMsg("Rota optimize edildi! 🔀");
                    setTimeout(() => setSuccessMsg(""), 2500);
                  }}
                >
                  🔀 Optimize
                </button>
              )}
              <button style={s.clearBtn} onClick={() => setRoute([])}>🗑️ Temizle</button>
            </div>
          </div>
        )}

        {/* Kayıtlı Rotalar */}
        {savedRoutes.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>Kayıtlı Rotalar ({savedRoutes.length})</div>
            <div style={s.savedList}>
              {savedRoutes.map(sr => (
                <div key={sr.id} style={s.savedItem}>
                  <div style={s.savedName}>{sr.name}</div>
                  <div style={s.savedMeta}>{sr.waypoints.length} durak · {new Date(sr.created_at).toLocaleDateString("tr-TR")}</div>
                  <div style={s.savedBtns}>
                    <button style={s.loadBtn} onClick={() => loadSavedRoute(sr)}>📂 Yükle</button>
                    <button style={s.delSavedBtn} onClick={() => deleteSavedRoute(sr.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Renk Açıklaması */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Harita İşaretleri</div>
          {[["🟣", "Popüler mekanlar"], ["🔵", "Rotadaki mekan"], ["🟡", "Tıklanan pin"]].map(([dot, lbl]) => (
            <div key={lbl} style={s.legend}><span>{dot}</span><span style={s.legendLabel}>{lbl}</span></div>
          ))}
          <div style={{ marginTop: "10px", fontSize: "11px", color: t.textMuted, background: "#F8FAFC", padding: "8px 10px", borderRadius: "8px", lineHeight: 1.5 }}>
            💡 Haritaya tıklayarak istediğin yere pin ekleyebilirsin
          </div>
        </div>
      </div>

      {/* Rota Kaydet Modal */}
      {showSaveModal && (
        <div style={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowSaveModal(false); }}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>Rotayı Kaydet</span>
              <button style={s.modalClose} onClick={() => setShowSaveModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.modalHint}>{route.length} durak kayıt altına alınacak</div>
              <input
                style={s.modalInput}
                placeholder="Rota adı girin... (ör. İstanbul Turu)"
                value={routeName}
                onChange={e => setRouteName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveCurrentRoute()}
                autoFocus
              />
              {saveError && <div style={s.saveError}>{saveError}</div>}
            </div>
            <div style={s.modalFoot}>
              <button style={s.modalCancel} onClick={() => setShowSaveModal(false)}>İptal</button>
              <button style={{...s.modalSave, ...(savingRoute ? {opacity:0.6} : {})}} onClick={saveCurrentRoute} disabled={savingRoute}>
                {savingRoute ? "Kaydediliyor..." : "💾 Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Harita */}
      <div style={s.mapWrap}>
        <MapContainer center={mapCenter} zoom={6} style={{ width: "100%", height: "100%" }}>
          {mapType === "street" ? (
            <TileLayer
              key="street"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
          ) : (
            <TileLayer
              key="satellite"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
          )}
          <FlyTo center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Yoğunluk haritası katmanı */}
          {showHeatmap && pois.length > 0 && (
            <HeatmapLayer points={pois.map(p => [p.lat, p.lon, 0.8])} />
          )}

          {/* Kullanıcının tıkladığı özel pinler */}
          {customPins.map(pin => {
            const isInRoute = !!route.find(p => p.id === pin.id);
            return (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lon]}
                icon={colorIcon(isInRoute ? ROUTE_COLOR : CUSTOM_PIN_COLOR, 13)}
              >
                <Popup maxWidth={200} autoPan={true}>
                  <div style={{ width: "180px", fontFamily: "system-ui" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#1E293B", marginBottom: "4px" }}>{pin.tags.name}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "10px" }}>
                      {pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => toggleRoute(pin)} style={popupBtnStyle(isInRoute ? "#EEF2FF" : "#F8FAFC", isInRoute ? "#4338CA" : "#475569")}>
                        {isInRoute ? "📍 Rotada" : "+ Rota"}
                      </button>
                      <button onClick={() => removeCustomPin(pin.id)} style={popupBtnStyle("#FFF7ED", "#D97706")}>
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Yüklenen rota (AI / kayıtlı) — numaralı marker'lar */}
          {route.filter(p => p.isLoaded).map((wp, i) => (
            <Marker
              key={`loaded-wp-${wp.id}`}
              position={[wp.lat, wp.lon]}
              icon={numberedIcon(i + 1)}
              zIndexOffset={1000}
            >
              <Popup maxWidth={220} autoPan={false}>
                <div style={{ fontFamily:"system-ui", padding:"4px 2px", minWidth:"160px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                    <div style={{ width:"22px", height:"22px", borderRadius:"50%", background:"linear-gradient(135deg,#0f6e56,#1d9e75)", color:"#fff", fontSize:"11px", fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i + 1}</div>
                    <div style={{ fontWeight:700, fontSize:"13px", color:"#1a2e25", lineHeight:1.3 }}>{wp.tags?.name || wp.name || `Durak ${i + 1}`}</div>
                  </div>
                  {wp.duration && (
                    <div style={{ display:"inline-flex", alignItems:"center", gap:"4px", fontSize:"12px", color:"#0f6e56", background:"#e6f7f0", padding:"3px 8px", borderRadius:"6px", fontWeight:600 }}>
                      ⏱️ {wp.duration}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {pois.map(poi => {
            const isInRoute = !!route.find(p => p.id === poi.id);
            const isAdded = addedIds.has(poi.id);
            return (
              <Marker
                key={poi.id}
                position={[poi.lat, poi.lon]}
                icon={colorIcon(isInRoute ? ROUTE_COLOR : POI_COLOR, isInRoute ? 14 : 11)}
              >
                <Popup maxWidth={220} autoPan={true}>
                  <PopupContent
                    poi={poi}
                    isInRoute={isInRoute}
                    isAdded={isAdded}
                    isAdding={addingId === poi.id}
                    onToggleRoute={() => toggleRoute(poi)}
                    onAdd={() => !isAdded && addToPlaces(poi)}
                  />
                </Popup>
              </Marker>
            );
          })}

          {/* GPS konumu */}
          {gpsMarker && (
            <Marker
              position={[gpsMarker.lat, gpsMarker.lng]}
              icon={L.divIcon({
                className: "",
                html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.35)"></div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              })}
            >
              <Popup maxWidth={160} autoPan={false}>
                <div style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 700, color: "#1E293B" }}>
                  📍 Konumunuz
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "3px", fontWeight: 400 }}>
                    {gpsMarker.lat.toFixed(5)}, {gpsMarker.lng.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Gerçek yol geometrisi (OSRM) — renk moda göre */}
          {routeGeometry.length > 1 && (
            <Polyline positions={routeGeometry} color={MODE_META[travelMode].color} weight={4} opacity={0.85} />
          )}
          {/* OSRM yüklenirken geçici kesik düz çizgi */}
          {routingLoading && routeCoords.length > 1 && (
            <Polyline positions={routeCoords} color={MODE_META[travelMode].color} weight={2} dashArray="8,8" opacity={0.35} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

const popupBtnStyle = (bg, color) => ({
  flex: 1, padding: "5px 8px", borderRadius: "6px", border: `1px solid ${color}22`,
  background: bg, color, fontSize: "11px", fontWeight: 600, cursor: "pointer",
});

const s = {
  page: { display: "flex", height: "calc(100vh - 58px)", fontFamily: "system-ui,sans-serif" },
  sidebar: { width: "260px", flexShrink: 0, background: "#fff", borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", overflowY: "auto" },
  sideTitle: { fontSize: "15px", fontWeight: 700, color: t.text, padding: "1.25rem 1.25rem 0" },
  section: { padding: "1rem 1.25rem", borderBottom: `1px solid ${t.borderLight}` },
  sectionLabel: { fontSize: "11px", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "8px" },
  searchRow: { display: "flex", gap: "6px" },
  cityInput: { flex: 1, padding: "9px 12px", borderRadius: "10px", border: `1.5px solid ${t.border}`, fontSize: "13px", outline: "none", color: t.text },
  searchBtn: { padding: "9px 12px", borderRadius: "10px", border: "none", background: t.gradient, color: "#fff", fontSize: "14px", cursor: "pointer" },
  errorMsg: { marginTop: "8px", fontSize: "12px", color: "#EF4444", background: "#FEF2F2", padding: "6px 10px", borderRadius: "8px" },
  loadingMsg: { marginTop: "8px", fontSize: "12px", color: t.textMuted },
  successMsg: { marginTop: "8px", fontSize: "12px", color: "#10B981", background: "#ECFDF5", padding: "6px 10px", borderRadius: "8px" },
  poiList: { display: "flex", flexDirection: "column", gap: "6px", maxHeight: "340px", overflowY: "auto" },
  poiItem: { padding: "8px 10px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "#FAFAFA" },
  poiItemActive: { borderColor: t.primary, background: t.primaryLight },
  poiName: { fontSize: "12px", fontWeight: 600, color: t.text, marginBottom: "3px", lineHeight: 1.3 },
  poiTag: { fontSize: "10px", color: t.textMuted, marginBottom: "6px" },
  poiBtns: { display: "flex", gap: "5px" },
  poiBtn: { flex: 1, padding: "4px 6px", borderRadius: "6px", border: `1px solid ${t.border}`, background: "#fff", fontSize: "10px", fontWeight: 600, color: t.textMuted, cursor: "pointer" },
  poiBtnActive: { background: t.primaryLight, color: t.primary, borderColor: t.primary },
  poiBtnDone: { background: "#ECFDF5", color: "#10B981", borderColor: "#10B981" },
  routeList: { display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" },
  routeItem: { display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", background: t.primaryLight, borderRadius: "8px" },
  routeNum: { fontSize: "11px", fontWeight: 700, color: t.primary, width: "16px", flexShrink: 0 },
  routeName: { fontSize: "11px", color: t.text, fontWeight: 600 },
  routeDuration: { fontSize: "10px", color: t.primary, marginTop: "1px" },
  removeBtn: { background: "none", border: "none", color: "#EF4444", fontSize: "15px", cursor: "pointer", lineHeight: 1 },
  routeActions: { display: "flex", gap: "6px", marginTop: "4px" },
  saveRouteBtn: { flex: 1, padding: "6px", borderRadius: "8px", border: "none", background: t.gradient, color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer" },
  optimizeBtn: { flex: 1, padding: "6px", borderRadius: "8px", border: "1px solid #7C3AED", background: "#F5F3FF", color: "#7C3AED", fontSize: "11px", fontWeight: 600, cursor: "pointer" },
  clearBtn: { flex: 1, padding: "6px", borderRadius: "8px", border: "1px solid #FECACA", background: "transparent", color: "#EF4444", fontSize: "11px", cursor: "pointer" },
  savedList: { display: "flex", flexDirection: "column", gap: "6px" },
  savedItem: { padding: "8px 10px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "#FAFAFA" },
  savedName: { fontSize: "12px", fontWeight: 700, color: t.text, marginBottom: "2px" },
  savedMeta: { fontSize: "10px", color: t.textMuted, marginBottom: "6px" },
  savedBtns: { display: "flex", gap: "5px" },
  loadBtn: { flex: 1, padding: "4px 6px", borderRadius: "6px", border: `1px solid ${t.primary}`, background: t.primaryLight, color: t.primary, fontSize: "10px", fontWeight: 600, cursor: "pointer" },
  delSavedBtn: { padding: "4px 8px", borderRadius: "6px", border: "1px solid #FECACA", background: "transparent", color: "#EF4444", fontSize: "10px", cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: "16px", width: "360px", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem 0.75rem", borderBottom: `1px solid ${t.border}` },
  modalTitle: { fontSize: "16px", fontWeight: 700, color: t.text },
  modalClose: { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: t.textMuted },
  modalBody: { padding: "1rem 1.5rem" },
  modalHint: { fontSize: "12px", color: t.textMuted, marginBottom: "10px" },
  modalInput: { width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${t.primary}`, fontSize: "13px", color: t.text, outline: "none", boxSizing: "border-box" },
  saveError: { marginTop: "8px", fontSize: "12px", color: "#EF4444", background: "#FEF2F2", padding: "6px 10px", borderRadius: "8px" },
  modalFoot: { display: "flex", gap: "8px", padding: "0.75rem 1.5rem 1.25rem" },
  modalCancel: { flex: 1, padding: "9px", borderRadius: "9px", border: `1px solid ${t.border}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer" },
  modalSave: { flex: 2, padding: "9px", borderRadius: "9px", border: "none", background: t.gradient, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  toolRow: { display: "flex", gap: "6px", marginTop: "10px", alignItems: "center" },
  modeRow: { marginTop: "10px" },
  modeTabs: { display: "flex", gap: "4px", marginTop: "5px" },
  modeBtn: { flex: 1, padding: "6px 4px", borderRadius: "8px", border: `1.5px solid ${t.border}`, background: "#fff", fontSize: "11px", fontWeight: 600, color: t.textMuted, cursor: "pointer", textAlign: "center" },
  modeBtnActive: { fontWeight: 700 },
  gpsBtn: { flex: 1, padding: "7px 10px", borderRadius: "9px", border: `1.5px solid ${t.border}`, background: "#fff", fontSize: "12px", fontWeight: 600, color: t.primary, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" },
  mapTypeTabs: { display: "flex", borderRadius: "9px", border: `1.5px solid ${t.border}`, overflow: "hidden" },
  mapTypeBtn: { padding: "7px 11px", border: "none", background: "#fff", fontSize: "16px", cursor: "pointer" },
  mapTypeBtnActive: { background: t.primaryLight },
  legend: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" },
  legendLabel: { fontSize: "12px", color: t.textMuted },
  routingBadge: { display: "inline-block", marginLeft: "6px", fontSize: "10px", color: "#D97706", background: "#FFFBEB", padding: "2px 6px", borderRadius: "6px", fontWeight: 600 },
  routedBadge: { display: "inline-block", marginLeft: "6px", fontSize: "10px", color: t.primary, background: t.primaryLight, padding: "2px 6px", borderRadius: "6px", fontWeight: 600 },
  mapWrap: { flex: 1, position: "relative" },

  // Yoğunluk haritası
  heatmapToggleBtn: { display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", width: "100%", padding: "7px 10px", borderRadius: "9px", border: `1.5px solid ${t.border}`, background: "#fff", fontSize: "12px", fontWeight: 600, color: t.textMuted, cursor: "pointer", transition: "all 0.15s", boxSizing: "border-box" },
  heatmapToggleBtnActive: { background: "#f5f3ff", color: "#7c3aed", borderColor: "#c4b5fd" },
  heatLegend: { marginTop: "8px" },
  heatLegendBar: { height: "8px", borderRadius: "4px", background: "linear-gradient(to right, #3b82f6, #10b981, #f59e0b, #ef4444, #7c3aed)", marginBottom: "4px" },
  heatLegendLabels: { display: "flex", justifyContent: "space-between", fontSize: "10px", color: t.textMuted },
};
