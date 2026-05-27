import API_URL from '../api';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

const TYPE_META = {
  favorite:        {
    color: t.rose, bg: t.roseLight, label: "Favoriye eklendi",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={t.rose} stroke="none">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  review:          {
    color: t.purple, bg: t.purpleLight, label: "Yorum yapıldı",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  route:           {
    color: t.primary, bg: t.primaryLight, label: "Rota kaydedildi",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 14-8 14S4 15.25 4 10a8 8 0 0 1 8-8z"/>
      </svg>
    ),
  },
  collection:      {
    color: t.amber, bg: t.amberLight, label: "Koleksiyon oluşturuldu",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  collection_item: {
    color: t.blue, bg: t.blueLight, label: "Koleksiyona eklendi",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
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
  const placeName = item.place_name || (item.place_id ? `Mekan #${item.place_id}` : null);

  let title = "";
  let sub = "";

  switch (item.type) {
    case "favorite":
      title = `${placeName || "Mekan"} favorilere eklendi`;
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
      break;
    case "collection_item":
      title = `${placeName || "Mekan"} "${item.collection_name}" koleksiyonuna eklendi`;
      break;
    default:
      title = "Bilinmeyen işlem";
  }

  const handleClick = () => {
    if (["favorite", "review", "collection_item"].includes(item.type)) {
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
        {meta.icon}
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
    axios.get(`${API_URL}/api/activity/`, authHeader)
      .then(r => { setActivities(r.data.activities || []); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FILTERS = [
    { key: "all",             label: "Tümü",                 activeColor: t.primary,  activeBg: t.primaryLight },
    { key: "favorite",        label: "Favoriler",            activeColor: t.rose,     activeBg: t.roseLight },
    { key: "review",          label: "Yorumlar",             activeColor: t.purple,   activeBg: t.purpleLight },
    { key: "route",           label: "Rotalar",              activeColor: t.primary,  activeBg: t.primaryLight },
    { key: "collection",      label: "Koleksiyonlar",        activeColor: t.amber,    activeBg: t.amberLight },
    { key: "collection_item", label: "Koleksiyon Eklemeleri",activeColor: t.blue,     activeBg: t.blueLight },
  ];

  const displayed = filter === "all" ? activities : activities.filter(a => a.type === filter);

  if (loading) return (
    <div style={s.center}>
      <div style={s.loadingSpinner} />
      <div style={{ fontSize: "14px", color: t.textMuted, fontFamily: t.font }}>Yükleniyor...</div>
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

      <div style={s.filters}>
        {FILTERS.map(f => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              style={{
                ...s.chip,
                ...(isActive ? { background: f.activeBg, color: f.activeColor, borderColor: f.activeColor } : {}),
              }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {displayed.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={t.textLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div style={s.emptyTitle}>
            {filter === "all" ? "Henüz aktivite yok" : "Bu kategoride aktivite yok"}
          </div>
          <p style={s.emptySub}>
            Mekan favorile, yorum yap veya rota kaydet — işlemler burada görünecek.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <button style={s.ctaBtnGreen} onClick={() => navigate("/places")}>Mekanlara Git</button>
            <button style={s.ctaBtnBlue} onClick={() => navigate("/map")}>Haritaya Git</button>
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
  page: { minHeight: "calc(100vh - 58px)", background: t.bg, fontFamily: t.font, padding: "2rem 2.5rem" },
  center: { minHeight: "calc(100vh - 58px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" },
  loadingSpinner: { width: "32px", height: "32px", borderRadius: "50%", border: `3px solid ${t.border}`, borderTop: `3px solid ${t.primary}`, animation: "spin 0.8s linear infinite" },
  header: { marginBottom: "1.5rem" },
  title: { fontSize: "24px", fontWeight: 700, color: t.text, margin: "0 0 4px", fontFamily: t.font },
  sub: { fontSize: "13px", color: t.textMuted, margin: 0 },

  filters: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.5rem" },
  chip: { padding: "7px 16px", borderRadius: "20px", border: `1.5px solid ${t.border}`, background: "#fff", fontSize: "12px", fontWeight: 600, color: t.textMuted, cursor: "pointer", fontFamily: t.font, transition: "all 0.15s" },

  feed: { display: "flex", flexDirection: "column", gap: "8px", maxWidth: "720px" },
  item: { background: "#fff", borderRadius: "14px", border: `1px solid ${t.border}`, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "14px" },
  iconBox: { width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemBody: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: "14px", fontWeight: 600, color: t.text, lineHeight: 1.4, fontFamily: t.font },
  itemSub: { fontSize: "12px", color: t.textMuted, marginTop: "4px", lineHeight: 1.5, fontStyle: "italic" },
  ratingRow: { fontSize: "12px", color: "#F59E0B", marginTop: "4px" },
  ratingNum: { fontSize: "12px", fontWeight: 700, color: t.text },
  timeAgo: { fontSize: "11px", color: t.textMuted, flexShrink: 0, marginTop: "2px", whiteSpace: "nowrap", fontFamily: t.font },

  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 2rem", textAlign: "center" },
  emptyIcon: { width: "72px", height: "72px", borderRadius: "50%", background: t.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" },
  emptyTitle: { fontSize: "18px", fontWeight: 700, color: t.text, marginBottom: "8px", fontFamily: t.font },
  emptySub: { fontSize: "14px", color: t.textMuted, lineHeight: 1.6, maxWidth: "380px", marginBottom: "24px" },
  ctaBtnGreen: { padding: "10px 22px", borderRadius: "10px", border: "none", background: t.gradient, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: t.font },
  ctaBtnBlue: { padding: "10px 22px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: t.font },
};
