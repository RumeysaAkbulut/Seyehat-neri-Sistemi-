import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

const HISTORY_KEY = "ai_recommendation_history";

/** Nearest-neighbour: ilk nokta sabit, geri kalanları en yakın komşuya göre sıralar. */
function nearestNeighbourSort(points) {
  if (points.length <= 2) return [...points];
  const rem = [...points];
  const out = [rem.shift()];
  while (rem.length > 0) {
    const last = out[out.length - 1];
    let bi = 0, bd = Infinity;
    for (let i = 0; i < rem.length; i++) {
      const d = (last.lat - rem[i].lat) ** 2 + (last.lng - rem[i].lng) ** 2;
      if (d < bd) { bd = d; bi = i; }
    }
    out.push(rem.splice(bi, 1)[0]);
  }
  return out;
}

const CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Kapadokya", "Pamukkale", "Bursa", "Trabzon", "Bodrum", "Mardin"];
const DURATION_PRESETS = ["1 gün", "2 gün", "3 gün", "5 gün", "1 hafta", "2 hafta"];
const BUDGETS = [
  { key: "düşük",  label: "Düşük",   color: t.primary, bg: t.primaryLight, border: t.border },
  { key: "orta",   label: "Orta",    color: t.amber,   bg: t.amberLight,   border: t.amberBorder },
  { key: "yüksek", label: "Yüksek",  color: t.purple,  bg: t.purpleLight,  border: t.purpleBorder },
];
const INTERESTS = ["Tarih & Kültür", "Doğa & Macera", "Yeme & İçme", "Alışveriş", "Sanat & Müze", "Gece Hayatı"];

