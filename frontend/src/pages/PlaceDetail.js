import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

// Leaflet default ikon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});


const categoryEmoji = { müze:"🏛️", park:"🌳", restoran:"🍽️", tarihi:"🏰", alışveriş:"🛍️", eğlence:"🎡", doğa:"🏔️" };
const stars = (r) => "★".repeat(Math.round(r || 0)) + "☆".repeat(5 - Math.round(r || 0));

export default function PlaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [showColMenu, setShowColMenu] = useState(false);
  const [colMsg, setColMsg] = useState("");
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const numId = parseInt(id);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Her zaman backend'den çek
      try {
        const res = await axios.get(`http://localhost:5001/api/places/${id}`, authHeader);
        setPlace(res.data.place);
      } catch {
        setPlace(null);
      } finally {
        setLoading(false);
      }

      // Favori durumu
      try {
        const favRes = await axios.get("http://localhost:5001/api/favorites/", authHeader);
        const favIds = new Set(favRes.data.favorites.map(f => f.place_id));
        setIsFav(favIds.has(numId));
      } catch { /* sessiz */ }
      // Yorumlar
      try {
        const revRes = await axios.get(`http://localhost:5001/api/reviews/${id}`, authHeader);
        setReviews(revRes.data.reviews || []);
        setAvgRating(revRes.data.average_rating);
      } catch { /* sessiz */ }
      // Koleksiyonlar
      try {
        const colRes = await axios.get("http://localhost:5001/api/collections/", authHeader);
        setCollections(colRes.data.collections || []);
      } catch { /* sessiz */ }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitReview = async () => {
    if (!reviewComment.trim()) { setReviewError("Yorum metni boş olamaz."); return; }
    setReviewLoading(true); setReviewError("");
    try {
      const res = await axios.post(`http://localhost:5001/api/reviews/${id}`,
        { rating: reviewRating, comment: reviewComment.trim() }, authHeader);
      const updated = [res.data.review, ...reviews.filter(r => r.user_id !== res.data.review.user_id)];
      setReviews(updated);
      setAvgRating(updated.length ? parseFloat((updated.reduce((s, r) => s + r.rating, 0) / updated.length).toFixed(1)) : null);
      setReviewComment("");
    } catch (e) { setReviewError(e.response?.data?.error || "Yorum eklenemedi."); }
    finally { setReviewLoading(false); }
  };

  const deleteReview = async (reviewId) => {
    try {
      await axios.delete(`http://localhost:5001/api/reviews/${id}/${reviewId}`, authHeader);
      const updated = reviews.filter(r => r.id !== reviewId);
      setReviews(updated);
      setAvgRating(updated.length ? parseFloat((updated.reduce((s, r) => s + r.rating, 0) / updated.length).toFixed(1)) : null);
    } catch { /* sessiz */ }
  };

  const toggleFav = async () => {
    setFavLoading(true);
    try {
      if (isFav) {
        await axios.delete(`http://localhost:5001/api/favorites/${id}`, authHeader);
        setIsFav(false);
      } else {
        await axios.post(`http://localhost:5001/api/favorites/${id}`, {}, authHeader);
        setIsFav(true);
      }
    } catch { /* sessiz */ }
    setFavLoading(false);
  };

  const addToCollection = async (colId, colName) => {
    try {
      await axios.post(`http://localhost:5001/api/collections/${colId}/items`,
        { place_id: numId }, authHeader);
      setColMsg(`✅ "${colName}" koleksiyonuna eklendi`);
      // place_ids'i güncelle
      setCollections(prev => prev.map(c =>
        c.id === colId ? { ...c, place_ids: [...(c.place_ids || []), numId], item_count: c.item_count + 1 } : c
      ));
    } catch (e) {
      const msg = e.response?.data?.error || "Eklenemedi";
      setColMsg(msg === "Zaten eklenmiş" ? `"${colName}" koleksiyonunda zaten var` : msg);
    } finally {
      setShowColMenu(false);
      setTimeout(() => setColMsg(""), 2500);
    }
  };

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner}>⏳</div>
      <div style={s.loadingText}>Mekan yükleniyor...</div>
    </div>
  );

  if (!place) return (
    <div style={s.center}>
      <div style={{ fontSize: "48px" }}>😕</div>
      <div style={s.loadingText}>Mekan bulunamadı.</div>
      <button style={s.backBtn} onClick={() => navigate("/places")}>← Mekanlara Dön</button>
    </div>
  );

  const hasMap = place.latitude && place.longitude;

  return (
    <div style={s.page}>
      {/* Üst bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate("/places")}>← Geri</button>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {colMsg && <span style={s.colMsgBadge}>{colMsg}</span>}
          {/* Koleksiyona Ekle dropdown */}
          <div style={{ position:"relative" }}>
            <button style={s.colBtn} onClick={() => setShowColMenu(v => !v)}>
              📚 Koleksiyon {showColMenu ? "▲" : "▼"}
            </button>
            {showColMenu && (
              <div style={s.colDropdown}>
                {collections.length === 0 ? (
                  <div style={s.colDropEmpty}>
                    <div>Koleksiyon yok</div>
                    <button style={s.colDropCreate} onClick={() => navigate("/collections")}>
                      Oluştur →
                    </button>
                  </div>
                ) : (
                  collections.map(col => {
                    const alreadyIn = col.place_ids?.includes(numId);
                    return (
                      <button key={col.id} style={{...s.colDropItem, ...(alreadyIn ? s.colDropItemDone : {})}}
                        onClick={() => !alreadyIn && addToCollection(col.id, col.name)}
                        disabled={alreadyIn}>
                        <span>{col.emoji} {col.name}</span>
                        {alreadyIn && <span style={s.colCheck}>✓</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <button
            style={{ ...s.favBtn, background: isFav ? "#fef2f2" : t.primaryLight, color: isFav ? "#e11d48" : t.primary, border: `1.5px solid ${isFav ? "#fca5a5" : t.border}` }}
            onClick={toggleFav}
            disabled={favLoading}
          >
            {isFav ? "❤️ Favoriden Çıkar" : "🤍 Favoriye Ekle"}
          </button>
        </div>
      </div>

      <div style={s.layout}>
        {/* Sol: Fotoğraf + Bilgiler */}
        <div style={s.left}>
          {/* Fotoğraf */}
          <div style={s.imgWrap}>
            {place.image_url
              ? <img src={place.image_url} alt={place.name} style={s.img} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
              : null}
            <div style={{ ...s.imgFallback, display: place.image_url ? "none" : "flex" }}>
              <span style={{ fontSize: "72px" }}>{categoryEmoji[place.category] || "📍"}</span>
            </div>
          </div>

          {/* Başlık ve meta */}
          <div style={s.infoCard}>
            <div style={s.badges}>
              <span style={s.cityBadge}>📍 {place.city}</span>
              <span style={s.catBadge}>{categoryEmoji[place.category] || "📍"} {place.category}</span>
            </div>
            <h1 style={s.name}>{place.name}</h1>
            <div style={s.ratingRow}>
              <span style={s.stars}>{stars(avgRating !== null ? avgRating : place.rating)}</span>
              <span style={s.ratingNum}>{Number(avgRating !== null ? avgRating : (place.rating || 0)).toFixed(1)}</span>
              <span style={s.ratingLabel}>/ 5.0</span>
              {avgRating !== null && (
                <span style={s.reviewCountBadge}>👥 {reviews.length} değerlendirme</span>
              )}
            </div>
            <p style={s.desc}>{place.description || "Bu mekan için henüz açıklama eklenmemiş."}</p>
          </div>

          {/* Koordinat kartı */}
          {hasMap && (
            <div style={s.coordCard}>
              <div style={s.coordTitle}>📌 Koordinatlar</div>
              <div style={s.coordRow}>
                <span style={s.coordLabel}>Enlem</span>
                <span style={s.coordVal}>{Number(place.latitude).toFixed(5)}°</span>
              </div>
              <div style={s.coordRow}>
                <span style={s.coordLabel}>Boylam</span>
                <span style={s.coordVal}>{Number(place.longitude).toFixed(5)}°</span>
              </div>
              <button
                style={s.mapBtn}
                onClick={() => navigate("/map")}
              >
                🗺️ Haritada Görüntüle
              </button>
            </div>
          )}

          {/* Yorumlar */}
          <div style={s.reviewCard}>
            <div style={s.reviewHeader}>
              <span style={s.coordTitle}>💬 Yorumlar</span>
              {avgRating && (
                <span style={s.avgBadge}>⭐ {avgRating} ort. ({reviews.length} yorum)</span>
              )}
            </div>

            {/* Yorum Formu */}
            <div style={s.reviewForm}>
              <div style={s.starPicker}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} style={s.starBtn} onClick={() => setReviewRating(n)}>
                    <span style={{ color: n <= reviewRating ? "#F59E0B" : "#CBD5E1", fontSize: "22px" }}>★</span>
                  </button>
                ))}
                <span style={s.ratingLabel}>{reviewRating}/5</span>
              </div>
              <textarea
                style={s.reviewInput}
                placeholder="Görüşlerinizi paylaşın..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                rows={3}
              />
              {reviewError && <div style={s.reviewError}>{reviewError}</div>}
              <button
                style={{...s.reviewSubmit, ...(reviewLoading ? {opacity:0.6} : {})}}
                onClick={submitReview}
                disabled={reviewLoading}
              >
                {reviewLoading ? "⏳ Gönderiliyor..." : "✍️ Yorum Gönder"}
              </button>
            </div>

            {/* Mevcut yorumlar */}
            {reviews.length === 0 ? (
              <div style={s.noReview}>Henüz yorum yok. İlk yorumu siz yapın!</div>
            ) : (
              <div style={s.reviewList}>
                {reviews.map(r => (
                  <div key={r.id} style={s.reviewItem}>
                    <div style={s.reviewTop}>
                      <div style={s.reviewUser}>👤 {r.user_name}</div>
                      <div style={s.reviewMeta}>
                        <span style={{color:"#F59E0B"}}>{"★".repeat(Math.round(r.rating))}</span>
                        <span style={s.reviewDate}>{new Date(r.created_at).toLocaleDateString("tr-TR")}</span>
                        {r.user_id === reviews[0]?.user_id && (
                          <button style={s.delReviewBtn} onClick={() => deleteReview(r.id)}>🗑️</button>
                        )}
                      </div>
                    </div>
                    {r.comment && <div style={s.reviewText}>{r.comment}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ: Mini Harita */}
        <div style={s.right}>
          {hasMap ? (
            <div style={s.mapCard}>
              <div style={s.mapTitle}>Konum</div>
              <div style={s.mapBox}>
                <MapContainer
                  center={[place.latitude, place.longitude]}
                  zoom={14}
                  style={{ width: "100%", height: "100%", borderRadius: "12px" }}
                  zoomControl={true}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <Marker position={[place.latitude, place.longitude]}>
                    <Popup>{place.name}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          ) : (
            <div style={s.noMapCard}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🗺️</div>
              <div style={{ fontSize: "14px", color: t.textMuted }}>Bu mekan için konum bilgisi mevcut değil.</div>
            </div>
          )}

          {/* Hızlı eylemler */}
          <div style={s.actionsCard}>
            <div style={s.mapTitle}>Hızlı Eylemler</div>
            <button style={s.actionBtn} onClick={() => navigate("/ai")}>
              ✨ Bu Şehre AI Rota Al
            </button>
            <button style={s.actionBtn} onClick={() => navigate("/map")}>
              🗺️ Haritada Keşfet
            </button>
            <button style={{ ...s.actionBtn, ...s.actionBtnBack }} onClick={() => navigate("/places")}>
              ← Tüm Mekanlara Dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "calc(100vh - 58px)", background: t.bg, fontFamily: "system-ui,sans-serif", padding: "1.5rem 2rem" },
  center: { minHeight: "calc(100vh - 58px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", fontFamily: "system-ui,sans-serif" },
  spinner: { fontSize: "48px" },
  loadingText: { fontSize: "16px", color: t.textMuted },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" },
  backBtn: { padding: "9px 18px", borderRadius: "10px", border: `1.5px solid ${t.border}`, background: "#fff", color: t.textMuted, fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  favBtn: { padding: "9px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  colBtn: { padding: "9px 14px", borderRadius: "10px", border: `1.5px solid ${t.border}`, background: "#fff", color: t.primary, fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  colDropdown: { position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: "200px", overflow: "hidden" },
  colDropItem: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", border: "none", background: "none", fontSize: "13px", color: t.text, cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${t.borderLight}` },
  colDropItemDone: { background: "#f0fdf4", color: t.primary },
  colCheck: { color: t.primary, fontWeight: 700 },
  colDropEmpty: { padding: "14px", fontSize: "12px", color: t.textMuted, textAlign: "center", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" },
  colDropCreate: { padding: "6px 14px", borderRadius: "8px", border: "none", background: t.gradient, color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer" },
  colMsgBadge: { fontSize: "12px", color: t.primary, background: t.primaryLight, padding: "6px 12px", borderRadius: "8px", fontWeight: 500 },
  layout: { display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem", alignItems: "start" },
  left: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  right: { display: "flex", flexDirection: "column", gap: "1.25rem" },

  imgWrap: { borderRadius: "20px", overflow: "hidden", height: "320px", background: t.primaryLight, position: "relative" },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  imgFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: t.gradient },

  infoCard: { background: "#fff", borderRadius: "16px", padding: "1.75rem", border: `1px solid ${t.border}` },
  badges: { display: "flex", gap: "8px", marginBottom: "12px" },
  cityBadge: { fontSize: "12px", padding: "4px 10px", borderRadius: "8px", background: t.primaryLight, color: t.primary, fontWeight: 600 },
  catBadge: { fontSize: "12px", padding: "4px 10px", borderRadius: "8px", background: "#f1f5f9", color: t.textMuted, fontWeight: 500 },
  name: { fontSize: "28px", fontWeight: 800, color: t.text, margin: "0 0 12px", letterSpacing: "-0.5px" },
  ratingRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  stars: { fontSize: "18px", color: "#F59E0B", letterSpacing: "2px" },
  ratingNum: { fontSize: "22px", fontWeight: 800, color: t.text },
  ratingLabel: { fontSize: "14px", color: t.textMuted },
  reviewCountBadge: { fontSize: "11px", padding: "3px 10px", borderRadius: "8px", background: t.primaryLight, color: t.primary, fontWeight: 600 },
  desc: { fontSize: "15px", color: t.textMuted, lineHeight: 1.7, margin: 0 },

  coordCard: { background: "#fff", borderRadius: "16px", padding: "1.5rem", border: `1px solid ${t.border}` },
  coordTitle: { fontSize: "13px", fontWeight: 700, color: t.textMuted, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" },
  coordRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.borderLight}` },
  coordLabel: { fontSize: "13px", color: t.textMuted },
  coordVal: { fontSize: "13px", fontWeight: 600, color: t.text, fontFamily: "monospace" },
  mapBtn: { marginTop: "14px", width: "100%", padding: "10px", borderRadius: "10px", border: "none", background: t.gradient, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },

  mapCard: { background: "#fff", borderRadius: "16px", padding: "1.25rem", border: `1px solid ${t.border}` },
  mapTitle: { fontSize: "13px", fontWeight: 700, color: t.textMuted, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" },
  mapBox: { height: "260px", borderRadius: "12px", overflow: "hidden" },
  noMapCard: { background: "#fff", borderRadius: "16px", padding: "2rem", border: `1px solid ${t.border}`, textAlign: "center" },

  actionsCard: { background: "#fff", borderRadius: "16px", padding: "1.25rem", border: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: "8px" },
  actionBtn: { padding: "11px", borderRadius: "10px", border: "none", background: t.gradient, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "center" },
  actionBtnBack: { background: "transparent", color: t.textMuted, border: `1.5px solid ${t.border}` },

  reviewCard: { background: "#fff", borderRadius: "16px", padding: "1.5rem", border: `1px solid ${t.border}` },
  reviewHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" },
  avgBadge: { fontSize: "12px", fontWeight: 600, color: t.primary, background: t.primaryLight, padding: "4px 10px", borderRadius: "8px" },
  reviewForm: { background: t.bg, borderRadius: "12px", padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "10px" },
  starPicker: { display: "flex", alignItems: "center", gap: "2px" },
  starBtn: { background: "none", border: "none", cursor: "pointer", padding: "2px", lineHeight: 1 },
  reviewInput: { padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${t.border}`, fontSize: "13px", color: t.text, outline: "none", resize: "vertical", fontFamily: "system-ui", background: "#fff" },
  reviewError: { fontSize: "12px", color: "#EF4444", background: "#FEF2F2", padding: "6px 10px", borderRadius: "8px" },
  reviewSubmit: { padding: "10px", borderRadius: "10px", border: "none", background: t.gradient, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  noReview: { fontSize: "13px", color: t.textMuted, textAlign: "center", padding: "1.5rem 0", fontStyle: "italic" },
  reviewList: { display: "flex", flexDirection: "column", gap: "10px" },
  reviewItem: { padding: "12px 14px", borderRadius: "12px", border: `1px solid ${t.borderLight}`, background: "#FAFAFA" },
  reviewTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" },
  reviewUser: { fontSize: "13px", fontWeight: 700, color: t.text },
  reviewMeta: { display: "flex", alignItems: "center", gap: "8px" },
  reviewDate: { fontSize: "11px", color: t.textMuted },
  delReviewBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#EF4444", padding: "0 4px" },
  reviewText: { fontSize: "13px", color: t.textMuted, lineHeight: 1.6 },
};
