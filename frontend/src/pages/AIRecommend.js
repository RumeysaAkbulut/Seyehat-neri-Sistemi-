import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Kapadokya", "Pamukkale", "Bursa", "Trabzon", "Bodrum", "Mardin"];
const DURATIONS = ["1 gün", "2 gün", "3 gün", "1 hafta"];
const BUDGETS = ["düşük", "orta", "yüksek"];
const INTERESTS = ["Tarih & Kültür", "Doğa & Macera", "Yeme & İçme", "Alışveriş", "Sanat & Müze", "Gece Hayatı"];

export default function AIRecommend() {
  const { token } = useAuth();
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [duration, setDuration] = useState("2 gün");
  const [budget, setBudget] = useState("orta");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleInterest = (i) => {
    setSelectedInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleSubmit = async () => {
    const finalCity = customCity.trim() || city;
    if (!finalCity) { setError("Lütfen bir şehir seçin veya girin."); return; }
    setError("");
    setResult("");
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5001/api/ai/recommend",
        { city: finalCity, interests: selectedInterests.join(", "), duration, budget },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data.recommendation);
    } catch (e) {
      setError(e.response?.data?.error || "AI servisi şu an kullanılamıyor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.header}>
          <div style={s.icon}>✨</div>
          <h1 style={s.title}>AI Rota Önerisi</h1>
          <p style={s.sub}>Yapay zeka ile sana özel kişiselleştirilmiş gezi planı al.</p>
        </div>

        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Şehir Seç</label>
            <div style={s.cityGrid}>
              {CITIES.map(c => (
                <button key={c} style={{...s.cityChip, ...(city === c && !customCity ? s.chipActive : {})}} onClick={() => { setCity(c); setCustomCity(""); }}>
                  {c}
                </button>
              ))}
            </div>
            <input style={s.input} placeholder="Veya başka bir şehir yaz..." value={customCity} onChange={e => { setCustomCity(e.target.value); setCity(""); }} />
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
            </div>
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
  input: { padding:"9px 12px", borderRadius:"10px", border:"1px solid #a8d4bc", fontSize:"13px", outline:"none", background:"#f5faf7" },
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
};
