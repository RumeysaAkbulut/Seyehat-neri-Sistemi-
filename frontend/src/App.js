import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  const [sayfa, setSayfa] = useState("login");

  return (
    <div>
      {sayfa === "login" 
        ? <Login onSwitch={() => setSayfa("register")} />
        : <Register onSwitch={() => setSayfa("login")} />
      }
    </div>
  );
}

export default App;