export default function AIRecommend() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [duration, setDuration] = useState("2 gün");
  const [durationNum, setDurationNum] = useState(2);
  const [durationUnit, setDurationUnit] = useState("gün"); // "gün" | "hafta"
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

  // Preset seçilince stepper'ı da senkronize et
  const pickPreset = (preset) => {
    setDuration(preset);
    const parts = preset.split(" ");
    setDurationNum(parseInt(parts[0], 10));
    setDurationUnit(parts[1]);
  };

  // Stepper ± → duration string üret
  const stepDuration = (delta) => {
    const maxVal = durationUnit === "hafta" ? 8 : 30;
    const next = Math.min(maxVal, Math.max(1, durationNum + delta));
    setDurationNum(next);
    const str = `${next} ${durationUnit}`;
    setDuration(str);
  };

  // Birim değişince miktar sıfırla mantıklı bir değere
  const changeUnit = (unit) => {
    setDurationUnit(unit);
    const num = unit === "hafta" ? Math.min(durationNum, 8) : durationNum;
    setDurationNum(num);
    setDuration(`${num} ${unit}`);
  };

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
          ? "Günlük AI kotası doldu. Birkaç dakika bekleyip tekrar dene veya yarın tekrar gel."
          : (e.response?.data?.error || "AI servisi şu an kullanılamıyor.")
      );
    } finally {
      setLoading(false);
    }
  };

  const showOnMap = async () => {
    if (!aiPlaces.length) return;
    setMapLoading(true);
    setMapMsg("Şehir merkezi alınıyor...");
    const finalCity = customCity.trim() || city;
    const waypoints = [];

    // ── 0. Şehir merkezini al (yakınlık filtresi için) ──
    let cityLat = null, cityLon = null;
    try {
      const cr = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(finalCity)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const cd = await cr.json();
      if (cd[0]) { cityLat = parseFloat(cd[0].lat); cityLon = parseFloat(cd[0].lon); }
    } catch { /* filtre atlanır */ }

    // ~100 km yarıçap kontrolü (Öklid, derece cinsinden)
    const RADIUS = 1.2;
    const isNearCity = (lat, lon) =>
      cityLat === null ? true
      : Math.sqrt((lat - cityLat) ** 2 + (lon - cityLon) ** 2) < RADIUS;

    // ── Photon geocoder (çok dilli, Türkçe dahil, ücretsiz, hız limiti yok) ──
    const geocodePhoton = async (q) => {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      const hit = (data.features || []).find(f => {
        const [lon, lat] = f.geometry.coordinates;
        return isNearCity(lat, lon);
      });
      if (!hit) return null;
      const [lon, lat] = hit.geometry.coordinates;
      return { lat, lon };
    };

    // ── Nominatim fallback (yavaş, 1100ms gecikme gerekli) ──
    const geocodeNominatim = async (q) => {
      await new Promise(r => setTimeout(r, 1100));
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
        { headers: { "Accept-Language": "en,tr,es,fr,de,it,pt,ar" } }
      );
      const data = await res.json();
      const hit = data.find(r => isNearCity(parseFloat(r.lat), parseFloat(r.lon)));
      if (!hit) return null;
      return { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon) };
    };

    // ── Tek mekan için tüm stratejileri sırayla dene ──
    const findPlace = async (name) => {
      const clean = name.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();

      // Photon stratejileri (hızlı, çok dilli)
      const photonQueries = [
        `${clean} ${finalCity}`,   // "Alcázar Sevilla" — boşlukla
        `${clean}, ${finalCity}`,  // "Alcázar, Sevilla" — virgülle
        clean,                     // sadece mekan adı
        name,                      // AI'ın tam verdiği ad
      ];
      for (const q of photonQueries) {
        try {
          const r = await geocodePhoton(q);
          if (r) return r;
        } catch { /* devam */ }
      }

      // Nominatim fallback stratejileri
      const nomQueries = [
        `${clean}, ${finalCity}`,
        clean,
      ];
      for (const q of nomQueries) {
        try {
          const r = await geocodeNominatim(q);
          if (r) return r;
        } catch { /* devam */ }
      }
      return null;
    };

    // ── 1. Her mekan için ara ──
    for (let i = 0; i < aiPlaces.length; i++) {
      const place = aiPlaces[i];
      setMapMsg(`${i + 1}/${aiPlaces.length}: "${place.name}" aranıyor...`);
      try {
        const coords = await findPlace(place.name);
        if (coords) {
          waypoints.push({ lat: coords.lat, lng: coords.lon, name: place.name, duration: place.duration || null });
        }
      } catch { /* bu mekanı atla */ }
    }

    setMapLoading(false);

    if (waypoints.length === 0) {
      setMapMsg("Hiçbir mekan konumlandırılamadı. Lütfen birkaç dakika bekleyip tekrar deneyin.");
      return;
    }

    const optimized = nearestNeighbourSort(waypoints);
    setMapMsg(`${optimized.length}/${aiPlaces.length} mekan bulundu — optimize edildi, haritaya aktarılıyor...`);

    localStorage.setItem("load_route", JSON.stringify({
      id: `ai-${Date.now()}`,
      name: `AI Rotası: ${finalCity}`,
      waypoints: optimized,
    }));

    setTimeout(() => navigate("/map"), 800);
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
            <div style={s.iconBox}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            {history.length > 0 && (
              <button style={s.historyToggleBtn} onClick={() => setShowHistory(v => !v)}>
                Geçmiş ({history.length})
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
                  <div style={s.historyCity}>{item.city}</div>
                  <div style={s.historyMeta}>{item.duration} · {item.budget} bütçe · {new Date(item.savedAt).toLocaleDateString("tr-TR")}</div>
                </div>
                <div style={s.historyBtns}>
                  <button style={s.loadHistBtn} onClick={() => loadHistoryItem(item)}>Yükle</button>
                  <button style={s.delHistBtn} onClick={() => deleteHistoryItem(item.id)}>×</button>
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
              <div style={s.citySelectedBadge}>Seçili şehir: <strong>{customCity.trim()}</strong></div>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>Süre</label>

            {/* Hızlı presetler */}
            <div style={s.row}>
              {DURATION_PRESETS.map(d => (
                <button
                  key={d}
                  style={{...s.optBtn, ...(duration === d ? s.chipActive : {})}}
                  onClick={() => pickPreset(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Özel süre: stepper + birim */}
            <div style={s.stepperRow}>
              <span style={s.stepperLabel}>Özel:</span>
              <button style={s.stepperBtn} onClick={() => stepDuration(-1)} disabled={durationNum <= 1}>−</button>
              <span style={s.stepperVal}>{durationNum}</span>
              <button style={s.stepperBtn} onClick={() => stepDuration(1)} disabled={durationNum >= (durationUnit === "hafta" ? 8 : 30)}>+</button>
              <div style={s.unitToggle}>
                <button
                  style={{...s.unitBtn, ...(durationUnit === "gün" ? s.unitBtnActive : {})}}
                  onClick={() => changeUnit("gün")}
                >gün</button>
                <button
                  style={{...s.unitBtn, ...(durationUnit === "hafta" ? s.unitBtnActive : {})}}
                  onClick={() => changeUnit("hafta")}
                >hafta</button>
              </div>
              <span style={s.stepperCurrent}>→ <strong>{duration}</strong></span>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Bütçe</label>
            <div style={s.row}>
              {BUDGETS.map(b => {
                const isActive = budget === b.key;
                return (
                  <button
                    key={b.key}
                    style={{
                      ...s.optBtn,
                      ...(isActive ? { background: b.bg, color: b.color, borderColor: b.border, fontWeight: 700 } : {}),
                    }}
                    onClick={() => setBudget(b.key)}
                  >
                    {b.label}
                  </button>
                );
              })}
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
            {loading
              ? <span style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"8px"}}>
                  <span style={s.btnSpinner} />
                  Rota hazırlanıyor...
                </span>
              : "Rota Öner"
            }
          </button>
        </div>
      </div>

      <div style={s.right}>
        {!result && !loading && (
          <div style={s.placeholder}>
            <div style={s.placeholderIconBox}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={t.textLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/>
                <line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
            </div>
            <div style={s.placeholderText}>Formu doldurup "Rota Öner"e tıkla,<br />AI sana özel bir gezi planı hazırlasın.</div>
          </div>
        )}
        {loading && (
          <div style={s.placeholder}>
            <div style={s.loadingSpinner} />
            <div style={s.placeholderText}>AI rotanı hazırlıyor...</div>
          </div>
        )}
        {result && (
          <div style={s.result}>
            <div style={s.resultHeader}>
              <div style={s.resultIconBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <span style={s.resultTitle}>Gezi Planın Hazır!</span>
              <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
                {savedMsg && <span style={s.savedBadge}>{savedMsg}</span>}
                <button style={s.saveResultBtn} onClick={saveRecommendation}>Kaydet</button>
                {aiPlaces.length > 0 && (
                  <button
                    style={{...s.mapResultBtn, ...(mapLoading ? {opacity:0.7} : {})}}
                    onClick={showOnMap}
                    disabled={mapLoading}
                  >
                    {mapLoading ? "Yerler aranıyor..." : "Haritada Göster"}
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
  page: { display:"flex", minHeight:"calc(100vh - 58px)", fontFamily: t.font },
  left: { width:"380px", flexShrink:0, background:"#fff", borderRight:`1px solid ${t.borderLight}`, padding:"2rem", overflowY:"auto" },
  right: { flex:1, background:t.bg, padding:"2rem", overflowY:"auto" },
  header: { marginBottom:"1.75rem" },
  iconBox: { width:"40px", height:"40px", borderRadius:"10px", background:t.purpleLight, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"12px" },
  title: { fontSize:"22px", fontWeight:700, color:t.text, margin:"0 0 6px", fontFamily:t.font },
  sub: { fontSize:"13px", color:t.textMuted, lineHeight:1.5 },
  form: { display:"flex", flexDirection:"column", gap:"1.25rem" },
  field: { display:"flex", flexDirection:"column", gap:"8px" },
  label: { fontSize:"12px", fontWeight:600, color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" },
  cityGrid: { display:"flex", flexWrap:"wrap", gap:"6px" },
  cityChip: { padding:"6px 12px", borderRadius:"8px", border:`1px solid ${t.border}`, background:"#fff", fontSize:"12px", color:t.textMuted, cursor:"pointer", fontFamily:t.font },
  row: { display:"flex", flexWrap:"wrap", gap:"6px" },
  optBtn: { padding:"7px 14px", borderRadius:"8px", border:`1px solid ${t.border}`, background:"#fff", fontSize:"12px", color:t.textMuted, cursor:"pointer", fontFamily:t.font, transition:"all 0.15s" },
  chipActive: { background:t.primary, color:"#fff", borderColor:t.primary },
  input: { padding:"9px 12px", borderRadius:"10px", border:`1px solid ${t.border}`, fontSize:"13px", outline:"none", background:"#f5faf7", flex:1, fontFamily:t.font },
  inputActive: { border:`2px solid ${t.primary}`, background:"#f0fdf8", fontWeight:600, color:t.text },
  customCityRow: { display:"flex", alignItems:"center", gap:"6px" },
  clearCityBtn: { padding:"8px 10px", borderRadius:"9px", border:`1px solid ${t.border}`, background:"#fff", color:t.textMuted, fontSize:"14px", cursor:"pointer", lineHeight:1, flexShrink:0 },
  citySelectedBadge: { fontSize:"12px", color:t.primary, background:t.primaryLight, padding:"5px 10px", borderRadius:"8px", border:`1px solid ${t.border}` },
  chipDimmed: { opacity:0.4 },

  stepperRow: { display:"flex", alignItems:"center", gap:"6px", background:"#f5faf7", borderRadius:"10px", padding:"8px 12px", border:`1px solid ${t.border}`, flexWrap:"wrap" },
  stepperLabel: { fontSize:"11px", fontWeight:600, color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.4px", marginRight:"4px" },
  stepperBtn: { width:"28px", height:"28px", borderRadius:"7px", border:`1px solid ${t.border}`, background:"#fff", color:t.primary, fontSize:"16px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, padding:0 },
  stepperVal: { minWidth:"24px", textAlign:"center", fontSize:"16px", fontWeight:700, color:t.text },
  unitToggle: { display:"flex", borderRadius:"7px", overflow:"hidden", border:`1px solid ${t.border}` },
  unitBtn: { padding:"5px 10px", border:"none", background:"#fff", fontSize:"12px", fontWeight:600, color:t.textMuted, cursor:"pointer" },
  unitBtnActive: { background:t.primary, color:"#fff" },
  stepperCurrent: { fontSize:"12px", color:t.primary, marginLeft:"4px" },
  error: { padding:"10px 14px", borderRadius:"10px", background:"#fef2f2", border:"1px solid #fca5a5", color:"#dc2626", fontSize:"13px" },
  submitBtn: { padding:"13px", borderRadius:"12px", border:"none", background:t.gradient, color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer", fontFamily:t.font },
  submitDisabled: { opacity:0.6, cursor:"not-allowed" },
  btnSpinner: { display:"inline-block", width:"14px", height:"14px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.4)", borderTop:"2px solid #fff", animation:"spin 0.7s linear infinite", flexShrink:0 },

  placeholder: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", minHeight:"400px", gap:"16px" },
  placeholderIconBox: { width:"80px", height:"80px", borderRadius:"50%", background:t.primaryLight, display:"flex", alignItems:"center", justifyContent:"center" },
  placeholderText: { fontSize:"14px", color:t.textMuted, textAlign:"center", lineHeight:1.6 },
  loadingSpinner: { width:"40px", height:"40px", borderRadius:"50%", border:`3px solid ${t.border}`, borderTop:`3px solid ${t.purple}`, animation:"spin 0.8s linear infinite" },

  result: { background:"#fff", borderRadius:"16px", border:`1px solid ${t.borderLight}`, overflow:"hidden" },
  resultHeader: { background:t.gradient, padding:"1.25rem 1.5rem", display:"flex", alignItems:"center", gap:"10px" },
  resultIconBox: { width:"32px", height:"32px", borderRadius:"8px", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  resultTitle: { fontSize:"16px", fontWeight:600, color:"#fff", fontFamily:t.font },
  resultBody: { padding:"1.5rem" },
  line: { fontSize:"13px", color:"#2d4a3e", lineHeight:1.7, margin:"4px 0" },
  numbered: { fontWeight:500, color:t.primary },
  heading: { fontSize:"15px", fontWeight:700, color:t.text, marginTop:"12px" },
  bold: { fontWeight:600 },

  historyToggleBtn: { padding:"6px 12px", borderRadius:"8px", border:`1px solid ${t.border}`, background:"#fff", fontSize:"12px", fontWeight:600, color:t.primary, cursor:"pointer", fontFamily:t.font },
  historyPanel: { background:"#f5faf7", borderRadius:"12px", border:`1px solid ${t.border}`, padding:"0.75rem", marginBottom:"1rem", display:"flex", flexDirection:"column", gap:"6px" },
  historyTitle: { fontSize:"11px", fontWeight:700, color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"4px" },
  historyItem: { background:"#fff", borderRadius:"8px", border:`1px solid ${t.borderLight}`, padding:"8px 10px", display:"flex", alignItems:"center", gap:"8px" },
  historyItemInfo: { flex:1, overflow:"hidden" },
  historyCity: { fontSize:"12px", fontWeight:700, color:t.text },
  historyMeta: { fontSize:"11px", color:t.textMuted, marginTop:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  historyBtns: { display:"flex", gap:"4px", flexShrink:0 },
  loadHistBtn: { padding:"4px 10px", borderRadius:"6px", border:`1px solid ${t.primary}`, background:t.primaryLight, color:t.primary, fontSize:"10px", fontWeight:600, cursor:"pointer" },
  delHistBtn: { padding:"4px 8px", borderRadius:"6px", border:"1px solid #fecaca", background:"transparent", color:"#EF4444", fontSize:"14px", fontWeight:700, cursor:"pointer", lineHeight:1 },

  saveResultBtn: { padding:"6px 14px", borderRadius:"8px", border:"none", background:"rgba(255,255,255,0.2)", color:"#fff", fontSize:"12px", fontWeight:600, cursor:"pointer", backdropFilter:"blur(4px)", fontFamily:t.font },
  mapResultBtn: { padding:"6px 14px", borderRadius:"8px", border:"none", background:"rgba(255,255,255,0.9)", color:t.primary, fontSize:"12px", fontWeight:700, cursor:"pointer", fontFamily:t.font },
  mapMsgBar: { padding:"8px 1.5rem", fontSize:"12px", fontWeight:500, color:t.primary, background:t.primaryLight, borderBottom:`1px solid ${t.border}` },
  savedBadge: { fontSize:"12px", color:"#d1fae5", fontWeight:500 },
};
