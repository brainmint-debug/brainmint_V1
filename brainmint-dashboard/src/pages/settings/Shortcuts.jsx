// FILE: src/pages/settings/Shortcuts.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SHORTCUTS = [
  { key: "N", name: "New Task", description: "Navigate to the Create Task form", category: "Navigation" },
  { key: "B", name: "Go to Backlog", description: "Jump to the Product Backlog", category: "Navigation" },
  { key: "D", name: "Go to Dashboard", description: "Jump to the Dashboard", category: "Navigation" },
  { key: "S", name: "Go to Sprints", description: "Jump to Active Sprints", category: "Navigation" },
  { key: "R", name: "Go to Report", description: "Jump to Sprint Report", category: "Navigation" },
  { key: "?", name: "View Shortcuts", description: "Open this shortcuts page", category: "Navigation" },
  { key: "/", name: "Focus Search", description: "Focus the search bar in the top bar", category: "Actions" },
  { key: "Q", name: "Quick Create", description: "Open the quick-create task modal", category: "Actions" },
];

export default function Shortcuts() {
  const [lastKey, setLastKey] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;

      const match = SHORTCUTS.find((s) => s.key.toLowerCase() === e.key.toLowerCase());
      if (!match) return;

      e.preventDefault();
      setLastKey(match.key);
      setTimeout(() => setLastKey(null), 800);

      switch (e.key.toLowerCase()) {
        case "n": navigate("/settings/forms"); break;
        case "b": navigate("/backlog"); break;
        case "d": navigate("/dashboard"); break;
        case "s": navigate("/sprints"); break;
        case "r": navigate("/report"); break;
        case "?": navigate("/settings/shortcuts"); break;
        default: break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const categories = [...new Set(SHORTCUTS.map((s) => s.category))];

  return (
    <div className="p-6 w-full max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Keyboard Shortcuts</h1>
      <p className="text-sm text-gray-500 mb-6">
        Use these shortcuts to navigate faster. Disabled when typing in inputs.
      </p>

      {/* Live indicator */}
      {lastKey && (
        <div className="mb-4 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-sm text-indigo-700 font-medium">
          <kbd className="bg-white border border-indigo-300 rounded px-2 py-0.5 font-mono text-indigo-600">
            {lastKey}
          </kbd>
          triggered — {SHORTCUTS.find((s) => s.key === lastKey)?.name}
        </div>
      )}

      {categories.map((category) => (
        <div key={category} className="mb-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
            {category}
          </div>
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {SHORTCUTS.filter((s) => s.category === category).map((s, i, arr) => (
              <div
                key={s.key}
                className={`flex items-center justify-between px-5 py-3 transition ${
                  lastKey === s.key ? "bg-indigo-50" : "hover:bg-gray-50"
                } ${i < arr.length - 1 ? "border-b" : ""}`}
              >
                <div>
                  <div className="font-medium text-gray-800 text-sm">{s.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>
                </div>
                <kbd
                  className={`text-sm font-mono font-semibold px-3 py-1.5 rounded-lg border transition ${
                    lastKey === s.key
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <div className="font-semibold mb-1">💡 Tips</div>
        <ul className="space-y-1 text-xs list-disc list-inside">
          <li>Shortcuts only work when you're not typing in a text field</li>
          <li>Press <kbd className="bg-white border rounded px-1 font-mono">/</kbd> and <kbd className="bg-white border rounded px-1 font-mono">Q</kbd> work only if wired up in your Topbar</li>
          <li>Press <kbd className="bg-white border rounded px-1 font-mono">?</kbd> to come back to this page anytime</li>
        </ul>
      </div>
    </div>
  );
}