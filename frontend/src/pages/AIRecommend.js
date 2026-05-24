import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const HISTORY_KEY = "ai_recommendation_history";

const CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Kapadokya", "Pamukkale", "Bursa", "Trabzon", "Bodrum", "Mardin"];
const DURATIONS = ["1 gün", "2 gün", "3 gün", "1 hafta"];
const BUDGETS = ["düşük", "orta", "yüksek"];
const INTERESTS = ["Tarih & Kültür", "Doğa & Macera", "Yeme & İçme", "Alışveriş", "Sanat & Müze", "Gece Hayatı"];

export default function AIRecommend() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [duration, setDuration] = useState("2 gün");
  const [budget, setBudget] = useState("orta");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [currentMeta, setCurrentMeta] = useState(null); // {city, duration, budget, interests}
  const [aiPlaces, setAiPlaces] = useState([]);       // [{name}] AI'dan gelen mekan listesi
  const [mapLoading, setMapLoading] = useState(false); // Geocoding yükleniyor
  const [mapMsg, setMapMsg] = useState("");            // "8/10 mekan bulundu" gibi

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      setHistory(stored);
    } catch { setHistory([]); }
  }, []);

  const toggleInterest = (i) => {
    setSelectedInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleSubmit = async () => {
    const finalCity = customCity.trim() || city;
    if (!finalCity) { setError("Lütfen bir şehir seçin veya girin."); return; }
    setError("");
    setResult("");
    setSavedMsg("");
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5001/api/ai/recommend",
        { city: finalCity, interests: selectedInterests.join(", "), duration, budget },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data.recommendation);
      setAiPlaces(res.data.places || []);
      setMapMsg("");
      setCurrentMeta({ city: finalCity, duration, budget, interests: selectedInterests });
    } catch (e) {
      const isQuota = e.response?.status === 429 || e.response?.data?.quota_exceeded;
      setError(
        isQuota
          ? "⚠️ Günlük AI kotası doldu. Birkaç dakika bekleyip tekrar dene veya yarın tekrar gel."
          : (e.response?.data?.error || "AI servisi şu an kullanılamıyor.")
      );
    } finally {
      setLoading(false);
    }
  };

  const showOnMap = async () => {
    if (!aiPlaces.length) return;
    setMapLoading(true);
    setMapMsg("");
    const finalCity = customCity.trim() || city;
    const waypoints = [];

    for (const place of aiPlaces) {
      try {
        const query = `${place.name}, ${finalCity}`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          { headers: { "Accept-Language": "tr" } }
        );
        const data = await res.json();
        if (data[0]) {
          waypoints.push({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            name: place.name,
          });
        }
        // Nominatim rate limit — istekler arası 300ms bekle
        await new Promise(r => setTimeout(r, 300));
      } catch { /* bu mekanı atla */ }
    }

    setMapLoading(false);

    if (waypoints.length === 0) {
      setMapMsg("❌ Mekanlar haritada bulunamadı.");
      return;
    }

    setMapMsg(`✅ ${waypoints.length}/${aiPlaces.length} mekan bulundu, haritaya aktarılıyor...`);

    // MapPage'in "load_route" mekanizmasıyla uyumlu format
    localStorage.setItem("load_route", JSON.stringify({
      id: `ai-${Date.now()}`,
      name: `AI Rotası: ${finalCity}`,
      waypoints,
    }));

    setTimeout(() => navigate("/map"), 600);
  };

  const saveRecommendation = () => {
    if (!result || !currentMeta) return;
    const entry = {
      id: Date.now(),
      ...currentMeta,
      content: result,
      savedAt: new Date().toISOString(),
    };
    const updated = [entry, ...history].slice(0, 20); // max 20 kayıt
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setSavedMsg("Öneri kaydedildi!");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const loadHistoryItem = (item) => {
    setResult(item.content);
    setCurrentMeta({ city: item.city, duration: item.duration, budget: item.budget, interests: item.interests });
    setCity(item.city);
    setDuration(item.duration);
    setBudget(item.budget);
    setSelectedInterests(item.interests || []);
    setShowHistory(false);
  };

  const deleteHistoryItem = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.header}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <div style={s.icon}>✨</div>
            {history.length > 0 && (
              <button style={s.historyToggleBtn} onClick={() => setShowHistory(v => !v)}>
                📜 Geçmiş ({history.length})
              </button>
            )}
          </div>
          <h1 style={s.title}>AI Rota Önerisi</h1>
          <p style={s.sub}>Yapay zeka ile sana özel kişiselleştirilmiş gezi planı al.</p>
        </div>

        {/* Geçmiş Paneli */}
        {showHistory && (
          <div style={s.historyPanel}>
            <div style={s.historyTitle}>Geçmiş Öneriler</div>
            {history.map(item => (
              <div key={item.id} style={s.historyItem}>
                <div style={s.historyItemInfo}>
                  <div style={s.historyCity}>📍 {item.city}</div>
                  <div style={s.historyMeta}>{item.duration} · {item.budget} bütçe · {new Date(item.savedAt).toLocaleDateString("tr-TR")}</div>
                </div>
                <div style={s.historyBtns}>
                  <button style={s.loadHistBtn} onClick={() => loadHistoryItem(item)}>↩ Yükle</button>
                  <button style={s.delHistBtn} onClick={() => deleteHistoryItem(item.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Şehir Seç</label>
            <div style={s.cityGrid}>
              {CITIES.map(c => (
                <button
                  key={c}
                  style={{
                    ...s.cityChip,
                    ...(city === c && !customCity.trim() ? s.chipActive : {}),
                    ...(customCity.trim() ? s.chipDimmed : {}),
                  }}
                  onClick={() => { setCity(c); setCustomCity(""); }}
                >
                  {c}
                </button>
              ))}
            </div>
            <div style={s.customCityRow}>
              <input
                style={{ ...s.input, ...(customCity.trim() ? s.inputActive : {}) }}
                placeholder="Veya başka bir şehir yaz... (Enter ile onayla)"
                value={customCity}
                onChange={e => { setCustomCity(e.target.value); if (e.target.value.trim()) setCity(""); }}
                onKeyDown={e => { if (e.key === "Enter" && customCity.trim()) handleSubmit(); }}
              />
              {customCity.trim() && (
                <button style={s.clearCityBtn} onClick={() => setCustomCity("")} title="Temizle">✕</button>
              )}
            </div>
            {customCity.trim() && (
              <div style={s.citySelectedBadge}>✅ Seçili şehir: <strong>{customCity.trim()}</strong></div>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>Süre</label>
            <div style={s.row}>
              {DURATIONS.map(d => (
                <button key={d} style={{...s.optBtn, ...(duration === d ? s.chipActive : {})}} onClick={() => setDuration(d)}>{d}</button>
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Bütçe</label>
            <div style={s.row}>
              {BUDGETS.map(b => (
                <button key={b} style={{...s.optBtn, ...(budget === b ? s.chipActive : {})}} onClick={() => setBudget(b)}>
                  {b === "düşük" ? "💰 Düşük" : b === "orta" ? "💳 Orta" : "💎 Yüksek"}
                </button>
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>İlgi Alanları (çoklu seçim)</label>
            <div style={s.row}>
              {INTERESTS.map(i => (
                <button key={i} style={{...s.optBtn, ...(selectedInterests.includes(i) ? s.chipActive : {})}} onClick={() => toggleInterest(i)}>
                  {i}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button style={{...s.submitBtn, ...(loading ? s.submitDisabled : {})}} onClick={handleSubmit} disabled={loading}>
            {loading ? "⏳ Rota hazırlanıyor..." : "✨ Rota Öner"}
          </button>
        </div>
      </div>

      <div style={s.right}>
        {!result && !loading && (
          <div style={s.placeholder}>
            <div style={s.placeholderIcon}>🗺️</div>
            <div style={s.placeholderText}>Formu doldurup "Rota Öner"e tıkla,<br />AI sana özel bir gezi planı hazırlasın.</div>
          </div>
        )}
        {loading && (
          <div style={s.placeholder}>
            <div style={{...s.placeholderIcon, animation:"pulse 1.5s infinite"}}>✨</div>
            <div style={s.placeholderText}>AI rotanı hazırlıyor...</div>
          </div>
        )}
        {result && (
          <div style={s.result}>
            <div style={s.resultHeader}>
              <span style={s.resultIcon}>✈️</span>
              <span style={s.resultTitle}>Gezi Planın Hazır!</span>
              <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
                {savedMsg && <span style={s.savedBadge}>✅ {savedMsg}</span>}
                <button style={s.saveResultBtn} onClick={saveRecommendation}>💾 Kaydet</button>
                {aiPlaces.length > 0 && (
                  <button
                    style={{...s.mapResultBtn, ...(mapLoading ? {opacity:0.7} : {})}}
                    onClick={showOnMap}
                    disabled={mapLoading}
                  >
                    {mapLoading ? "⏳ Yerler aranıyor..." : "🗺️ Haritada Göster"}
                  </button>
                )}
              </div>
            </div>
            {mapMsg && <div style={s.mapMsgBar}>{mapMsg}</div>}
            <div style={s.resultBody}>
              {result.split("\n").map((line, i) => (
                <p key={i} style={{
                  ...s.line,
                  ...(line.match(/^\d+\./) ? s.numbered : {}),
                  ...(line.match(/^#{1,3}/) ? s.heading : {}),
                  ...(line.startsWith("**") ? s.bold : {}),
                }}>
                  {line.replace(/\*\*/g, "").replace(/^#+\s*/, "")}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { display:"flex", minHeight:"calc(100vh - 58px)", fontFamily:"system-ui,sans-serif" },
  left: { width:"380px", flexShrink:0, background:"#fff", borderRight:"1px solid #e1f0e8", padding:"2rem", overflowY:"auto" },
  right: { flex:1, background:"#f2f8f5", padding:"2rem", overflowY:"auto" },
  header: { marginBottom:"1.75rem" },
  icon: { fontSize:"32px", marginBottom:"8px" },
  title: { fontSize:"22px", fontWeight:700, color:"#1a2e25", margin:"0 0 6px" },
  sub: { fontSize:"13px", color:"#4a7a62", lineHeight:1.5 },
  form: { display:"flex", flexDirection:"column", gap:"1.25rem" },
  field: { display:"flex", flexDirection:"column", gap:"8px" },
  label: { fontSize:"12px", fontWeight:600, color:"#4a7a62", textTransform:"uppercase", letterSpacing:"0.5px" },
  cityGrid: { display:"flex", flexWrap:"wrap", gap:"6px" },
  cityChip: { padding:"6px 12px", borderRadius:"8px", border:"1px solid #a8d4bc", background:"#fff", fontSize:"12px", color:"#4a7a62", cursor:"pointer" },
  row: { display:"flex", flexWrap:"wrap", gap:"6px" },
  optBtn: { padding:"7px 14px", borderRadius:"8px", border:"1px solid #a8d4bc", background:"#fff", fontSize:"12px", color:"#4a7a62", cursor:"pointer" },
  chipActive: { background:"#0f6e56", color:"#fff", borderColor:"#0f6e56" },
  input: { padding:"9px 12px", borderRadius:"10px", border:"1px solid #a8d4bc", fontSize:"13px", outline:"none", background:"#f5faf7", flex:1 },
  inputActive: { border:"2px solid #0f6e56", background:"#f0fdf8", fontWeight:600, color:"#1a2e25" },
  customCityRow: { display:"flex", alignItems:"center", gap:"6px" },
  clearCityBtn: { padding:"8px 10px", borderRadius:"9px", border:"1px solid #d0e8dc", background:"#fff", color:"#4a7a62", fontSize:"14px", cursor:"pointer", lineHeight:1, flexShrink:0 },
  citySelectedBadge: { fontSize:"12px", color:"#0f6e56", background:"#e6f7f0", padding:"5px 10px", borderRadius:"8px", border:"1px solid #a8d4bc" },
  chipDimmed: { opacity:0.4 },
  error: { padding:"10px 14px", borderRadius:"10px", background:"#fef2f2", border:"1px solid #fca5a5", color:"#dc2626", fontSize:"13px" },
  submitBtn: { padding:"13px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#0f6e56,#1d9e75)", color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer" },
  submitDisabled: { opacity:0.6, cursor:"not-allowed" },
  placeholder: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", minHeight:"400px", gap:"16px" },
  placeholderIcon: { fontSize:"56px" },
  placeholderText: { fontSize:"14px", color:"#4a7a62", textAlign:"center", lineHeight:1.6 },
  result: { background:"#fff", borderRadius:"16px", border:"1px solid #e1f0e8", overflow:"hidden" },
  resultHeader: { background:"linear-gradient(135deg,#0f6e56,#1d9e75)", padding:"1.25rem 1.5rem", display:"flex", alignItems:"center", gap:"10px" },
  resultIcon: { fontSize:"22px" },
  resultTitle: { fontSize:"16px", fontWeight:600, color:"#fff" },
  resultBody: { padding:"1.5rem" },
  line: { fontSize:"13px", color:"#2d4a3e", lineHeight:1.7, margin:"4px 0" },
  numbered: { fontWeight:500, color:"#0f6e56" },
  heading: { fontSize:"15px", fontWeight:700, color:"#1a2e25", marginTop:"12px" },
  bold: { fontWeight:600 },
  historyToggleBtn: { padding:"6px 12px", borderRadius:"8px", border:"1px solid #a8d4bc", background:"#fff", fontSize:"12px", fontWeight:600, color:"#0f6e56", cursor:"pointer" },
  historyPanel: { background:"#f5faf7", borderRadius:"12px", border:"1px solid #d0e8dc", padding:"0.75rem", marginBottom:"1rem", display:"flex", flexDirection:"column", gap:"6px" },
  historyTitle: { fontSize:"11px", fontWeight:700, color:"#4a7a62", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"4px" },
  historyItem: { background:"#fff", borderRadius:"8px", border:"1px solid #e8f5ee", padding:"8px 10px", display:"flex", alignItems:"center", gap:"8px" },
  historyItemInfo: { flex:1, overflow:"hidden" },
  historyCity: { fontSize:"12px", fontWeight:700, color:"#1a2e25" },
  historyMeta: { fontSize:"11px", color:"#4a7a62", marginTop:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  historyBtns: { display:"flex", gap:"4px", flexShrink:0 },
  loadHistBtn: { padding:"4px 8px", borderRadius:"6px", border:"1px solid #0f6e56", background:"#e6f7f0", color:"#0f6e56", fontSize:"10px", fontWeight:600, cursor:"pointer" },
  delHistBtn: { padding:"4px 8px", borderRadius:"6px", border:"1px solid #fecaca", background:"transparent", color:"#EF4444", fontSize:"10px", cursor:"pointer" },
  saveResultBtn: { padding:"6px 14px", borderRadius:"8px", border:"none", background:"rgba(255,255,255,0.2)", color:"#fff", fontSize:"12px", fontWeight:600, cursor:"pointer", backdropFilter:"blur(4px)" },
  mapResultBtn: { padding:"6px 14px", borderRadius:"8px", border:"none", background:"rgba(255,255,255,0.9)", color:"#0f6e56", fontSize:"12px", fontWeight:700, cursor:"pointer" },
  mapMsgBar: { padding:"8px 1.5rem", fontSize:"12px", fontWeight:500, color:"#0f6e56", background:"#e6f7f0", borderBottom:"1px solid #a8d4bc" },
  savedBadge: { fontSize:"12px", color:"#d1fae5", fontWeight:500 },
};
