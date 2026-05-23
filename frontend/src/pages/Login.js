import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mesaj, setMesaj] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5001/api/users/login", { email, password });
      login(res.data.user, res.data.token);
      navigate("/");
    } catch (err) {
      setMesaj("❌ " + (err.response?.data?.error || "Hata oluştu"));
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div style={s.page}>
      <div style={s.wrapper}>
        <div style={s.left}>
          <div style={s.logo}>✈️ <span style={s.logoText}>Seyahat</span></div>
          <div style={s.header}>
            <div style={s.title}>Tekrar hoş geldin</div>
            <div style={s.sub}>Hesabına giriş yap ve seyahate devam et</div>
          </div>
          <div style={s.tabRow}>
            <div style={{...s.tab, ...s.tabActive}}>Giriş Yap</div>
            <Link to="/register" style={{...s.tab, ...s.tabInactive, textDecoration:"none"}}>Kayıt Ol</Link>
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>E-posta</label>
            <input style={s.input} type="email" placeholder="ornek@gmail.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey} />
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Şifre</label>
            <input style={s.input} type="password" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} />
          </div>
          <button style={s.btn} onClick={handleLogin}>Giriş Yap →</button>
          {mesaj && <p style={s.mesaj}>{mesaj}</p>}
          <div style={s.switchText}>Hesabın yok mu? <Link to="/register" style={s.link}>Kayıt Ol</Link></div>
        </div>
        <div style={s.right}>
          <div style={s.rightInner}>
            <div style={s.taglineIcon}>🌍</div>
            <div style={s.taglineMain}>Dünyayı<br />keşfetmeye<br />hazır mısın?</div>
            <div style={s.taglineSub}>AI destekli rota önerileri ve interaktif harita ile seyahatini planla.</div>
            <div style={s.dots}>
              {["İstanbul", "Tokyo", "Paris", "Dubai", "New York"].map(c => (
                <span key={c} style={s.dotChip}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem", background:"#F1F5F9", fontFamily:"system-ui,sans-serif" },
  wrapper: { display:"grid", gridTemplateColumns:"1fr 1fr", maxWidth:"820px", width:"100%", borderRadius:"24px", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.12)", background:"#fff" },
  left: { padding:"3rem 2.5rem", display:"flex", flexDirection:"column", justifyContent:"center" },
  right: { background:"linear-gradient(135deg,#1E1B4B 0%,#4338CA 50%,#7C3AED 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:"3rem" },
  rightInner: { textAlign:"center" },
  logo: { display:"flex", alignItems:"center", gap:"8px", marginBottom:"2rem", fontSize:"18px", fontWeight:800, color:"#4338CA" },
  logoText: { fontSize:"16px" },
  header: { marginBottom:"1.75rem" },
  title: { fontSize:"24px", fontWeight:700, color:"#1E293B" },
  sub: { fontSize:"13px", color:"#64748B", marginTop:"6px" },
  tabRow: { display:"flex", gap:"4px", background:"#F1F5F9", borderRadius:"12px", padding:"4px", marginBottom:"1.75rem" },
  tab: { flex:1, textAlign:"center", padding:"9px", borderRadius:"9px", fontSize:"13px", cursor:"pointer" },
  tabActive: { background:"#fff", color:"#4338CA", fontWeight:600, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
  tabInactive: { color:"#64748B" },
  formGroup: { marginBottom:"1rem" },
  label: { fontSize:"12px", color:"#64748B", display:"block", marginBottom:"6px", fontWeight:600 },
  input: { width:"100%", background:"#F8FAFC", border:"1.5px solid #E2E8F0", borderRadius:"10px", padding:"11px 14px", color:"#1E293B", fontSize:"14px", outline:"none", boxSizing:"border-box" },
  btn: { width:"100%", padding:"13px", borderRadius:"12px", border:"none", fontSize:"14px", fontWeight:600, cursor:"pointer", marginTop:"0.5rem", background:"linear-gradient(135deg,#4338CA,#7C3AED)", color:"#fff", letterSpacing:"0.2px" },
  mesaj: { textAlign:"center", marginTop:"0.75rem", fontSize:"13px", color:"#EF4444" },
  switchText: { textAlign:"center", marginTop:"1.25rem", fontSize:"12px", color:"#64748B" },
  link: { color:"#4338CA", fontWeight:600, textDecoration:"none" },
  taglineIcon: { fontSize:"48px", marginBottom:"16px" },
  taglineMain: { fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:"28px", color:"#fff", lineHeight:1.3, marginBottom:"16px" },
  taglineSub: { fontSize:"13px", color:"rgba(255,255,255,0.7)", lineHeight:1.6, marginBottom:"24px" },
  dots: { display:"flex", flexWrap:"wrap", gap:"8px", justifyContent:"center" },
  dotChip: { padding:"5px 12px", borderRadius:"20px", background:"rgba(255,255,255,0.15)", fontSize:"11px", color:"rgba(255,255,255,0.9)", fontWeight:500 },
};

export default Login;
