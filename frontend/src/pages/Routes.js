import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:5001";

export default function Routes() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [shareCopied, setShareCopied] = useState(null); // routeId whose link was just copied
  const [shareLoading, setShareLoading] = useState(null); // routeId being processed

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchRoutes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/api/routes/`, authHeader);
      setRoutes(res.data.routes || []);
    } catch {
      setError("Rotalar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/api/routes/${id}`, authHeader);
      setRoutes(prev => prev.filter(r => r.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      setError("Rota silinemedi.");
    } finally {
      setDeleteId(null);
    }
  };

  const loadOnMap = (route) => {
    // route verisini localStorage'a kaydedip harita sayfasına yönlendir
    localStorage.setItem("load_route", JSON.stringify(route));
    navigate("/map");
  };

  const handleShare = async (routeId) => {
    setShareLoading(routeId);
    try {
      const res = await axios.post(`${API}/api/routes/${routeId}/share`, {}, authHeader);
      const token = res.data.share_token;
      const link = `${window.location.origin}/share/route/${token}`;
      await navigator.clipboard.writeText(link);
      setShareCopied(routeId);
      setTimeout(() => setShareCopied(null), 2500);
    } catch {
      setError("Paylaşım linki oluşturulamadı.");
    } finally {
      setShareLoading(null);
    }
  };

  if (loading) return (
    <div style={s.center}>
      <div style={{ fontSize: "48px" }}>⏳</div>
      <div style={s.muted}>Rotalar yükleniyor...</div>
    </div>
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>🗺️ Rotalarım</h1>
          <p style={s.sub}>Kaydettiğin tüm seyahat rotaları burada.</p>
        </div>
        <button style={s.newBtn} onClick={() => navigate("/map")}>
          + Yeni Rota Oluştur
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {routes.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🛤️</div>
          <div style={s.emptyTitle}>Henüz kaydedilmiş rota yok</div>
          <p style={s.emptySub}>
            Harita sayfasında mekanları seçerek kendi rotanı oluşturabilir ve buraya kaydedebilirsin.
          </p>
          <button style={s.newBtn} onClick={() => navigate("/map")}>
            🗺️ Haritaya Git
          </button>
        </div>
      ) : (
        <div style={s.grid}>
          {routes.map(route => (
            <div key={route.id} style={s.card}>
              {/* Kart başlığı */}
              <div style={s.cardHeader}>
                <div style={s.cardLeft}>
                  <div style={s.routeIcon}>🗺️</div>
                  <div>
                    <div style={s.routeName}>{route.name}</div>
                    <div style={s.routeMeta}>
                      <span style={s.waypointBadge}>
                        📍 {route.waypoints?.length || 0} durak
                      </span>
                      <span style={s.dateBadge}>
                        🕐 {new Date(route.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  style={s.expandBtn}
                  onClick={() => setExpandedId(expandedId === route.id ? null : route.id)}
                >
                  {expandedId === route.id ? "▲" : "▼"}
                </button>
              </div>

              {/* Açıklama */}
              {route.description && (
                <div style={s.description}>{route.description}</div>
              )}

              {/* Duraklar (genişletilmiş) */}
              {expandedId === route.id && (
                <div style={s.waypointList}>
                  {route.waypoints?.length === 0 ? (
                    <div style={s.noWaypoints}>Bu rotada durak kaydedilmemiş.</div>
                  ) : (
                    route.waypoints.map((wp, i) => (
                      <div key={i} style={s.waypointItem}>
                        <div style={s.waypointNum}>{i + 1}</div>
                        <div style={s.waypointInfo}>
                          <div style={s.waypointName}>{wp.name || `Durak ${i + 1}`}</div>
                          {(wp.lat || wp.latitude) && (
                            <div style={s.waypointCoord}>
                              {Number(wp.lat || wp.latitude).toFixed(4)}°,&nbsp;
                              {Number(wp.lng || wp.longitude).toFixed(4)}°
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Aksiyonlar */}
              <div style={s.actions}>
                <button style={s.mapBtn} onClick={() => loadOnMap(route)}>
                  🗺️ Haritada Aç
                </button>
                <button
                  style={{ ...s.shareBtn, ...(shareCopied === route.id ? s.shareBtnCopied : {}) }}
                  onClick={() => handleShare(route.id)}
                  disabled={shareLoading === route.id}
                >
                  {shareCopied === route.id ? "✅ Kopyalandı!" : shareLoading === route.id ? "⏳" : "🔗 Paylaş"}
                </button>
                {deleteId === route.id ? (
                  <div style={s.confirmRow}>
                    <span style={s.confirmText}>Emin misin?</span>
                    <button style={s.confirmYes} onClick={() => handleDelete(route.id)}>Sil</button>
                    <button style={s.confirmNo} onClick={() => setDeleteId(null)}>İptal</button>
                  </div>
                ) : (
                  <button style={s.delBtn} onClick={() => setDeleteId(route.id)}>
                    🗑️ Sil
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { fontFamily: "system-ui,sans-serif", padding: "2rem" },
  center: { minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", fontFamily: "system-ui,sans-serif" },
  muted: { fontSize: "15px", color: "#4a7a62" },

  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "12px" },
  title: { fontSize: "24px", fontWeight: 800, color: "#1a2e25", margin: "0 0 4px" },
  sub: { fontSize: "13px", color: "#4a7a62", margin: 0 },
  newBtn: { padding: "11px 20px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#0f6e56,#1d9e75)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },

  errorBox: { padding: "12px 16px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: "13px", marginBottom: "1rem" },

  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", textAlign: "center" },
  emptyTitle: { fontSize: "20px", fontWeight: 700, color: "#1a2e25", marginBottom: "8px" },
  emptySub: { fontSize: "14px", color: "#4a7a62", lineHeight: 1.6, maxWidth: "400px", marginBottom: "24px" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" },

  card: { background: "#fff", borderRadius: "16px", border: "1px solid #e1f0e8", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 1px 6px rgba(15,110,86,0.06)" },
  cardHeader: { display: "flex", alignItems: "flex-start", gap: "12px", justifyContent: "space-between" },
  cardLeft: { display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: 0 },
  routeIcon: { fontSize: "28px", flexShrink: 0 },
  routeName: { fontSize: "16px", fontWeight: 700, color: "#1a2e25", marginBottom: "6px", wordBreak: "break-word" },
  routeMeta: { display: "flex", flexWrap: "wrap", gap: "6px" },
  waypointBadge: { fontSize: "11px", padding: "3px 9px", borderRadius: "8px", background: "#e6f7f0", color: "#0f6e56", fontWeight: 600 },
  dateBadge: { fontSize: "11px", padding: "3px 9px", borderRadius: "8px", background: "#f1f5f9", color: "#64748b", fontWeight: 500 },
  expandBtn: { background: "none", border: "1px solid #e1f0e8", borderRadius: "8px", width: "30px", height: "30px", cursor: "pointer", fontSize: "11px", color: "#4a7a62", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },

  description: { fontSize: "13px", color: "#4a7a62", lineHeight: 1.6, background: "#f5faf7", borderRadius: "10px", padding: "8px 12px" },

  waypointList: { display: "flex", flexDirection: "column", gap: "6px", background: "#f5faf7", borderRadius: "10px", padding: "10px 12px" },
  noWaypoints: { fontSize: "12px", color: "#7a9e8e", fontStyle: "italic", textAlign: "center", padding: "4px 0" },
  waypointItem: { display: "flex", alignItems: "flex-start", gap: "8px" },
  waypointNum: { width: "22px", height: "22px", borderRadius: "50%", background: "#0f6e56", color: "#fff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" },
  waypointInfo: { flex: 1, minWidth: 0 },
  waypointName: { fontSize: "13px", fontWeight: 600, color: "#1a2e25" },
  waypointCoord: { fontSize: "11px", color: "#7a9e8e", fontFamily: "monospace" },

  actions: { display: "flex", gap: "8px", alignItems: "center", marginTop: "4px", borderTop: "1px solid #f0f4f3", paddingTop: "12px", flexWrap: "wrap" },
  mapBtn: { flex: 1, padding: "9px 14px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#0f6e56,#1d9e75)", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  shareBtn: { padding: "9px 14px", borderRadius: "10px", border: "1.5px solid #0f6e56", background: "#fff", color: "#0f6e56", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  shareBtnCopied: { background: "#e6f7f0", borderColor: "#0f6e56", color: "#0f6e56" },
  delBtn: { padding: "9px 14px", borderRadius: "10px", border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  confirmRow: { display: "flex", alignItems: "center", gap: "6px" },
  confirmText: { fontSize: "12px", color: "#dc2626", fontWeight: 600 },
  confirmYes: { padding: "6px 12px", borderRadius: "8px", border: "none", background: "#dc2626", color: "#fff", fontSize: "11px", fontWeight: 700, cursor: "pointer" },
  confirmNo: { padding: "6px 12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", color: "#64748b", fontSize: "11px", fontWeight: 600, cursor: "pointer" },
};
