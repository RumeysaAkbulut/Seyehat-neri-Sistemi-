import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, token, login } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [mesaj, setMesaj] = useState(null);
  const [loading, setLoading] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const handleSave = async () => {
    if (newPassword && newPassword !== newPasswordConfirm) {
      setMesaj({ type: "error", text: "Yeni şifreler eşleşmiyor." });
      return;
    }
    setLoading(true);
    setMesaj(null);
    try {
      const payload = { name };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      const res = await axios.put("http://localhost:5001/api/users/me", payload, authHeader);
      login(res.data.user, token);
      setMesaj({ type: "success", text: "Profil başarıyla güncellendi." });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (e) {
      setMesaj({ type: "error", text: e.response?.data?.error || "Bir hata oluştu." });
    } finally {
      setLoading(false);
    }
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Avatar & başlık */}
        <div style={s.heroCard}>
          <div style={s.avatar}>{initial}</div>
          <div style={s.heroName}>{user?.name}</div>
          <div style={s.heroEmail}>{user?.email}</div>
          <div style={s.heroBadge}>Seyahat Tutkunu</div>
        </div>

        {/* Bilgi güncelleme */}
        <div style={s.card}>
          <div style={s.cardTitle}>Profil Bilgileri</div>

          <div style={s.field}>
            <label style={s.label}>Ad Soyad</label>
            <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad" />
          </div>

          <div style={s.field}>
            <label style={s.label}>E-posta</label>
            <input style={{...s.input, ...s.inputDisabled}} value={user?.email || ""} disabled />
            <span style={s.hint}>E-posta adresi değiştirilemez.</span>
          </div>

          <div style={s.field}>
            <label style={s.label}>Üyelik Tarihi</label>
            <input style={{...s.input, ...s.inputDisabled}} value={user?.created_at ? new Date(user.created_at).toLocaleDateString("tr-TR") : ""} disabled />
          </div>
        </div>

        {/* Şifre güncelleme */}
        <div style={s.card}>
          <div style={s.cardTitle}>Şifre Değiştir</div>
          <div style={s.cardSub}>Şifreni değiştirmek istemiyorsan bu alanları boş bırak.</div>

          <div style={s.field}>
            <label style={s.label}>Mevcut Şifre</label>
            <input style={s.input} type="password" placeholder="••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>

          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Yeni Şifre</label>
              <input style={s.input} type="password" placeholder="••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Yeni Şifre (Tekrar)</label>
              <input style={s.input} type="password" placeholder="••••••" value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} />
            </div>
          </div>
        </div>

        {mesaj && (
          <div style={{ ...s.mesaj, ...(mesaj.type === "success" ? s.mesajSuccess : s.mesajError) }}>
            {mesaj.type === "success" ? "✅ " : "❌ "}{mesaj.text}
          </div>
        )}

        <button style={{...s.btn, ...(loading ? s.btnDisabled : {})}} onClick={handleSave} disabled={loading}>
          {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>

      </div>
    </div>
  );
}

const s = {
  page: { minHeight:"calc(100vh - 58px)", background:"#f2f8f5", fontFamily:"system-ui,sans-serif", padding:"2.5rem 1.5rem", display:"flex", justifyContent:"center" },
  container: { width:"100%", maxWidth:"560px", display:"flex", flexDirection:"column", gap:"1.25rem" },
  heroCard: { background:"linear-gradient(135deg,#0f6e56,#1d9e75)", borderRadius:"20px", padding:"2.5rem", display:"flex", flexDirection:"column", alignItems:"center", gap:"8px" },
  avatar: { width:"72px", height:"72px", borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"30px", fontWeight:700, color:"#fff", border:"3px solid rgba(255,255,255,0.4)", marginBottom:"4px" },
  heroName: { fontSize:"20px", fontWeight:700, color:"#fff" },
  heroEmail: { fontSize:"13px", color:"rgba(255,255,255,0.75)" },
  heroBadge: { marginTop:"6px", padding:"4px 14px", borderRadius:"20px", background:"rgba(255,255,255,0.15)", fontSize:"12px", color:"#e1f5ee", fontWeight:500 },
  card: { background:"#fff", borderRadius:"16px", border:"1px solid #e1f0e8", padding:"1.75rem" },
  cardTitle: { fontSize:"15px", fontWeight:700, color:"#1a2e25", marginBottom:"4px" },
  cardSub: { fontSize:"12px", color:"#4a7a62", marginBottom:"1.25rem" },
  field: { display:"flex", flexDirection:"column", gap:"6px", marginBottom:"1rem" },
  label: { fontSize:"12px", fontWeight:600, color:"#4a7a62", textTransform:"uppercase", letterSpacing:"0.4px" },
  input: { padding:"10px 14px", borderRadius:"10px", border:"1px solid #a8d4bc", fontSize:"14px", color:"#1a2e25", background:"#f5faf7", outline:"none", boxSizing:"border-box", width:"100%" },
  inputDisabled: { background:"#eef6f2", color:"#7a9e8e", cursor:"not-allowed" },
  hint: { fontSize:"11px", color:"#7a9e8e" },
  row2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" },
  mesaj: { padding:"12px 16px", borderRadius:"12px", fontSize:"13px", fontWeight:500 },
  mesajSuccess: { background:"#e6f7f0", color:"#0f6e56", border:"1px solid #a8d4bc" },
  mesajError: { background:"#fef2f2", color:"#dc2626", border:"1px solid #fca5a5" },
  btn: { width:"100%", padding:"13px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#0f6e56,#1d9e75)", color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer" },
  btnDisabled: { opacity:0.6, cursor:"not-allowed" },
};
