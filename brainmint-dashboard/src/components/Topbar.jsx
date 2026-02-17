import React from "react";
import { Search, Bell, User } from "lucide-react";

export default function Topbar() {
  return (
    <div className="flex items-center justify-between bg-white shadow p-4">
      <div className="flex items-center bg-gray-100 px-3 py-2 rounded-xl gap-2">
        <Search className="text-gray-500" />
        <input
          type="text"
          placeholder="Searchs..."
          className="bg-transparent outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <Bell className="text-gray-600" />
        <User className="text-gray-600" />
      </div>
    </div>
  );
}
