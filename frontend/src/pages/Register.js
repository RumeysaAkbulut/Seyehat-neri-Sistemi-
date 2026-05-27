import API_URL from '../api';
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mesaj, setMesaj] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/users/register`, { name, email, password });
      login(res.data.user, res.data.token);
      navigate("/");
    } catch (err) {
      setMesaj("❌ " + (err.response?.data?.error || "Hata oluştu"));
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleRegister(); };

  return (
    <div style={s.page}>
      <div style={s.wrapper}>
        <div style={s.right}>
          <div style={s.rightInner}>
            <div style={s.taglineIcon}>🗺️</div>
            <div style={s.taglineMain}>Seyahat<br />hayallerin<br />burada başlar</div>
            <div style={s.taglineSub}>Kişiselleştirilmiş gezi rotaları ve interaktif harita ile yeni yerler keşfet.</div>
            <div style={s.dots}>
              {["Ücretsiz", "AI Destekli", "İnteraktif Harita", "Kolay Plan"].map(c => (
                <span key={c} style={s.dotChip}>{c}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={s.left}>
          <div style={s.logo}>✈️ <span style={s.logoText}>Seyahat</span></div>
          <div style={s.header}>
            <div style={s.title}>Hesap Oluştur</div>
            <div style={s.sub}>Hemen ücretsiz kayıt ol, keşfetmeye başla</div>
          </div>
          <div style={s.tabRow}>
            <Link to="/login" style={{...s.tab, ...s.tabInactive, textDecoration:"none"}}>Giriş Yap</Link>
            <div style={{...s.tab, ...s.tabActive}}>Kayıt Ol</div>
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Ad Soyad</label>
            <input style={s.input} type="text" placeholder="Adın Soyadın" value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKey} />
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>E-posta</label>
            <input style={s.input} type="email" placeholder="ornek@gmail.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey} />
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Şifre</label>
            <input style={s.input} type="password" placeholder="En az 6 karakter" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} />
          </div>
          <button style={s.btn} onClick={handleRegister}>Kayıt Ol →</button>
          {mesaj && <p style={s.mesaj}>{mesaj}</p>}
          <div style={s.switchText}>Zaten hesabın var mı? <Link to="/login" style={s.link}>Giriş Yap</Link></div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem", background:t.bg, fontFamily:"system-ui,sans-serif" },
  wrapper: { display:"grid", gridTemplateColumns:"1fr 1fr", maxWidth:"820px", width:"100%", borderRadius:"24px", overflow:"hidden", boxShadow:"0 20px 60px rgba(15,110,86,0.14)", background:"#fff" },
  left: { padding:"3rem 2.5rem", display:"flex", flexDirection:"column", justifyContent:"center" },
  right: { background:t.gradientHero, display:"flex", alignItems:"center", justifyContent:"center", padding:"3rem" },
  rightInner: { textAlign:"center" },
  logo: { display:"flex", alignItems:"center", gap:"8px", marginBottom:"2rem", fontSize:"18px", fontWeight:800, color:t.primary },
  logoText: { fontSize:"16px" },
  header: { marginBottom:"1.75rem" },
  title: { fontSize:"24px", fontWeight:700, color:t.text },
  sub: { fontSize:"13px", color:t.textMuted, marginTop:"6px" },
  tabRow: { display:"flex", gap:"4px", background:t.bg, borderRadius:"12px", padding:"4px", marginBottom:"1.75rem" },
  tab: { flex:1, textAlign:"center", padding:"9px", borderRadius:"9px", fontSize:"13px", cursor:"pointer" },
  tabActive: { background:"#fff", color:t.primary, fontWeight:600, boxShadow:t.shadow },
  tabInactive: { color:t.textMuted },
  formGroup: { marginBottom:"1rem" },
  label: { fontSize:"12px", color:t.textMuted, display:"block", marginBottom:"6px", fontWeight:600 },
  input: { width:"100%", background:"#f5faf7", border:`1.5px solid ${t.border}`, borderRadius:"10px", padding:"11px 14px", color:t.text, fontSize:"14px", outline:"none", boxSizing:"border-box" },
  btn: { width:"100%", padding:"13px", borderRadius:"12px", border:"none", fontSize:"14px", fontWeight:600, cursor:"pointer", marginTop:"0.5rem", background:t.gradient, color:"#fff" },
  mesaj: { textAlign:"center", marginTop:"0.75rem", fontSize:"13px", color:t.error },
  switchText: { textAlign:"center", marginTop:"1.25rem", fontSize:"12px", color:t.textMuted },
  link: { color:t.primary, fontWeight:600, textDecoration:"none" },
  taglineIcon: { fontSize:"48px", marginBottom:"16px" },
  taglineMain: { fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:"28px", color:"#fff", lineHeight:1.3, marginBottom:"16px" },
  taglineSub: { fontSize:"13px", color:"rgba(255,255,255,0.7)", lineHeight:1.6, marginBottom:"24px" },
  dots: { display:"flex", flexWrap:"wrap", gap:"8px", justifyContent:"center" },
  dotChip: { padding:"5px 12px", borderRadius:"20px", background:"rgba(255,255,255,0.15)", fontSize:"11px", color:"rgba(255,255,255,0.9)", fontWeight:500 },
};

export default Register;
