import API_URL from '../api';
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import RoutesTab from "./Routes";
import CollectionsTab from "./Collections";

const API = `${API_URL}`;

const TABS = [
  { key: "profile",     label: "Profil" },
  { key: "routes",      label: "Rotalarım" },
  { key: "collections", label: "Koleksiyonlar" },
];

export default function Profile() {
  const { user, token, login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab from URL param, default → "profile"
  const activeTab = TABS.some(t => t.key === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "profile";

  const setTab = (key) => setSearchParams(key === "profile" ? {} : { tab: key });

  // --- Profile form state ---
  const [name, setName]                         = useState(user?.name || "");
  const [currentPassword, setCurrentPassword]   = useState("");
  const [newPassword, setNewPassword]           = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [mesaj, setMesaj]                       = useState(null);
  const [loading, setLoading]                   = useState(false);

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
        payload.new_password     = newPassword;
      }
      const res = await axios.put(`${API}/api/users/me`, payload, authHeader);
      login(res.data.user, token);
      setMesaj({ type: "success", text: "Profil başarıyla güncellendi." });
      setCurrentPassword(""); setNewPassword(""); setNewPasswordConfirm("");
    } catch (e) {
      setMesaj({ type: "error", text: e.response?.data?.error || "Bir hata oluştu." });
    } finally {
      setLoading(false);
    }
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div style={s.page}>
      {/* ── Hero header ── */}
      <div style={s.heroCard}>
        <div style={s.avatar}>{initial}</div>
        <div style={s.heroName}>{user?.name}</div>
        <div style={s.heroEmail}>{user?.email}</div>
        <div style={s.heroBadge}>Seyahat Tutkunu</div>
      </div>

      {/* ── Tab bar ── */}
      <div style={s.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            style={{ ...s.tabBtn, ...(activeTab === tab.key ? s.tabActive : {}) }}
            onClick={() => setTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={s.tabContent}>

        {/* ── PROFIL SEKMESİ ── */}
        {activeTab === "profile" && (
          <div style={s.formWrap}>

            <div style={s.card}>
              <div style={s.cardTitle}>Profil Bilgileri</div>

              <div style={s.field}>
                <label style={s.label}>Ad Soyad</label>
                <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad" />
              </div>

              <div style={s.field}>
                <label style={s.label}>E-posta</label>
                <input style={{ ...s.input, ...s.inputDisabled }} value={user?.email || ""} disabled />
                <span style={s.hint}>E-posta adresi değiştirilemez.</span>
              </div>

              <div style={s.field}>
                <label style={s.label}>Üyelik Tarihi</label>
                <input
                  style={{ ...s.input, ...s.inputDisabled }}
                  value={user?.created_at ? new Date(user.created_at).toLocaleDateString("tr-TR") : ""}
                  disabled
                />
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Şifre Değiştir</div>
              <div style={s.cardSub}>Şifreni değiştirmek istemiyorsan bu alanları boş bırak.</div>

              <div style={s.field}>
                <label style={s.label}>Mevcut Şifre</label>
                <input style={s.input} type="password" placeholder="••••••"
                  value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              </div>

              <div style={s.row2}>
                <div style={s.field}>
                  <label style={s.label}>Yeni Şifre</label>
                  <input style={s.input} type="password" placeholder="••••••"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Yeni Şifre (Tekrar)</label>
                  <input style={s.input} type="password" placeholder="••••••"
                    value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} />
                </div>
              </div>
            </div>

            {mesaj && (
              <div style={{ ...s.mesaj, ...(mesaj.type === "success" ? s.mesajSuccess : s.mesajError) }}>
                {mesaj.type === "success" ? "✅ " : "❌ "}{mesaj.text}
              </div>
            )}

            <button
              style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        )}

        {/* ── ROTALARIM SEKMESİ ── */}
        {activeTab === "routes" && <RoutesTab />}

        {/* ── KOLEKSİYONLAR SEKMESİ ── */}
        {activeTab === "collections" && <CollectionsTab />}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "calc(100vh - 58px)", background: "#f2f8f5", fontFamily: "system-ui,sans-serif" },

  /* Hero */
  heroCard: { background: "linear-gradient(135deg,#0f6e56,#1d9e75)", padding: "2.5rem 2rem 1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" },
  avatar:   { width: "72px", height: "72px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: 700, color: "#fff", border: "3px solid rgba(255,255,255,0.4)", marginBottom: "4px" },
  heroName:  { fontSize: "20px", fontWeight: 700, color: "#fff" },
  heroEmail: { fontSize: "13px", color: "rgba(255,255,255,0.75)" },
  heroBadge: { marginTop: "6px", padding: "4px 14px", borderRadius: "20px", background: "rgba(255,255,255,0.15)", fontSize: "12px", color: "#e1f5ee", fontWeight: 500 },

  /* Tab bar */
  tabBar: { display: "flex", gap: "4px", background: "#fff", padding: "0.75rem 2rem", borderBottom: "1px solid #e1f0e8", position: "sticky", top: "58px", zIndex: 50 },
  tabBtn:  { display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px", borderRadius: "10px", border: "none", background: "transparent", fontSize: "13px", fontWeight: 600, color: "#4a7a62", cursor: "pointer", transition: "all 0.15s" },
  tabActive: { background: "#e6f7f0", color: "#0f6e56" },

  /* Tab content wrapper */
  tabContent: { padding: "0" },   /* child components handle their own padding */

  /* Profile form */
  formWrap:  { display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "560px", margin: "2rem auto", padding: "0 1.5rem 2rem" },
  card:      { background: "#fff", borderRadius: "16px", border: "1px solid #e1f0e8", padding: "1.75rem" },
  cardTitle: { fontSize: "15px", fontWeight: 700, color: "#1a2e25", marginBottom: "4px" },
  cardSub:   { fontSize: "12px", color: "#4a7a62", marginBottom: "1.25rem" },
  field:     { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" },
  label:     { fontSize: "12px", fontWeight: 600, color: "#4a7a62", textTransform: "uppercase", letterSpacing: "0.4px" },
  input:     { padding: "10px 14px", borderRadius: "10px", border: "1px solid #a8d4bc", fontSize: "14px", color: "#1a2e25", background: "#f5faf7", outline: "none", boxSizing: "border-box", width: "100%" },
  inputDisabled: { background: "#eef6f2", color: "#7a9e8e", cursor: "not-allowed" },
  hint:      { fontSize: "11px", color: "#7a9e8e" },
  row2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  mesaj:     { padding: "12px 16px", borderRadius: "12px", fontSize: "13px", fontWeight: 500 },
  mesajSuccess: { background: "#e6f7f0", color: "#0f6e56", border: "1px solid #a8d4bc" },
  mesajError:   { background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" },
  btn:       { width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#0f6e56,#1d9e75)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
};
