import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";
import { useEffect, useState } from "react";
import axios from "axios";

const features = [
  {
    title: "Mekanları Keşfet",
    desc: "Kategoriye ve şehre göre filtreleyerek en iyi mekanları bul, favorile.",
    link: "/places",
    bg: t.primaryLight,
    border: t.border,
    iconBg: t.primary,
    arrowColor: t.primary,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3"/>
        <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 14-8 14S4 15.25 4 10a8 8 0 0 1 8-8z"/>
      </svg>
    ),
  },
  {
    title: "Haritada Gör",
    desc: "Mekanları interaktif harita üzerinde görüntüle ve rota planla.",
    link: "/map",
    bg: t.blueLight,
    border: t.blueBorder,
    iconBg: t.blue,
    arrowColor: t.blue,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        <line x1="8" y1="2" x2="8" y2="18"/>
        <line x1="16" y1="6" x2="16" y2="22"/>
      </svg>
    ),
  },
  {
    title: "Rotalarım",
    desc: "Kaydettiğin tüm seyahat rotalarını görüntüle, düzenle ve haritada aç.",
    link: "/routes",
    bg: t.orangeLight,
    border: t.orangeBorder,
    iconBg: t.orange,
    arrowColor: t.orange,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    title: "AI Rota Önerisi",
    desc: "Yapay zeka ile sana özel kişiselleştirilmiş gezi planı al.",
    link: "/ai",
    bg: t.purpleLight,
    border: t.purpleBorder,
    iconBg: t.purple,
    arrowColor: t.purple,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
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
          <div style={s.greeting}>Hoş geldin, {user?.name?.split(" ")[0]}</div>
          <h1 style={s.heroTitle}>Bir sonraki seyahatini<br />planlamaya hazır mısın?</h1>
          <p style={s.heroSub}>AI destekli rota önerileri, interaktif harita ve kişiselleştirilmiş mekan önerileriyle seyahatini tasarla.</p>
          <div style={s.heroBtns}>
            <button style={s.btnPrimary} onClick={() => navigate("/ai")}>AI Rota Al</button>
            <button style={s.btnSecondary} onClick={() => navigate("/places")}>Mekanları Keşfet</button>
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
          <div key={i} style={{...s.card, background: f.bg, borderColor: f.border}} onClick={() => navigate(f.link)}>
            <div style={{...s.cardIconBox, background: f.iconBg}}>
              {f.icon}
            </div>
            <div style={s.cardTitle}>{f.title}</div>
            <div style={s.cardDesc}>{f.desc}</div>
            <div style={{...s.cardArrow, color: f.arrowColor}}>Başla →</div>
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
  page: { minHeight:"calc(100vh - 58px)", background:t.bg, fontFamily: t.font },
  hero: { background:t.gradientHero, padding:"4rem 3rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"2rem" },
  heroContent: { flex:1, maxWidth:"520px" },
  greeting: { fontSize:"14px", color:"rgba(255,255,255,0.7)", marginBottom:"12px", fontWeight:500, fontFamily: t.font },
  heroTitle: { fontSize:"36px", fontWeight:800, color:"#fff", lineHeight:1.2, margin:"0 0 16px", letterSpacing:"-0.5px", fontFamily: t.font },
  heroSub: { fontSize:"15px", color:"rgba(255,255,255,0.75)", lineHeight:1.6, marginBottom:"28px" },
  heroBtns: { display:"flex", gap:"12px", flexWrap:"wrap" },
  btnPrimary: { padding:"12px 24px", borderRadius:"12px", border:"none", background:"#fff", color:t.primary, fontSize:"14px", fontWeight:700, cursor:"pointer", fontFamily: t.font },
  btnSecondary: { padding:"12px 24px", borderRadius:"12px", border:"1.5px solid rgba(255,255,255,0.35)", background:"transparent", color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer", fontFamily: t.font },
  heroVisual: { width:"300px", height:"220px", flexShrink:0 },
  features: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"1.25rem", padding:"2.5rem 3rem" },
  card: { borderRadius:"16px", padding:"1.75rem", border:"1px solid", cursor:"pointer", boxShadow:t.shadow, transition:"transform 0.15s" },
  cardIconBox: { width:"48px", height:"48px", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"14px" },
  cardTitle: { fontSize:"16px", fontWeight:700, color:t.text, marginBottom:"8px", fontFamily: t.font },
  cardDesc: { fontSize:"13px", color:t.textMuted, lineHeight:1.6, marginBottom:"16px" },
  cardArrow: { fontSize:"13px", fontWeight:700 },
  stats: { display:"flex", borderTop:`1px solid ${t.border}`, background:"#fff" },
  stat: { flex:1, textAlign:"center", padding:"1.5rem" },
  statNum: { fontSize:"24px", fontWeight:800, color:t.primary, fontFamily: t.font },
  statLabel: { fontSize:"12px", color:t.textMuted, marginTop:"4px" },
};
