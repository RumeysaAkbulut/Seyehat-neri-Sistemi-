import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

const API = "http://localhost:5001";

const EMOJIS = ["📌","❤️","⭐","🏖️","🏛️","🍽️","🌿","🛍️","🎭","🏔️","🌆","🎉"];

const SAMPLE_PLACES = [
  { id:1, name:"Topkapı Sarayı", city:"İstanbul", category:"tarihi", description:"Osmanlı İmparatorluğu'nun görkemli sarayı.", rating:4.8, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Topkapi_palace_harem_pool.jpg/640px-Topkapi_palace_harem_pool.jpg" },
  { id:2, name:"Ayasofya", city:"İstanbul", category:"tarihi", description:"Bizans ve Osmanlı mimarisinin şaheseri.", rating:4.9, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Hagia_Sophia_Mars_2013.jpg/640px-Hagia_Sophia_Mars_2013.jpg" },
  { id:3, name:"Galata Kulesi", city:"İstanbul", category:"tarihi", description:"İstanbul'un simgelerinden ortaçağ kulesi.", rating:4.6, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Galata_tower.jpg/640px-Galata_tower.jpg" },
  { id:4, name:"Kapalıçarşı", city:"İstanbul", category:"alışveriş", description:"Dünyanın en büyük ve en eski kapalı çarşısı.", rating:4.5, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Grand_Bazaar%2C_Istanbul%2C_2013.jpg/640px-Grand_Bazaar%2C_Istanbul%2C_2013.jpg" },
  { id:5, name:"Anıtkabir", city:"Ankara", category:"tarihi", description:"Atatürk'ün anıt mezarı ve müzesi.", rating:4.9, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/An%C4%B1tkabir_aerial.jpg/640px-An%C4%B1tkabir_aerial.jpg" },
  { id:6, name:"Ephesus", city:"İzmir", category:"tarihi", description:"Antik dünyanın en önemli Yunan şehirlerinden biri.", rating:4.9, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Ephesus_Celsus_Library_Fa%C3%A7ade.jpg/640px-Ephesus_Celsus_Library_Fa%C3%A7ade.jpg" },
  { id:7, name:"Pamukkale", city:"Denizli", category:"doğa", description:"Beyaz kireçtaşı terasları ve termal havuzları.", rating:4.8, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Pamukkale_2.jpg/640px-Pamukkale_2.jpg" },
  { id:8, name:"Kapadokya", city:"Nevşehir", category:"doğa", description:"Peri bacaları ve balonlu turizmiyle ünlü.", rating:4.9, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Goreme_Cappadocia.jpg/640px-Goreme_Cappadocia.jpg" },
  { id:9, name:"Safranbolu", city:"Karabük", category:"tarihi", description:"UNESCO Dünya Mirası Osmanlı evleri.", rating:4.7, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Safranbolu_0292.jpg/640px-Safranbolu_0292.jpg" },
  { id:10, name:"Alaçatı", city:"İzmir", category:"eğlence", description:"Taş evleri ve rüzgar sörfüyle ünlü tatil beldesi.", rating:4.7, image_url:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Alacati_018.jpg/640px-Alacati_018.jpg" },
];

const catEmoji = { müze:"🏛️", park:"🌳", restoran:"🍽️", tarihi:"🏰", alışveriş:"🛍️", eğlence:"🎡", doğa:"🏔️" };
const stars = (r) => "★".repeat(Math.round(r||0)) + "☆".repeat(5-Math.round(r||0));

export default function Collections() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [collections, setCollections] = useState([]);
  const [placeMap, setPlaceMap] = useState({});   // id → place object
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Yeni koleksiyon formu
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmoji, setFormEmoji] = useState("📌");
  const [formDesc, setFormDesc] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Düzenleme
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("📌");
  const [editDesc, setEditDesc] = useState("");

  // Silme onayı
  const [deleteId, setDeleteId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const init = async () => {
      // Tüm mekanları yükle (sample + backend)
      const map = {};
      SAMPLE_PLACES.forEach(p => { map[p.id] = p; });
      try {
        const res = await axios.get(`${API}/api/places/`, authHeader);
        (res.data.places || []).forEach(p => { map[p.id] = p; });
      } catch { /* sessiz */ }
      setPlaceMap(map);

      // Koleksiyonları yükle
      try {
        const res = await axios.get(`${API}/api/collections/`, authHeader);
        setCollections(res.data.collections || []);
      } catch { setError("Koleksiyonlar yüklenemedi."); }
      setLoading(false);
    };
    init();
  }, []); // eslint-disable-line

  const createCollection = async () => {
    if (!formName.trim()) { setFormError("Ad zorunludur."); return; }
    setFormLoading(true); setFormError("");
    try {
      const res = await axios.post(`${API}/api/collections/`,
        { name: formName.trim(), emoji: formEmoji, description: formDesc.trim() }, authHeader);
      setCollections(prev => [res.data.collection, ...prev]);
      setShowForm(false); setFormName(""); setFormEmoji("📌"); setFormDesc("");
    } catch (e) { setFormError(e.response?.data?.error || "Oluşturulamadı."); }
    finally { setFormLoading(false); }
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      const res = await axios.put(`${API}/api/collections/${id}`,
        { name: editName.trim(), emoji: editEmoji, description: editDesc.trim() }, authHeader);
      setCollections(prev => prev.map(c => c.id === id ? res.data.collection : c));
      setEditId(null);
    } catch { setError("Güncellenemedi."); }
  };

  const deleteCollection = async (id) => {
    try {
      await axios.delete(`${API}/api/collections/${id}`, authHeader);
      setCollections(prev => prev.filter(c => c.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch { setError("Silinemedi."); }
    finally { setDeleteId(null); }
  };

  const removePlaceFromCollection = async (colId, placeId) => {
    try {
      const res = await axios.delete(`${API}/api/collections/${colId}/items/${placeId}`, authHeader);
      setCollections(prev => prev.map(c => c.id === colId ? res.data.collection : c));
    } catch { setError("Mekan çıkarılamadı."); }
  };

  if (loading) return (
    <div style={s.center}><div style={{fontSize:"48px"}}>⏳</div><div style={s.muted}>Yükleniyor...</div></div>
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>📚 Koleksiyonlarım</h1>
          <p style={s.sub}>Favori mekanlarını adlandırılmış listelerde organize et.</p>
        </div>
        <button style={s.newBtn} onClick={() => { setShowForm(v => !v); setFormError(""); }}>
          {showForm ? "✕ İptal" : "+ Yeni Koleksiyon"}
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Yeni koleksiyon formu */}
      {showForm && (
        <div style={s.formCard}>
          <div style={s.formTitle}>Yeni Koleksiyon</div>
          <div style={s.emojiRow}>
            {EMOJIS.map(e => (
              <button key={e} style={{...s.emojiBtn, ...(formEmoji===e ? s.emojiBtnActive : {})}}
                onClick={() => setFormEmoji(e)}>{e}</button>
            ))}
          </div>
          <input style={s.input} placeholder="Koleksiyon adı *" value={formName}
            onChange={e => setFormName(e.target.value)} maxLength={100} />
          <input style={s.input} placeholder="Açıklama (isteğe bağlı)" value={formDesc}
            onChange={e => setFormDesc(e.target.value)} maxLength={300} />
          {formError && <div style={s.formErr}>{formError}</div>}
          <button style={{...s.saveBtn, ...(formLoading ? {opacity:0.6} : {})}}
            onClick={createCollection} disabled={formLoading}>
            {formLoading ? "Oluşturuluyor..." : "✓ Oluştur"}
          </button>
        </div>
      )}

      {/* Koleksiyonlar */}
      {collections.length === 0 ? (
        <div style={s.empty}>
          <div style={{fontSize:"64px", marginBottom:"16px"}}>📚</div>
          <div style={s.emptyTitle}>Henüz koleksiyon yok</div>
          <p style={s.emptySub}>Mekan detay sayfasında "📚 Koleksiyon" butonuyla mekanları ekleyebilirsin.</p>
          <button style={s.newBtn} onClick={() => navigate("/places")}>📍 Mekanlara Git</button>
        </div>
      ) : (
        <div style={s.colList}>
          {collections.map(col => (
            <div key={col.id} style={s.colBlock}>
              {/* Koleksiyon başlığı */}
              {editId === col.id ? (
                /* Düzenleme modu */
                <div style={s.editBlock}>
                  <div style={s.emojiRow}>
                    {EMOJIS.map(e => (
                      <button key={e} style={{...s.emojiBtn, ...(editEmoji===e ? s.emojiBtnActive : {})}}
                        onClick={() => setEditEmoji(e)}>{e}</button>
                    ))}
                  </div>
                  <input style={s.input} value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} />
                  <input style={s.input} placeholder="Açıklama" value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={300} />
                  <div style={{display:"flex", gap:"8px", marginTop:"4px"}}>
                    <button style={s.saveBtn} onClick={() => saveEdit(col.id)}>✓ Kaydet</button>
                    <button style={s.cancelBtn} onClick={() => setEditId(null)}>İptal</button>
                  </div>
                </div>
              ) : (
                <div style={s.colHeader}>
                  <div style={s.colHeaderLeft} onClick={() => setExpandedId(expandedId===col.id ? null : col.id)}>
                    <span style={s.colEmoji}>{col.emoji}</span>
                    <div>
                      <div style={s.colName}>{col.name}</div>
                      {col.description && <div style={s.colDesc}>{col.description}</div>}
                    </div>
                    <span style={s.countBadge}>📍 {col.item_count} mekan</span>
                    <span style={s.chevron}>{expandedId === col.id ? "▲" : "▼"}</span>
                  </div>
                  <div style={s.colHeaderRight}>
                    <button style={s.iconBtn} title="Düzenle" onClick={() => {
                      setEditId(col.id); setEditName(col.name); setEditEmoji(col.emoji); setEditDesc(col.description||"");
                    }}>✏️</button>
                    {deleteId === col.id ? (
                      <>
                        <button style={s.confirmYes} onClick={() => deleteCollection(col.id)}>Sil</button>
                        <button style={s.cancelBtn} onClick={() => setDeleteId(null)}>İptal</button>
                      </>
                    ) : (
                      <button style={s.iconBtn} title="Sil" onClick={() => setDeleteId(col.id)}>🗑️</button>
                    )}
                  </div>
                </div>
              )}

              {/* Mekan kartları */}
              {expandedId === col.id && (
                <div style={s.cardsSection}>
                  {col.place_ids.length === 0 ? (
                    <div style={s.noPlaces}>
                      <span>Bu koleksiyona henüz mekan eklenmemiş.</span>
                      <button style={s.goPlacesBtn} onClick={() => navigate("/places")}>Mekan Ekle →</button>
                    </div>
                  ) : (
                    <div style={s.cardGrid}>
                      {col.place_ids.map(pid => {
                        const place = placeMap[pid];
                        if (!place) return (
                          <div key={pid} style={s.card}>
                            <div style={{...s.cardImg, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center"}}>
                              <span style={{fontSize:"36px"}}>📍</span>
                            </div>
                            <div style={s.cardBody}>
                              <div style={s.cardName}>Mekan #{pid}</div>
                              <button style={s.removeCardBtn} onClick={() => removePlaceFromCollection(col.id, pid)}>✕ Koleksiyondan Çıkar</button>
                            </div>
                          </div>
                        );
                        return (
                          <div key={pid} style={s.card}>
                            <div style={s.cardImg} onClick={() => navigate(`/places/${pid}`)}>
                              {place.image_url
                                ? <img src={place.image_url} alt={place.name} style={s.img}
                                    onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
                                : null}
                              <div style={{...s.imgFallback, display: place.image_url ? "none" : "flex"}}>
                                <span style={{fontSize:"40px"}}>{catEmoji[place.category] || "📍"}</span>
                              </div>
                              <button style={s.removeOverlayBtn}
                                onClick={e => { e.stopPropagation(); removePlaceFromCollection(col.id, pid); }}
                                title="Koleksiyondan çıkar">✕</button>
                            </div>
                            <div style={s.cardBody} onClick={() => navigate(`/places/${pid}`)}>
                              <div style={s.cardName}>{place.name}</div>
                              <div style={s.cardMeta}>
                                <span style={s.cityTag}>📍 {place.city}</span>
                                <span style={s.catTag}>{catEmoji[place.category]} {place.category}</span>
                              </div>
                              <div style={s.cardDesc}>{place.description || "—"}</div>
                              <div style={s.cardFooter}>
                                <div style={s.rating}>
                                  <span style={s.stars}>{stars(place.rating)}</span>
                                  <span style={s.ratingNum}>{Number(place.rating||0).toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight:"calc(100vh - 58px)", background:t.bg, fontFamily:"system-ui,sans-serif", padding:"2rem" },
  center: { minHeight:"calc(100vh - 58px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"12px", fontFamily:"system-ui,sans-serif" },
  muted: { fontSize:"15px", color:t.textMuted },

  header: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.75rem", flexWrap:"wrap", gap:"12px" },
  title: { fontSize:"24px", fontWeight:800, color:t.text, margin:"0 0 4px" },
  sub: { fontSize:"13px", color:t.textMuted, margin:0 },
  newBtn: { padding:"11px 20px", borderRadius:"12px", border:"none", background:t.gradient, color:"#fff", fontSize:"13px", fontWeight:700, cursor:"pointer" },
  errorBox: { padding:"12px 16px", borderRadius:"10px", background:"#fef2f2", border:"1px solid #fca5a5", color:"#dc2626", fontSize:"13px", marginBottom:"1rem" },

  formCard: { background:"#fff", borderRadius:"16px", border:`1px solid ${t.border}`, padding:"1.5rem", marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"10px", maxWidth:"500px" },
  formTitle: { fontSize:"15px", fontWeight:700, color:t.text },
  emojiRow: { display:"flex", flexWrap:"wrap", gap:"6px" },
  emojiBtn: { width:"36px", height:"36px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.bg, fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  emojiBtnActive: { border:`2px solid ${t.primary}`, background:t.primaryLight },
  input: { padding:"10px 14px", borderRadius:"10px", border:`1px solid ${t.border}`, fontSize:"13px", color:t.text, background:t.bg, outline:"none" },
  formErr: { fontSize:"12px", color:"#dc2626", background:"#fef2f2", padding:"6px 10px", borderRadius:"8px" },
  saveBtn: { padding:"10px 20px", borderRadius:"10px", border:"none", background:t.gradient, color:"#fff", fontSize:"13px", fontWeight:600, cursor:"pointer" },
  cancelBtn: { padding:"8px 14px", borderRadius:"10px", border:`1px solid ${t.border}`, background:"#fff", color:t.textMuted, fontSize:"12px", cursor:"pointer" },

  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"4rem 2rem", textAlign:"center" },
  emptyTitle: { fontSize:"20px", fontWeight:700, color:t.text, marginBottom:"8px" },
  emptySub: { fontSize:"14px", color:t.textMuted, lineHeight:1.6, maxWidth:"400px", marginBottom:"24px" },

  colList: { display:"flex", flexDirection:"column", gap:"1.25rem" },
  colBlock: { background:"#fff", borderRadius:"16px", border:`1px solid ${t.border}`, overflow:"hidden", boxShadow:"0 1px 6px rgba(15,110,86,0.06)" },

  colHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1rem 1.25rem", cursor:"pointer" },
  colHeaderLeft: { display:"flex", alignItems:"center", gap:"12px", flex:1, minWidth:0 },
  colEmoji: { fontSize:"26px", flexShrink:0 },
  colName: { fontSize:"16px", fontWeight:700, color:t.text },
  colDesc: { fontSize:"12px", color:t.textMuted, marginTop:"2px" },
  countBadge: { fontSize:"11px", padding:"3px 10px", borderRadius:"8px", background:t.primaryLight, color:t.primary, fontWeight:600, flexShrink:0 },
  chevron: { fontSize:"11px", color:t.textMuted, flexShrink:0 },
  colHeaderRight: { display:"flex", gap:"6px", flexShrink:0, marginLeft:"12px" },
  iconBtn: { background:"none", border:`1px solid ${t.border}`, borderRadius:"8px", width:"30px", height:"30px", cursor:"pointer", fontSize:"13px", display:"flex", alignItems:"center", justifyContent:"center" },
  confirmYes: { padding:"5px 12px", borderRadius:"8px", border:"none", background:"#dc2626", color:"#fff", fontSize:"11px", fontWeight:700, cursor:"pointer" },

  editBlock: { padding:"1.25rem", display:"flex", flexDirection:"column", gap:"8px" },

  cardsSection: { borderTop:`1px solid ${t.borderLight}`, padding:"1.25rem" },
  noPlaces: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1rem", background:t.bg, borderRadius:"10px", fontSize:"13px", color:t.textMuted },
  goPlacesBtn: { padding:"7px 14px", borderRadius:"8px", border:"none", background:t.gradient, color:"#fff", fontSize:"12px", fontWeight:600, cursor:"pointer", flexShrink:0 },

  cardGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:"1rem" },
  card: { background:"#fff", borderRadius:"14px", border:`1px solid ${t.border}`, overflow:"hidden", boxShadow:t.shadow, cursor:"pointer" },
  cardImg: { position:"relative", height:"140px", overflow:"hidden", background:"#f1f5f9" },
  img: { width:"100%", height:"100%", objectFit:"cover" },
  imgFallback: { width:"100%", height:"100%", alignItems:"center", justifyContent:"center", background:t.gradient },
  removeOverlayBtn: { position:"absolute", top:"8px", right:"8px", background:"rgba(0,0,0,0.5)", border:"none", color:"#fff", borderRadius:"50%", width:"26px", height:"26px", fontSize:"12px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 },
  cardBody: { padding:"0.85rem 1rem 1rem" },
  cardName: { fontSize:"14px", fontWeight:700, color:t.text, marginBottom:"5px" },
  cardMeta: { display:"flex", gap:"5px", marginBottom:"6px", flexWrap:"wrap" },
  cityTag: { fontSize:"10px", padding:"2px 7px", borderRadius:"6px", background:t.primaryLight, color:t.primary, fontWeight:600 },
  catTag: { fontSize:"10px", padding:"2px 7px", borderRadius:"6px", background:"#f1f5f9", color:t.textMuted, fontWeight:500 },
  cardDesc: { fontSize:"11px", color:t.textMuted, lineHeight:1.5, marginBottom:"8px", minHeight:"28px", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" },
  cardFooter: { display:"flex", alignItems:"center", justifyContent:"space-between" },
  rating: { display:"flex", alignItems:"center", gap:"4px" },
  stars: { fontSize:"11px", color:"#F59E0B" },
  ratingNum: { fontSize:"11px", fontWeight:700, color:t.text },
  removeCardBtn: { marginTop:"8px", padding:"5px 10px", borderRadius:"7px", border:"1px solid #fca5a5", background:"#fff", color:"#dc2626", fontSize:"11px", cursor:"pointer", fontWeight:600, width:"100%" },
};
