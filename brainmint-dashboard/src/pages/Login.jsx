import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.email || !form.password) {
      setError("Please fill all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      
      console.log("🔍 Full login response from backend:", JSON.stringify(data, null, 2));
      console.log("👤 data.user value:", data.user);
      console.log("📊 data.user type:", typeof data.user);
      console.log("🔢 Is array?", Array.isArray(data.user));
      
      // If array, show each element
      if (Array.isArray(data.user)) {
        console.log("📋 Array contents:");
        data.user.forEach((item, index) => {
          console.log(`  [${index}]: ${item} (type: ${typeof item})`);
        });
      }

      if (data.user) {
        let user;
        
        // Handle array response: [id, name]
        if (Array.isArray(data.user)) {
          console.log("✅ Backend returned ARRAY");
          user = {
            id: data.user[0],
            name: data.user[1],
            email: form.email
          };
        } 
        // Handle object response: {id: 1, full_name: "Name"}
        else if (typeof data.user === 'object') {
          console.log("✅ Backend returned OBJECT");
          user = {
            id: data.user.id || data.user[0],
            name: data.user.full_name || data.user.name || data.user[1],
            email: form.email
          };
        }
        // Fallback - just use email
        else {
          console.error("❌ Unexpected user format:", data.user);
          setError("Invalid user data format from server");
          return;
        }
        
        console.log("✅ Final user object created:", JSON.stringify(user, null, 2));
        console.log("🔑 User ID:", user.id);
        console.log("👤 User name:", user.name);
        
        // Call onLogin to update App state (no localStorage)
        if (onLogin) {
          onLogin(user);
        }
        
        // Navigate will happen automatically via App.jsx
        navigate("/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      submit();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">

        {/* Header */}
        <h2 className="text-3xl font-bold text-gray-900 text-center">
          Welcome Back
        </h2>
        <p className="text-sm text-gray-500 text-center mt-2">
          Login to continue to BrainMint
        </p>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
        </div>

        {/* Login Button */}
        <button
          onClick={submit}
          disabled={isLoading}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Login
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="px-3 text-sm text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Signup Button */}
        <button
          onClick={() => navigate("/")}
          disabled={isLoading}
          className="w-full border border-gray-300 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create a new account
        </button>
      </div>
    </div>
  );
}