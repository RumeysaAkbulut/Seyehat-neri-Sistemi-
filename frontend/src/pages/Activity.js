import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

// Sample place isimleri (id 1-10 için backend'de kayıt olmayabilir)
const SAMPLE_NAMES = {
  1: "Topkapı Sarayı", 2: "Ayasofya", 3: "Galata Kulesi", 4: "Kapalıçarşı",
  5: "Anıtkabir", 6: "Ephesus", 7: "Pamukkale", 8: "Kapadokya",
  9: "Safranbolu", 10: "Alaçatı",
};

const TYPE_META = {
  favorite:        { icon: "❤️",  color: "#e11d48", bg: "#fff1f2", label: "Favoriye eklendi" },
  review:          { icon: "💬",  color: "#7c3aed", bg: "#f5f3ff", label: "Yorum yapıldı" },
  route:           { icon: "🗺️", color: "#0f6e56", bg: "#e6f7f0", label: "Rota kaydedildi" },
  collection:      { icon: "📚", color: "#d97706", bg: "#fffbeb", label: "Koleksiyon oluşturuldu" },
  collection_item: { icon: "📌", color: "#2563eb", bg: "#eff6ff", label: "Koleksiyona eklendi" },
};

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Az önce";
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} gün önce`;
  return new Date(isoStr).toLocaleDateString("tr-TR");
}

function ActivityItem({ item, navigate }) {
  const meta = TYPE_META[item.type] || TYPE_META.favorite;
  const placeName = item.place_name || (item.place_id ? SAMPLE_NAMES[item.place_id] || `Mekan #${item.place_id}` : null);

  let title = "";
  let sub = "";

  switch (item.type) {
    case "favorite":
      title = `${placeName || "Mekan"} favorilere eklendi`;
      sub = item.place_id ? null : null;
      break;
    case "review":
      title = `${placeName || "Mekan"} için yorum yazıldı`;
      sub = item.comment ? `"${item.comment.substring(0, 80)}${item.comment.length > 80 ? "…" : ""}"` : null;
      break;
    case "route":
      title = `"${item.route_name}" rotası kaydedildi`;
      sub = `${item.waypoint_count || 0} durak`;
      break;
    case "collection":
      title = `"${item.collection_name}" koleksiyonu oluşturuldu`;
      sub = null;
      break;
    case "collection_item":
      title = `${placeName || "Mekan"} "${item.collection_name}" koleksiyonuna eklendi`;
      sub = null;
      break;
    default:
      title = "Bilinmeyen işlem";
  }

  const handleClick = () => {
    if (item.type === "favorite" || item.type === "review" || item.type === "collection_item") {
      if (item.place_id) navigate(`/places/${item.place_id}`);
    } else if (item.type === "route") {
      navigate("/routes");
    } else if (item.type === "collection") {
      navigate("/collections");
    }
  };

  return (
    <div style={{ ...s.item, cursor: "pointer" }} onClick={handleClick}>
      <div style={{ ...s.iconBox, background: meta.bg }}>
        <span style={{ fontSize: "20px", lineHeight: 1 }}>{meta.icon}</span>
      </div>
      <div style={s.itemBody}>
        <div style={s.itemTitle}>{title}</div>
        {sub && <div style={s.itemSub}>{sub}</div>}
        {item.type === "review" && item.rating && (
          <div style={s.ratingRow}>
            {"★".repeat(Math.round(item.rating))}{"☆".repeat(5 - Math.round(item.rating))}
            <span style={s.ratingNum}> {item.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div style={s.timeAgo}>{timeAgo(item.created_at)}</div>
    </div>
  );
}

export default function Activity() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get("http://localhost:5001/api/activity/", authHeader)
      .then(r => { setActivities(r.data.activities || []); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FILTERS = [
    { key: "all",             label: "Tümü" },
    { key: "favorite",        label: "❤️ Favoriler" },
    { key: "review",          label: "💬 Yorumlar" },
    { key: "route",           label: "🗺️ Rotalar" },
    { key: "collection",      label: "📚 Koleksiyonlar" },
    { key: "collection_item", label: "📌 Koleksiyon Eklemeleri" },
  ];

  const displayed = filter === "all" ? activities : activities.filter(a => a.type === filter);

  if (loading) return (
    <div style={s.center}>
      <div style={{ fontSize: "48px" }}>⏳</div>
      <div style={{ fontSize: "15px", color: t.textMuted }}>Yükleniyor...</div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Son İşlemler</h1>
          <p style={s.sub}>Tüm aktivitelerinizin kronolojik akışı</p>
        </div>
      </div>

      {/* Filtre chip'leri */}
      <div style={s.filters}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            style={{ ...s.chip, ...(filter === f.key ? s.chipActive : {}) }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>📭</div>
          <div style={s.emptyTitle}>
            {filter === "all" ? "Henüz aktivite yok" : "Bu kategoride aktivite yok"}
          </div>
          <p style={s.emptySub}>
            Mekan favorile, yorum yap veya rota kaydet — işlemler burada görünecek.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <button style={s.ctaBtn} onClick={() => navigate("/places")}>🏛️ Mekanlara Git</button>
            <button style={s.ctaBtn} onClick={() => navigate("/map")}>🗺️ Haritaya Git</button>
          </div>
        </div>
      ) : (
        <div style={s.feed}>
          {displayed.map((item, i) => (
            <ActivityItem key={i} item={item} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "calc(100vh - 58px)", background: t.bg, fontFamily: "system-ui,sans-serif", padding: "2rem 2.5rem" },
  center: { minHeight: "calc(100vh - 58px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" },
  header: { marginBottom: "1.5rem" },
  title: { fontSize: "24px", fontWeight: 700, color: t.text, margin: "0 0 4px" },
  sub: { fontSize: "13px", color: t.textMuted, margin: 0 },

  filters: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.5rem" },
  chip: { padding: "7px 14px", borderRadius: "20px", border: `1.5px solid ${t.border}`, background: "#fff", fontSize: "12px", fontWeight: 500, color: t.textMuted, cursor: "pointer" },
  chipActive: { background: t.primaryLight, color: t.primary, borderColor: t.primary },

  feed: { display: "flex", flexDirection: "column", gap: "8px", maxWidth: "720px" },
  item: { background: "#fff", borderRadius: "14px", border: `1px solid ${t.border}`, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "14px", transition: "box-shadow 0.15s" },
  iconBox: { width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemBody: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: "14px", fontWeight: 600, color: t.text, lineHeight: 1.4 },
  itemSub: { fontSize: "12px", color: t.textMuted, marginTop: "4px", lineHeight: 1.5, fontStyle: "italic" },
  ratingRow: { fontSize: "12px", color: "#F59E0B", marginTop: "4px" },
  ratingNum: { fontSize: "12px", fontWeight: 700, color: t.text },
  timeAgo: { fontSize: "11px", color: t.textMuted, flexShrink: 0, marginTop: "2px", whiteSpace: "nowrap" },

  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 2rem", textAlign: "center" },
  emptyTitle: { fontSize: "18px", fontWeight: 700, color: t.text, marginBottom: "8px" },
  emptySub: { fontSize: "14px", color: t.textMuted, lineHeight: 1.6, maxWidth: "380px", marginBottom: "24px" },
  ctaBtn: { padding: "10px 20px", borderRadius: "10px", border: "none", background: t.gradient, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
};
