import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

const links = [
  { to: "/", label: "Ana Sayfa", icon: "🏠" },
  { to: "/places", label: "Mekanlar", icon: "📍" },
  { to: "/map", label: "Harita", icon: "🗺️" },
  { to: "/routes", label: "Rotalarım", icon: "🛤️" },
  { to: "/collections", label: "Koleksiyonlar", icon: "📚" },
  { to: "/ai", label: "AI Rota", icon: "✨" },
  { to: "/profile", label: "Profil", icon: "👤" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };
  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <nav style={s.nav}>
      <div style={s.brand}>
        <span style={s.brandIcon}>✈️</span>
        <span style={s.brandText}>Seyahat</span>
      </div>
      <div style={s.links}>
        {links.map(l => (
          <Link key={l.to} to={l.to} style={{
            ...s.link,
            ...(location.pathname === l.to ? s.active : {})
          }}>
            <span>{l.icon}</span> {l.label}
          </Link>
        ))}
      </div>
      <div style={s.right}>
        <div style={s.avatar}>{initial}</div>
        <span style={s.userName}>{user?.name?.split(" ")[0]}</span>
        <button style={s.logoutBtn} onClick={handleLogout}>Çıkış</button>
      </div>
    </nav>
  );
}

const s = {
  nav: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 2rem", height:"58px", background:t.bgCard, borderBottom:`1px solid ${t.border}`, position:"sticky", top:0, zIndex:100, boxShadow:t.shadow },
  brand: { display:"flex", alignItems:"center", gap:"8px" },
  brandIcon: { fontSize:"20px" },
  brandText: { fontWeight:800, fontSize:"16px", color:t.primary, fontFamily:"system-ui", letterSpacing:"-0.3px", textDecoration:"none" },
  links: { display:"flex", gap:"2px" },
  link: { display:"flex", alignItems:"center", gap:"5px", padding:"7px 14px", borderRadius:"10px", fontSize:"13px", fontWeight:500, color:t.textMuted, textDecoration:"none" },
  active: { background:t.primaryLight, color:t.primary },
  right: { display:"flex", alignItems:"center", gap:"10px" },
  avatar: { width:"30px", height:"30px", borderRadius:"50%", background:t.gradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, color:"#fff" },
  userName: { fontSize:"13px", color:t.textMuted, fontWeight:500 },
  logoutBtn: { padding:"6px 14px", borderRadius:"9px", border:`1px solid ${t.border}`, background:"transparent", color:t.textMuted, fontSize:"12px", cursor:"pointer", fontWeight:500 },
};
