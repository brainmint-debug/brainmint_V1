import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Dashboard from "./pages/Dashboard";
import Backlog from "./pages/Backlog";
import ActiveSprints from "./pages/ActiveSprints";
import Report from "./pages/Report";
import Settings from "./pages/settings/settings";


export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (userData) => {
    console.log("✅ User logged in:", userData);
    setUser(userData);
    navigate("/dashboard");
  };

  const handleSignup = (userData) => {
    console.log("✅ User signed up:", userData);
    setUser(userData);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    console.log("👋 User logged out");
    setUser(null);
    navigate("/login");
  };

  const publicRoutes = ["/", "/login", "/signup"];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  if (!user && !isPublicRoute) {
    return <Navigate to="/login" />;
  }

  if (user && isPublicRoute) {
    return <Navigate to="/dashboard" />;
  }

  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/" element={<Signup onSignup={handleSignup} />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/signup" element={<Signup onSignup={handleSignup} />} />
      </Routes>
    );
  }

  return (
    <div className="flex w-full h-screen bg-gray-50">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <Topbar user={user} onLogout={handleLogout} />

        <div className="p-6 overflow-auto h-full">
          <Routes>
            <Route path="/dashboard" element={<Dashboard user={user} onLogout={handleLogout} />} />
            <Route path="/backlog" element={<Backlog user={user} />} />
            <Route path="/sprints" element={<ActiveSprints user={user} />} />
            <Route path="/report" element={<Report user={user} />} />
            <Route path="/settings/*" element={<Settings user={user} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}