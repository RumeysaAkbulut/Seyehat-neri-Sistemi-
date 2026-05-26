import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

const API = "http://localhost:5001/api";

/* ─── Aktivite ikonu/meta (Activity.js ile aynı) ─────────────────────────── */
const TYPE_META = {
  favorite: {
    color: t.rose, bg: t.roseLight, label: "favoriye ekledi",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill={t.rose} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  },
  review: {
    color: t.purple, bg: t.purpleLight, label: "yorum yaptı",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  route: {
    color: t.primary, bg: t.primaryLight, label: "rota kaydetti",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 14-8 14S4 15.25 4 10a8 8 0 0 1 8-8z"/></svg>,
  },
  collection: {
    color: t.amber, bg: t.amberLight, label: "koleksiyon oluşturdu",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
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

/* ─── Yardımcı bileşenler ────────────────────────────────────────────────── */
function Avatar({ name, size = 36 }) {
  const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
  const hue = name ? name.charCodeAt(0) * 7 % 360 : 200;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue},55%,50%)`,
      color: "#fff", fontSize: size * 0.38,
      fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontFamily: t.font,
    }}>
      {initials}
    </div>
  );
}

function FeedItem({ item, navigate }) {
  const meta = TYPE_META[item.type] || TYPE_META.favorite;

  let title = "";
  let sub = "";
  let onClick = null;

  switch (item.type) {
    case "favorite":
      title = `${item.place_name || "Mekan"} mekanını favoriye ekledi`;
      onClick = () => item.place_id && navigate(`/places/${item.place_id}`);
      break;
    case "review":
      title = `${item.place_name || "Mekan"} için yorum yaptı`;
      sub = item.comment ? `"${item.comment.substring(0, 90)}${item.comment.length > 90 ? "…" : ""}"` : "";
      onClick = () => item.place_id && navigate(`/places/${item.place_id}`);
      break;
    case "route":
      title = `"${item.route_name}" rotasını kaydetti`;
      sub = `${item.waypoint_count || 0} durak`;
      onClick = () => navigate("/map");
      break;
    case "collection":
      title = `"${item.collection_name}" koleksiyonunu oluşturdu`;
      break;
    default:
      title = "Aktivite";
  }

  return (
    <div style={{ ...s.feedItem, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <Avatar name={item.user_name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.feedTop}>
          <span style={s.feedUser}>{item.user_name}</span>
          <div style={{ ...s.feedTypeBadge, background: meta.bg, color: meta.color }}>
            {meta.icon}
            <span>{meta.label}</span>
          </div>
        </div>
        <div style={s.feedTitle}>{title}</div>
        {sub && <div style={s.feedSub}>{sub}</div>}
        {item.type === "review" && item.rating && (
          <div style={s.ratingRow}>
            {"★".repeat(Math.round(item.rating))}{"☆".repeat(5 - Math.round(item.rating))}
            <span style={{ fontSize: "11px", fontWeight: 700, color: t.text, marginLeft: "4px" }}>{item.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div style={s.feedTime}>{timeAgo(item.created_at)}</div>
    </div>
  );
}

function UserCard({ user, onToggle, loading }) {
  return (
    <div style={s.userCard}>
      <Avatar name={user.name} size={42} />
      <div style={{ flex: 1 }}>
        <div style={s.userName}>{user.name}</div>
      </div>
      <button
        style={{
          ...s.followBtn,
          ...(user.is_following ? s.followingBtn : {}),
        }}
        onClick={() => onToggle(user)}
        disabled={loading === user.id}
      >
        {loading === user.id
          ? "..."
          : user.is_following ? "Takip Ediliyor" : "Takip Et"}
      </button>
    </div>
  );
}

/* ─── Ana bileşen ───────────────────────────────────────────────────────────── */
export default function Social() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const authH = { headers: { Authorization: `Bearer ${token}` } };

  const [tab, setTab] = useState("feed"); // "feed" | "search"

  // Akış
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Arama
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  // Takip Ettiklerim
  const [following, setFollowing] = useState([]);
  const [followLoading, setFollowLoading] = useState(null); // user id

  /* İlk yükleme */
  useEffect(() => {
    axios.get(`${API}/social/feed`, authH)
      .then(r => setFeed(r.data.activities || []))
      .catch(() => {})
      .finally(() => setFeedLoading(false));

    axios.get(`${API}/social/following`, authH)
      .then(r => setFollowing(r.data.following || []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Arama — debounce 400ms */
  useEffect(() => {
    if (tab !== "search") return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) { setResults([]); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(() => {
      axios.get(`${API}/social/search?q=${encodeURIComponent(query)}`, authH)
        .then(r => setResults(r.data.users || []))
        .catch(() => setResults([]))
        .finally(() => setSearchLoading(false));
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab]);

  const toggleFollow = async (user) => {
    setFollowLoading(user.id);
    try {
      if (user.is_following) {
        await axios.delete(`${API}/social/unfollow/${user.id}`, authH);
      } else {
        await axios.post(`${API}/social/follow/${user.id}`, {}, authH);
      }
      const updated = { ...user, is_following: !user.is_following };

      // Arama sonuçlarını güncelle
      setResults(prev => prev.map(u => u.id === user.id ? updated : u));

      // Takip listesini güncelle
      if (updated.is_following) {
        setFollowing(prev => [...prev, updated]);
      } else {
        setFollowing(prev => prev.filter(u => u.id !== user.id));
      }

      // Artık takip etmiyorsa akışı temizle
      if (!updated.is_following) {
        setFeed(prev => prev.filter(a => a.user_id !== user.id));
      }
    } catch { /* sessiz */ }
    finally { setFollowLoading(null); }
  };

  return (
    <div style={s.page}>

      {/* Sol panel — Takip Ettiklerim */}
      <div style={s.sidebar}>
        <div style={s.sideTitle}>Takip Ettiklerim</div>
        {following.length === 0
          ? <div style={s.sideEmpty}>Henüz kimseyi takip etmiyorsun. Arama sekmesinden kullanıcı bul.</div>
          : following.map(u => (
            <div key={u.id} style={s.sideUser}>
              <Avatar name={u.name} size={30} />
              <span style={s.sideUserName}>{u.name}</span>
              <button
                style={s.unfollowSmall}
                onClick={() => toggleFollow(u)}
                disabled={followLoading === u.id}
                title="Takibi bırak"
              >
                {followLoading === u.id ? "..." : "×"}
              </button>
            </div>
          ))
        }
      </div>

      {/* Ana içerik */}
      <div style={s.main}>

        {/* Başlık + tab seçici */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Sosyal Akış</h1>
            <p style={s.sub}>Takip ettiğin kişilerin seyahat aktiviteleri</p>
          </div>
          <div style={s.tabs}>
            <button
              style={{ ...s.tabBtn, ...(tab === "feed" ? s.tabBtnActive : {}) }}
              onClick={() => setTab("feed")}
            >
              Akış
            </button>
            <button
              style={{ ...s.tabBtn, ...(tab === "search" ? s.tabBtnActive : {}) }}
              onClick={() => setTab("search")}
            >
              Kullanıcı Ara
            </button>
          </div>
        </div>

        {/* ── AKIŞ SEKME ── */}
        {tab === "feed" && (
          <>
            {feedLoading && (
              <div style={s.center}>
                <div style={s.spinner} />
                <div style={s.centerText}>Yükleniyor...</div>
              </div>
            )}
            {!feedLoading && feed.length === 0 && (
              <div style={s.empty}>
                <div style={s.emptyIcon}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={t.textLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div style={s.emptyTitle}>Akışın boş</div>
                <p style={s.emptySub}>
                  Kullanıcıları takip ettiğinde burada seyahat aktiviteleri görünecek.
                </p>
                <button style={s.ctaBtn} onClick={() => setTab("search")}>
                  Kullanıcı Ara
                </button>
              </div>
            )}
            {!feedLoading && feed.length > 0 && (
              <div style={s.feedList}>
                {feed.map((item, i) => (
                  <FeedItem key={i} item={item} navigate={navigate} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ARAMA SEKME ── */}
        {tab === "search" && (
          <div style={s.searchSection}>
            <div style={s.searchBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                style={s.searchInput}
                placeholder="İsme göre kullanıcı ara..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button style={s.clearBtn} onClick={() => { setQuery(""); setResults([]); }}>×</button>
              )}
            </div>

            {searchLoading && <div style={s.searchHint}>Aranıyor...</div>}
            {!searchLoading && query.length >= 2 && results.length === 0 && (
              <div style={s.searchHint}>"{query}" için sonuç bulunamadı.</div>
            )}
            {query.length < 2 && !searchLoading && (
              <div style={s.searchHint}>En az 2 karakter yaz.</div>
            )}

            <div style={s.resultList}>
              {results.map(u => (
                <UserCard
                  key={u.id}
                  user={u}
                  onToggle={toggleFollow}
                  loading={followLoading}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stiller ────────────────────────────────────────────────────────────── */
const s = {
  page:    { display: "flex", minHeight: "calc(100vh - 58px)", background: t.bg, fontFamily: t.font },

  /* Sidebar */
  sidebar:      { width: "220px", flexShrink: 0, background: "#fff", borderRight: `1px solid ${t.border}`, padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "8px" },
  sideTitle:    { fontSize: "12px", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  sideEmpty:    { fontSize: "12px", color: t.textLight, lineHeight: 1.5 },
  sideUser:     { display: "flex", alignItems: "center", gap: "8px", padding: "5px 0" },
  sideUserName: { flex: 1, fontSize: "13px", fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  unfollowSmall:{ background: "none", border: "none", color: t.textLight, fontSize: "18px", cursor: "pointer", lineHeight: 1, padding: "0 2px", flexShrink: 0 },

  /* Ana alan */
  main:   { flex: 1, padding: "2rem 2.5rem", maxWidth: "760px" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" },
  title:  { fontSize: "24px", fontWeight: 700, color: t.text, margin: "0 0 4px", fontFamily: t.font },
  sub:    { fontSize: "13px", color: t.textMuted, margin: 0 },

  tabs:        { display: "flex", gap: "6px" },
  tabBtn:      { padding: "8px 18px", borderRadius: "20px", border: `1.5px solid ${t.border}`, background: "#fff", fontSize: "13px", fontWeight: 600, color: t.textMuted, cursor: "pointer", transition: "all 0.15s" },
  tabBtnActive:{ background: t.primaryLight, color: t.primary, borderColor: t.primary },

  /* Akış */
  feedList: { display: "flex", flexDirection: "column", gap: "8px" },
  feedItem: { background: "#fff", borderRadius: "14px", border: `1px solid ${t.border}`, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "12px", transition: "box-shadow 0.15s" },
  feedTop:  { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" },
  feedUser: { fontSize: "13px", fontWeight: 700, color: t.text },
  feedTypeBadge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 },
  feedTitle:{ fontSize: "13px", color: t.text, lineHeight: 1.4 },
  feedSub:  { fontSize: "12px", color: t.textMuted, marginTop: "4px", lineHeight: 1.5, fontStyle: "italic" },
  feedTime: { fontSize: "11px", color: t.textMuted, flexShrink: 0, marginTop: "2px", whiteSpace: "nowrap" },
  ratingRow:{ fontSize: "12px", color: "#F59E0B", marginTop: "4px" },

  /* Boş durum */
  center:    { display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "12px" },
  centerText:{ fontSize: "14px", color: t.textMuted },
  spinner:   { width: "32px", height: "32px", borderRadius: "50%", border: `3px solid ${t.border}`, borderTop: `3px solid ${t.primary}`, animation: "spin 0.8s linear infinite" },
  empty:     { display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 2rem", textAlign: "center" },
  emptyIcon: { width: "72px", height: "72px", borderRadius: "50%", background: t.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" },
  emptyTitle:{ fontSize: "18px", fontWeight: 700, color: t.text, marginBottom: "8px" },
  emptySub:  { fontSize: "14px", color: t.textMuted, lineHeight: 1.6, maxWidth: "360px", marginBottom: "24px" },
  ctaBtn:    { padding: "10px 24px", borderRadius: "10px", border: "none", background: t.gradient, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: t.font },

  /* Arama */
  searchSection: { display: "flex", flexDirection: "column", gap: "12px" },
  searchBox:     { display: "flex", alignItems: "center", gap: "10px", background: "#fff", border: `1.5px solid ${t.border}`, borderRadius: "12px", padding: "10px 14px" },
  searchInput:   { flex: 1, border: "none", outline: "none", fontSize: "14px", color: t.text, background: "transparent", fontFamily: t.font },
  clearBtn:      { background: "none", border: "none", fontSize: "18px", color: t.textMuted, cursor: "pointer", lineHeight: 1, padding: 0 },
  searchHint:    { fontSize: "13px", color: t.textMuted, paddingLeft: "4px" },
  resultList:    { display: "flex", flexDirection: "column", gap: "8px" },

  /* Kullanıcı kartı */
  userCard:  { background: "#fff", borderRadius: "12px", border: `1px solid ${t.border}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" },
  userName:  { fontSize: "14px", fontWeight: 600, color: t.text },
  followBtn: { padding: "7px 16px", borderRadius: "20px", border: `1.5px solid ${t.primary}`, background: t.gradient, color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s", flexShrink: 0, fontFamily: t.font },
  followingBtn: { background: "#fff", color: t.textMuted, borderColor: t.border },
};
