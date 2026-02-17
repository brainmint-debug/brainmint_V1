import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname.startsWith(path)
      ? "bg-blue-100 text-blue-700"
      : "text-gray-700";

  return (
    <aside className="w-72 bg-white shadow-xl p-6 h-full">
      <h1 className="text-2xl font-bold mb-6">Team Workspace</h1>

      <nav className="flex flex-col gap-2 text-[17px] font-medium">
        <Link to="/" className={`px-3 py-2 rounded-lg ${isActive("/")}`}>
          Dashboard
        </Link>

        <Link to="/backlog" className={`px-3 py-2 rounded-lg ${isActive("/backlog")}`}>
          Backlog
        </Link>

        <Link to="/sprints" className={`px-3 py-2 rounded-lg ${isActive("/sprints")}`}>
          Active Sprints
        </Link>

        <Link to="/report" className={`px-3 py-2 rounded-lg ${isActive("/report")}`}>
          Report
        </Link>

        <Link to="/settings" className={`px-3 py-2 rounded-lg ${isActive("/settings")}`}>
          Settings
        </Link>
      </nav>
    </aside>
  );
}
