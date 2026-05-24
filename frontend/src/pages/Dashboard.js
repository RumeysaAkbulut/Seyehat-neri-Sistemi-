import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";
import { useEffect, useState } from "react";
import axios from "axios";

const features = [
  { icon: "📍", title: "Mekanları Keşfet", desc: "Kategoriye ve şehre göre filtreleyerek en iyi mekanları bul, favorile.", link: "/places", color: t.primaryLight },
  { icon: "🗺️", title: "Haritada Gör", desc: "Mekanları interaktif harita üzerinde görüntüle ve rota planla.", link: "/map", color: "#f0fdf4" },
  { icon: "🛤️", title: "Rotalarım", desc: "Kaydettiğin tüm seyahat rotalarını görüntüle, düzenle ve haritada aç.", link: "/routes", color: "#fff7ed" },
  { icon: "✨", title: "AI Rota Önerisi", desc: "Yapay zeka ile sana özel kişiselleştirilmiş gezi planı al.", link: "/ai", color: "#fdf4ff" },
];

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ places: null, cities: null, favorites: null, routes: null, reviews: null });

  useEffect(() => {
    if (!token) return;
    axios.get("http://localhost:5001/api/stats", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => setStats(r.data)).catch(() => {});
  }, [token]);

  const statItems = [
    { n: stats.cities !== null ? `${stats.cities}+` : "—", l: "Şehir" },
    { n: stats.places !== null ? `${stats.places}+` : "—", l: "Mekan" },
    { n: stats.favorites !== null ? stats.favorites : "—", l: "Favori" },
    { n: stats.routes !== null ? stats.routes : "—", l: "Rotam" },
  ];

  return (
    <div style={s.page}>
      <div style={s.hero}>
        <div style={s.heroContent}>
          <div style={s.greeting}>Hoş geldin, {user?.name?.split(" ")[0]} 👋</div>
          <h1 style={s.heroTitle}>Bir sonraki seyahatini<br />planlamaya hazır mısın?</h1>
          <p style={s.heroSub}>AI destekli rota önerileri, interaktif harita ve kişiselleştirilmiş mekan önerileriyle seyahatini tasarla.</p>
          <div style={s.heroBtns}>
            <button style={s.btnPrimary} onClick={() => navigate("/ai")}>✨ AI Rota Al</button>
            <button style={s.btnSecondary} onClick={() => navigate("/places")}>📍 Mekanları Keşfet</button>
          </div>
        </div>
        <div style={s.heroVisual}>
          <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
            <circle cx="160" cy="130" r="105" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <circle cx="160" cy="130" r="70" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
            <ellipse cx="160" cy="130" rx="105" ry="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
            <line x1="160" y1="25" x2="160" y2="235" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
            <line x1="55" y1="130" x2="265" y2="130" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
            {[{x:160,y:90,l:"İstanbul"},{x:220,y:110,l:"Dubai"},{x:120,y:145,l:"Roma"},{x:200,y:158,l:"Tokyo"},{x:138,y:112,l:"Paris"}].map((p,i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="rgba(255,255,255,0.9)"/>
                <circle cx={p.x} cy={p.y} r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                <text x={p.x+8} y={p.y+4} fontSize="8" fill="rgba(255,255,255,0.8)" fontFamily="system-ui">{p.l}</text>
              </g>
            ))}
            <path d="M160,90 Q190,100 220,110" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" strokeDasharray="5,3"/>
            <path d="M138,112 Q149,101 160,90" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" strokeDasharray="4,3"/>
            <path d="M220,110 Q210,134 200,158" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" strokeDasharray="4,3"/>
          </svg>
        </div>
      </div>

      <div style={s.features}>
        {features.map((f, i) => (
          <div key={i} style={{...s.card, background:f.color}} onClick={() => navigate(f.link)}>
            <div style={s.cardIcon}>{f.icon}</div>
            <div style={s.cardTitle}>{f.title}</div>
            <div style={s.cardDesc}>{f.desc}</div>
            <div style={s.cardArrow}>Başla →</div>
          </div>
        ))}
      </div>

      <div style={s.stats}>
        {statItems.map((st, i) => (
          <div key={i} style={{...s.stat, borderRight: i < statItems.length - 1 ? `1px solid ${t.border}` : "none"}}>
            <div style={s.statNum}>{st.n}</div>
            <div style={s.statLabel}>{st.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:"calc(100vh - 58px)", background:t.bg, fontFamily:"system-ui,sans-serif" },
  hero: { background:t.gradientHero, padding:"4rem 3rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"2rem" },
  heroContent: { flex:1, maxWidth:"520px" },
  greeting: { fontSize:"14px", color:"rgba(255,255,255,0.7)", marginBottom:"12px", fontWeight:500 },
  heroTitle: { fontSize:"36px", fontWeight:800, color:"#fff", lineHeight:1.2, margin:"0 0 16px", letterSpacing:"-0.5px" },
  heroSub: { fontSize:"15px", color:"rgba(255,255,255,0.75)", lineHeight:1.6, marginBottom:"28px" },
  heroBtns: { display:"flex", gap:"12px", flexWrap:"wrap" },
  btnPrimary: { padding:"12px 24px", borderRadius:"12px", border:"none", background:"#fff", color:t.primary, fontSize:"14px", fontWeight:700, cursor:"pointer" },
  btnSecondary: { padding:"12px 24px", borderRadius:"12px", border:"1.5px solid rgba(255,255,255,0.35)", background:"transparent", color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer" },
  heroVisual: { width:"300px", height:"220px", flexShrink:0 },
  features: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"1.25rem", padding:"2.5rem 3rem" },
  card: { borderRadius:"16px", padding:"1.75rem", border:`1px solid ${t.border}`, cursor:"pointer", boxShadow:t.shadow, transition:"transform 0.15s" },
  cardIcon: { fontSize:"32px", marginBottom:"12px" },
  cardTitle: { fontSize:"16px", fontWeight:700, color:t.text, marginBottom:"8px" },
  cardDesc: { fontSize:"13px", color:t.textMuted, lineHeight:1.6, marginBottom:"16px" },
  cardArrow: { fontSize:"13px", color:t.primary, fontWeight:700 },
  stats: { display:"flex", borderTop:`1px solid ${t.border}`, background:"#fff" },
  stat: { flex:1, textAlign:"center", padding:"1.5rem" },
  statNum: { fontSize:"24px", fontWeight:800, color:t.primary },
  statLabel: { fontSize:"12px", color:t.textMuted, marginTop:"4px" },
};
