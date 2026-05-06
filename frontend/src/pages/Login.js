import { useState } from "react";
import axios from "axios";

function Login({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mesaj, setMesaj] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5001/api/users/login", {
        email,
        password,
      });
      setMesaj("✅ " + res.data.message);
    } catch (err) {
      setMesaj("❌ " + err.response?.data?.error || "Hata oluştu");
    }
  };

  return (
    <div style={styles.container}>
      <h2>Giriş Yap</h2>
      <input style={styles.input} placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} />
      <input style={styles.input} placeholder="Şifre" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button style={styles.button} onClick={handleLogin}>Giriş Yap</button>
      {mesaj && <p>{mesaj}</p>}
      <p>Hesabın yok mu? <span style={styles.link} onClick={onSwitch}>Kayıt Ol</span></p>
    </div>
  );
}

const styles = {
  container: { maxWidth: 400, margin: "100px auto", padding: 30, boxShadow: "0 0 10px #ccc", borderRadius: 10, textAlign: "center" },
  input: { display: "block", width: "100%", margin: "10px 0", padding: 10, fontSize: 16, borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box" },
  button: { width: "100%", padding: 10, backgroundColor: "#4A90E2", color: "white", border: "none", borderRadius: 6, fontSize: 16, cursor: "pointer" },
  link: { color: "#4A90E2", cursor: "pointer" }
};

export default Login;
