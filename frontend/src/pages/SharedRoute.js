import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import { t } from "../theme";

// Leaflet default ikon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

async function fetchOSRMRoute(waypoints) {
  if (waypoints.length < 2) return null;
  try {
    const coords = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    return data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  } catch { return null; }
}

export default function SharedRoute() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [routeGeometry, setRouteGeometry] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:5001/api/share/route/${token}`)
      .then(async r => {
        const routeData = r.data.route;
        setRoute(routeData);
        setLoading(false);
        // OSRM ile gerçek yol geometrisi çek
        const wps = (routeData.waypoints || []).filter(wp => wp.lat && wp.lng);
        if (wps.length >= 2) {
          const geometry = await fetchOSRMRoute(wps);
          if (geometry) setRouteGeometry(geometry);
          else setRouteGeometry(wps.map(wp => [wp.lat, wp.lng]));
        }
      })
      .catch(() => { setError("Rota bulunamadı veya paylaşım linki geçersiz."); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div style={s.center}>
      <div style={{ fontSize: "48px" }}>⏳</div>
      <div style={s.loadingText}>Rota yükleniyor...</div>
    </div>
  );

  if (error || !route) return (
    <div style={s.center}>
      <div style={{ fontSize: "48px" }}>😕</div>
      <div style={s.loadingText}>{error || "Rota bulunamadı."}</div>
      <button style={s.loginBtn} onClick={() => navigate("/login")}>Giriş Yap →</button>
    </div>
  );

  const waypoints = route.waypoints || [];
  const hasCoords = waypoints.some(wp => wp.lat && wp.lng);
  const center = hasCoords
    ? [waypoints.find(wp => wp.lat)?.lat, waypoints.find(wp => wp.lng)?.lng]
    : [39.9, 32.8];
  const polyline = waypoints.filter(wp => wp.lat && wp.lng).map(wp => [wp.lat, wp.lng]);

  return (
    <div style={s.page}>
      {/* Üst Bar */}
      <div style={s.topBar}>
        <div style={s.logo}>🗺️ Seyahat Öneri Sistemi</div>
        <button style={s.loginBtn} onClick={() => navigate("/login")}>Giriş Yap</button>
      </div>

      <div style={s.content}>
        {/* Rota Başlığı */}
        <div style={s.header}>
          <div style={s.shareIcon}>🔗</div>
          <div>
            <div style={s.sharedLabel}>Paylaşılan Rota</div>
            <h1 style={s.routeName}>{route.name}</h1>
            {route.description && <p style={s.routeDesc}>{route.description}</p>}
          </div>
        </div>

        <div style={s.layout}>
          {/* Sol: Waypoint Listesi */}
          <div style={s.sidebar}>
            <div style={s.sideTitle}>📍 Duraklar ({waypoints.length})</div>
            {waypoints.length === 0 ? (
              <div style={s.empty}>Durak bilgisi yok.</div>
            ) : (
              <div style={s.waypointList}>
                {waypoints.map((wp, i) => (
                  <div key={i} style={s.waypointItem}>
                    <div style={s.wpNum}>{i + 1}</div>
                    <div style={s.wpInfo}>
                      <div style={s.wpName}>{wp.name || `Durak ${i + 1}`}</div>
                      {wp.lat && wp.lng && (
                        <div style={s.wpCoords}>{Number(wp.lat).toFixed(4)}, {Number(wp.lng).toFixed(4)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={s.ctaBox}>
              <div style={s.ctaText}>Bu rotayı kaydetmek veya kendi rotanı oluşturmak ister misin?</div>
              <button style={s.ctaBtn} onClick={() => navigate("/register")}>Ücretsiz Kayıt Ol →</button>
            </div>
          </div>

          {/* Sağ: Harita */}
          <div style={s.mapWrap}>
            {hasCoords ? (
              <MapContainer
                center={center}
                zoom={7}
                style={{ width: "100%", height: "100%", borderRadius: "16px" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                {routeGeometry.length > 1 && (
                  <Polyline positions={routeGeometry} color={t.primary} weight={4} opacity={0.85} />
                )}
                {routeGeometry.length < 2 && polyline.length > 1 && (
                  <Polyline positions={polyline} color={t.primary} weight={2} dashArray="8,8" opacity={0.4} />
                )}
                {waypoints.filter(wp => wp.lat && wp.lng).map((wp, i) => (
                  <Marker key={i} position={[wp.lat, wp.lng]}>
                    <Popup>
                      <strong>{i + 1}. {wp.name || `Durak ${i + 1}`}</strong>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div style={s.noMap}>
                <div style={{ fontSize: "48px" }}>🗺️</div>
                <div>Harita koordinatı bulunamadı.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: t.bg, fontFamily: "system-ui,sans-serif" },
  center: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  loadingText: { fontSize: "16px", color: t.textMuted },

  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", background: "#fff", borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, zIndex: 100 },
  logo: { fontSize: "16px", fontWeight: 700, color: t.primary },
  loginBtn: { padding: "8px 18px", borderRadius: "10px", border: "none", background: t.gradient, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },

  content: { padding: "2rem 2.5rem" },
  header: { display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "2rem" },
  shareIcon: { fontSize: "40px", lineHeight: 1 },
  sharedLabel: { fontSize: "12px", fontWeight: 600, color: t.primary, background: t.primaryLight, padding: "3px 10px", borderRadius: "6px", display: "inline-block", marginBottom: "6px" },
  routeName: { fontSize: "28px", fontWeight: 800, color: t.text, margin: "0 0 6px", letterSpacing: "-0.5px" },
  routeDesc: { fontSize: "14px", color: t.textMuted, margin: 0, lineHeight: 1.6 },

  layout: { display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem", alignItems: "start" },
  sidebar: { background: "#fff", borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden" },
  sideTitle: { fontSize: "12px", fontWeight: 700, color: t.textMuted, padding: "1rem 1.25rem 0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${t.border}` },
  empty: { padding: "1.5rem", fontSize: "13px", color: t.textMuted, textAlign: "center" },
  waypointList: { maxHeight: "380px", overflowY: "auto" },
  waypointItem: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", borderBottom: `1px solid ${t.borderLight}` },
  wpNum: { width: "26px", height: "26px", borderRadius: "50%", background: t.gradient, color: "#fff", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" },
  wpInfo: {},
  wpName: { fontSize: "13px", fontWeight: 600, color: t.text },
  wpCoords: { fontSize: "11px", color: t.textMuted, marginTop: "2px", fontFamily: "monospace" },
  ctaBox: { padding: "1.25rem", borderTop: `1px solid ${t.border}`, background: t.primaryLight, display: "flex", flexDirection: "column", gap: "10px" },
  ctaText: { fontSize: "12px", color: t.primary, fontWeight: 500, lineHeight: 1.5 },
  ctaBtn: { padding: "10px", borderRadius: "10px", border: "none", background: t.gradient, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },

  mapWrap: { height: "480px", borderRadius: "16px", overflow: "hidden", border: `1px solid ${t.border}` },
  noMap: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", background: "#fff", fontSize: "14px", color: t.textMuted },
};
