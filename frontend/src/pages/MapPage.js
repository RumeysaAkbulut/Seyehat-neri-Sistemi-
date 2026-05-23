import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Wikipedia'dan fotoğraf çek (isim bazlı)
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

// Overpass API — şehir merkezinden 15 km içindeki popüler POI'ları çek
async function fetchCityPlaces(lat, lon, radiusKm = 15) {
  const r = radiusKm * 1000;
  const query = `
    [out:json][timeout:20];
    (
      node["tourism"~"attraction|museum|viewpoint|gallery|artwork|theme_park|zoo|aquarium"](around:${r},${lat},${lon});
      node["historic"~"monument|castle|archaeological_site|ruins|memorial|fort|palace"](around:${r},${lat},${lon});
      node["leisure"~"park|nature_reserve|garden"](around:${r},${lat},${lon});
      node["amenity"~"theatre|cinema|library|place_of_worship"](around:${r},${lat},${lon});
    );
    out body 40;
  `;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });
  const data = await res.json();
  return (data.elements || []).filter(e => e.tags?.name);
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

function colorIcon(color, size = 12) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
  const pinCountRef = useRef(0);
  const debounceRef = useRef(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const searchCity = useCallback(async (query) => {
    if (!query.trim()) return;
    setCityLoading(true);
    setCityError("");
    setPois([]);
    try {
      const city = await geocodeCity(query);
      if (!city) { setCityError("Şehir bulunamadı."); setCityLoading(false); return; }
      const lat = parseFloat(city.lat);
      const lon = parseFloat(city.lon);
      setMapCenter([lat, lon]);
      setMapZoom(12);
      const results = await fetchCityPlaces(lat, lon);
      if (results.length === 0) { setCityError("Bu şehirde kayıtlı popüler mekan bulunamadı."); }
      setPois(results);
    } catch {
      setCityError("Veri alınamadı. Tekrar dene.");
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
      const payload = {
        name: poi.tags.name,
        city: cityQuery,
        category: osmTagToCategory(poi.tags),
        description: poi.tags["description"] || poi.tags["wikipedia"] || "",
        latitude: poi.lat,
        longitude: poi.lon,
        rating: 0,
        image_url: null,
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
            <div style={s.sectionLabel}>Oluşturulan Rota ({route.length} nokta)</div>
            <div style={s.routeList}>
              {route.map((p, i) => (
                <div key={p.id} style={s.routeItem}>
                  <span style={s.routeNum}>{i + 1}</span>
                  <span style={s.routeName}>{p.tags?.name || p.name || "Nokta"}</span>
                  <button style={s.removeBtn} onClick={() => p.isCustom ? removeCustomPin(p.id) : toggleRoute(p)}>×</button>
                </div>
              ))}
            </div>
            <button style={s.clearBtn} onClick={() => setRoute([])}>Rotayı Temizle</button>
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

      {/* Harita */}
      <div style={s.mapWrap}>
        <MapContainer center={mapCenter} zoom={6} style={{ width: "100%", height: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <FlyTo center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onMapClick={handleMapClick} />

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

          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords} color={ROUTE_COLOR} weight={3} dashArray="8,5" />
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
  routeNum: { fontSize: "11px", fontWeight: 700, color: t.primary, width: "16px" },
  routeName: { flex: 1, fontSize: "11px", color: t.text },
  removeBtn: { background: "none", border: "none", color: "#EF4444", fontSize: "15px", cursor: "pointer", lineHeight: 1 },
  clearBtn: { width: "100%", padding: "6px", borderRadius: "8px", border: "1px solid #FECACA", background: "transparent", color: "#EF4444", fontSize: "11px", cursor: "pointer" },
  legend: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" },
  legendLabel: { fontSize: "12px", color: t.textMuted },
  mapWrap: { flex: 1, position: "relative" },
};
