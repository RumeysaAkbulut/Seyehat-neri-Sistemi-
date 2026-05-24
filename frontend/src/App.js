import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Places from "./pages/Places";
import MapPage from "./pages/MapPage";
import AIRecommend from "./pages/AIRecommend";
import Profile from "./pages/Profile";
import PlaceDetail from "./pages/PlaceDetail";
import RoutesList from "./pages/Routes";
import Navbar from "./components/Navbar";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <BrowserRouter>
      {token && <Navbar />}
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to="/" /> : <Register />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/places" element={<PrivateRoute><Places /></PrivateRoute>} />
        <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
        <Route path="/ai" element={<PrivateRoute><AIRecommend /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/places/:id" element={<PrivateRoute><PlaceDetail /></PrivateRoute>} />
        <Route path="/routes" element={<PrivateRoute><RoutesList /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
