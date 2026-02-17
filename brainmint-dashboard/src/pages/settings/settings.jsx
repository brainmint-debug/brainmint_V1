import React from "react";
import { Link, Routes, Route, useLocation, Navigate } from "react-router-dom";

import Summary from "./Summary";
import Timeline from "./Timeline";
import Board from "./Board";
import Calendar from "./Calendar";
import List from "./List";
import Forms from "./Forms";
import AllWork from "./AllWork";
import Code from "./Code";
import Archived from "./Archived";
import Pages from "./Pages";
import Shortcuts from "./Shortcuts";
import SprintReportDashboard from "../Report"; // Go up one level to pages folder

export default function Settings({ user }) {
  console.log("⚙️ Settings received user:", user);
  
  const tabs = [
    "summary", "timeline", "board", "calendar", "list",
    "forms", "allwork", "code", "archived", "pages", "shortcuts", "retrospective"
  ];

  const location = useLocation();

  return (
    <div className="w-full h-screen flex flex-col font-sans">
      
      {/* Tabs */}
      <div className="flex gap-6 border-b px-6 pt-4 overflow-x-auto pb-2 flex-shrink-0">
        {tabs.map((tab) => (
          <Link
            key={tab}
            to={`/settings/${tab}`}
            className={`capitalize pb-2 whitespace-nowrap ${
              location.pathname.includes(tab)
                ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600 transition-colors"
            }`}
          >
            {tab}
          </Link>
        ))}
      </div>

      {/* Render tab content */}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route index element={<Navigate to="summary" replace />} />

          <Route path="summary" element={<Summary user={user} />} />
          <Route path="timeline" element={<Timeline user={user} />} />
          <Route path="board" element={<Board user={user} />} />
          <Route path="calendar" element={<Calendar user={user} />} />
          <Route path="list" element={<List user={user} />} />
          <Route path="forms" element={<Forms user={user} />} />
          <Route path="allwork" element={<AllWork user={user} />} />
          <Route path="code" element={<Code user={user} />} />
          <Route path="archived" element={<Archived user={user} />} />
          <Route path="pages" element={<Pages user={user} />} />
          <Route path="shortcuts" element={<Shortcuts user={user} />} />
          <Route path="retrospective" element={<SprintReportDashboard user={user} />} />
        </Routes>
      </div>
    </div>
  );
}