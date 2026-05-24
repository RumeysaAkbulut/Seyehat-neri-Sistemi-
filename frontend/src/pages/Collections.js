import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:5001";

const EMOJIS = ["📌","❤️","⭐","🏖️","🏛️","🍽️","🌿","🛍️","🎭","🏔️","🌆","🎉"];

const SAMPLE_PLACES = {
  1:"Topkapı Sarayı",2:"Ayasofya",3:"Galata Kulesi",4:"Kapalıçarşı",
  5:"Anıtkabir",6:"Ephesus",7:"Pamukkale",8:"Kapadokya",9:"Safranbolu",10:"Alaçatı",
};

export default function Collections() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [collections, setCollections] = useState([]);
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

  // Açık koleksiyon
  const [expandedId, setExpandedId] = useState(null);
  const [placeNames, setPlaceNames] = useState({});

  useEffect(() => { fetchCollections(); }, []); // eslint-disable-line

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/collections/`, authHeader);
      setCollections(res.data.collections || []);
    } catch { setError("Koleksiyonlar yüklenemedi."); }
    finally { setLoading(false); }
  };

  const fetchPlaceName = async (placeId) => {
    if (placeNames[placeId]) return;
    // Önce sample data
    if (SAMPLE_PLACES[placeId]) {
      setPlaceNames(prev => ({ ...prev, [placeId]: SAMPLE_PLACES[placeId] }));
      return;
    }
    try {
      const res = await axios.get(`${API}/api/places/${placeId}`, authHeader);
      setPlaceNames(prev => ({ ...prev, [placeId]: res.data.place?.name || `Mekan #${placeId}` }));
    } catch {
      setPlaceNames(prev => ({ ...prev, [placeId]: `Mekan #${placeId}` }));
    }
  };

  const handleExpand = (col) => {
    const newId = expandedId === col.id ? null : col.id;
    setExpandedId(newId);
    if (newId) col.place_ids.forEach(id => fetchPlaceName(id));
  };

  const createCollection = async () => {
    if (!formName.trim()) { setFormError("Ad zorunludur."); return; }
    setFormLoading(true); setFormError("");
    try {
      const res = await axios.post(`${API}/api/collections/`, {
        name: formName.trim(), emoji: formEmoji, description: formDesc.trim()
      }, authHeader);
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
    <div style={s.center}>
      <div style={{ fontSize: "48px" }}>⏳</div>
      <div style={s.muted}>Yükleniyor...</div>
    </div>
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
              <button key={e} style={{...s.emojiBtn, ...(formEmoji === e ? s.emojiBtnActive : {})}}
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

      {/* Koleksiyonlar listesi */}
      {collections.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>📚</div>
          <div style={s.emptyTitle}>Henüz koleksiyon yok</div>
          <p style={s.emptySub}>
            Mekan detay sayfasında "Koleksiyona Ekle" butonuyla mekanları buraya ekleyebilirsin.
          </p>
          <button style={s.newBtn} onClick={() => navigate("/places")}>
            📍 Mekanlara Git
          </button>
        </div>
      ) : (
        <div style={s.grid}>
          {collections.map(col => (
            <div key={col.id} style={s.card}>
              {/* Düzenleme modu */}
              {editId === col.id ? (
                <div style={s.editBlock}>
                  <div style={s.emojiRow}>
                    {EMOJIS.map(e => (
                      <button key={e} style={{...s.emojiBtn, ...(editEmoji === e ? s.emojiBtnActive : {})}}
                        onClick={() => setEditEmoji(e)}>{e}</button>
                    ))}
                  </div>
                  <input style={s.input} value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} />
                  <input style={s.input} placeholder="Açıklama" value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={300} />
                  <div style={s.editBtns}>
                    <button style={s.saveBtn} onClick={() => saveEdit(col.id)}>✓ Kaydet</button>
                    <button style={s.cancelBtn} onClick={() => setEditId(null)}>İptal</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Kart başlığı */}
                  <div style={s.cardHeader}>
                    <div style={s.cardLeft}>
                      <span style={s.colEmoji}>{col.emoji}</span>
                      <div>
                        <div style={s.colName}>{col.name}</div>
                        {col.description && <div style={s.colDesc}>{col.description}</div>}
                        <span style={s.countBadge}>📍 {col.item_count} mekan</span>
                      </div>
                    </div>
                    <div style={s.cardActions}>
                      <button style={s.iconBtn} title="Düzenle" onClick={() => {
                        setEditId(col.id); setEditName(col.name); setEditEmoji(col.emoji); setEditDesc(col.description || "");
                      }}>✏️</button>
                      <button style={s.expandBtn}
                        onClick={() => handleExpand(col)}>
                        {expandedId === col.id ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Mekanlar (genişletilmiş) */}
                  {expandedId === col.id && (
                    <div style={s.placeList}>
                      {col.place_ids.length === 0 ? (
                        <div style={s.noPlaces}>
                          Bu koleksiyona henüz mekan eklenmemiş.
                          <button style={s.goPlacesBtn} onClick={() => navigate("/places")}>
                            Mekan Ekle →
                          </button>
                        </div>
                      ) : (
                        col.place_ids.map(pid => (
                          <div key={pid} style={s.placeItem}>
                            <span style={s.placeName}>
                              📍 {placeNames[pid] || `Mekan #${pid}`}
                            </span>
                            <div style={s.placeItemBtns}>
                              <button style={s.viewBtn} onClick={() => navigate(`/places/${pid}`)}>
                                Görüntüle
                              </button>
                              <button style={s.removeBtn}
                                onClick={() => removePlaceFromCollection(col.id, pid)}>
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Silme onayı */}
                  <div style={s.cardFooter}>
                    {deleteId === col.id ? (
                      <div style={s.confirmRow}>
                        <span style={s.confirmText}>Silinsin mi?</span>
                        <button style={s.confirmYes} onClick={() => deleteCollection(col.id)}>Sil</button>
                        <button style={s.confirmNo} onClick={() => setDeleteId(null)}>İptal</button>
                      </div>
                    ) : (
                      <button style={s.delBtn} onClick={() => setDeleteId(col.id)}>🗑️ Koleksiyonu Sil</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight:"calc(100vh - 58px)", background:"#f2f8f5", fontFamily:"system-ui,sans-serif", padding:"2rem" },
  center: { minHeight:"calc(100vh - 58px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"12px", fontFamily:"system-ui,sans-serif" },
  muted: { fontSize:"15px", color:"#4a7a62" },

  header: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.75rem", flexWrap:"wrap", gap:"12px" },
  title: { fontSize:"24px", fontWeight:800, color:"#1a2e25", margin:"0 0 4px" },
  sub: { fontSize:"13px", color:"#4a7a62", margin:0 },
  newBtn: { padding:"11px 20px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#0f6e56,#1d9e75)", color:"#fff", fontSize:"13px", fontWeight:700, cursor:"pointer" },

  errorBox: { padding:"12px 16px", borderRadius:"10px", background:"#fef2f2", border:"1px solid #fca5a5", color:"#dc2626", fontSize:"13px", marginBottom:"1rem" },

  formCard: { background:"#fff", borderRadius:"16px", border:"1px solid #e1f0e8", padding:"1.5rem", marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"10px", maxWidth:"500px" },
  formTitle: { fontSize:"15px", fontWeight:700, color:"#1a2e25" },
  emojiRow: { display:"flex", flexWrap:"wrap", gap:"6px" },
  emojiBtn: { width:"36px", height:"36px", borderRadius:"8px", border:"1px solid #e1f0e8", background:"#f5faf7", fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  emojiBtnActive: { border:"2px solid #0f6e56", background:"#e6f7f0" },
  input: { padding:"10px 14px", borderRadius:"10px", border:"1px solid #a8d4bc", fontSize:"13px", color:"#1a2e25", background:"#f5faf7", outline:"none" },
  formErr: { fontSize:"12px", color:"#dc2626", background:"#fef2f2", padding:"6px 10px", borderRadius:"8px" },
  saveBtn: { padding:"10px 20px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg,#0f6e56,#1d9e75)", color:"#fff", fontSize:"13px", fontWeight:600, cursor:"pointer" },
  cancelBtn: { padding:"10px 16px", borderRadius:"10px", border:"1px solid #d1d5db", background:"#fff", color:"#64748b", fontSize:"13px", cursor:"pointer" },

  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"4rem 2rem", textAlign:"center" },
  emptyTitle: { fontSize:"20px", fontWeight:700, color:"#1a2e25", marginBottom:"8px" },
  emptySub: { fontSize:"14px", color:"#4a7a62", lineHeight:1.6, maxWidth:"400px", marginBottom:"24px" },

  grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap:"1.25rem" },

  card: { background:"#fff", borderRadius:"16px", border:"1px solid #e1f0e8", padding:"1.25rem", display:"flex", flexDirection:"column", gap:"10px", boxShadow:"0 1px 6px rgba(15,110,86,0.06)" },
  cardHeader: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"10px" },
  cardLeft: { display:"flex", alignItems:"flex-start", gap:"10px", flex:1, minWidth:0 },
  colEmoji: { fontSize:"28px", flexShrink:0, lineHeight:1 },
  colName: { fontSize:"16px", fontWeight:700, color:"#1a2e25", marginBottom:"3px" },
  colDesc: { fontSize:"12px", color:"#4a7a62", marginBottom:"6px", lineHeight:1.4 },
  countBadge: { fontSize:"11px", padding:"3px 9px", borderRadius:"8px", background:"#e6f7f0", color:"#0f6e56", fontWeight:600 },
  cardActions: { display:"flex", gap:"4px", flexShrink:0 },
  iconBtn: { background:"none", border:"1px solid #e1f0e8", borderRadius:"8px", width:"30px", height:"30px", cursor:"pointer", fontSize:"13px", display:"flex", alignItems:"center", justifyContent:"center" },
  expandBtn: { background:"none", border:"1px solid #e1f0e8", borderRadius:"8px", width:"30px", height:"30px", cursor:"pointer", fontSize:"11px", color:"#4a7a62", display:"flex", alignItems:"center", justifyContent:"center" },

  placeList: { display:"flex", flexDirection:"column", gap:"6px", background:"#f5faf7", borderRadius:"10px", padding:"10px 12px" },
  noPlaces: { fontSize:"12px", color:"#7a9e8e", fontStyle:"italic", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px" },
  goPlacesBtn: { fontSize:"11px", padding:"4px 10px", borderRadius:"8px", border:"none", background:"#0f6e56", color:"#fff", cursor:"pointer", fontWeight:600, flexShrink:0 },
  placeItem: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px" },
  placeName: { fontSize:"13px", color:"#1a2e25", fontWeight:500, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  placeItemBtns: { display:"flex", gap:"4px", flexShrink:0 },
  viewBtn: { padding:"4px 10px", borderRadius:"7px", border:"none", background:"#0f6e56", color:"#fff", fontSize:"11px", fontWeight:600, cursor:"pointer" },
  removeBtn: { padding:"4px 8px", borderRadius:"7px", border:"1px solid #fca5a5", background:"#fff", color:"#dc2626", fontSize:"11px", cursor:"pointer", fontWeight:700 },

  cardFooter: { borderTop:"1px solid #f0f4f3", paddingTop:"10px", marginTop:"4px" },
  delBtn: { background:"none", border:"none", color:"#dc2626", fontSize:"12px", cursor:"pointer", fontWeight:600, padding:"0" },
  confirmRow: { display:"flex", alignItems:"center", gap:"8px" },
  confirmText: { fontSize:"12px", color:"#dc2626", fontWeight:600 },
  confirmYes: { padding:"5px 12px", borderRadius:"8px", border:"none", background:"#dc2626", color:"#fff", fontSize:"11px", fontWeight:700, cursor:"pointer" },
  confirmNo: { padding:"5px 10px", borderRadius:"8px", border:"1px solid #d1d5db", background:"#fff", color:"#64748b", fontSize:"11px", cursor:"pointer" },

  editBlock: { display:"flex", flexDirection:"column", gap:"8px" },
  editBtns: { display:"flex", gap:"8px" },
};
