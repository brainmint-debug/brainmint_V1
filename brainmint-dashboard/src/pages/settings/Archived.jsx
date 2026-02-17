// FILE: src/pages/settings/Archived.jsx
import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000/api";

const STATUS_LABELS = {
  todo: "To Do",
  progress: "In Progress",
  review: "Review",
  done: "Done",
};

const STATUS_COLORS = {
  todo: "bg-gray-100 text-gray-600",
  progress: "bg-blue-100 text-blue-600",
  review: "bg-purple-100 text-purple-600",
  done: "bg-green-100 text-green-600",
};

export default function Archived({ user }) {
  const userId = user?.id || null;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!userId) return;
    fetchArchived();
  }, [userId]);

  const fetchArchived = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/tasks/archived/?user_id=${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/unarchive/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Remove from list — it goes back to its original column
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert("Failed to unarchive: " + err.message);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Permanently delete this task?")) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/delete/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.sprint_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getPriorityStyle = (priority) => {
    if (priority === "High") return "bg-red-100 text-red-600";
    if (priority === "Medium") return "bg-orange-100 text-orange-600";
    return "bg-blue-100 text-blue-600";
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: 14, color: "#202124", backgroundColor: "#fff", minHeight: "100vh" }}>
      <main style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontWeight: 600, fontSize: 24, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            Archived
          </h1>
          <span style={{ fontSize: 13, color: "#5f6368", background: "#f1f3f4", borderRadius: 12, padding: "2px 10px" }}>
            {tasks.length} item{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            style={{ border: "1px solid #dadce0", borderRadius: 8, padding: "8px 14px", width: "100%", maxWidth: 360, fontSize: 14, outline: "none" }}
            placeholder="Search archived items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: "#c5221f", background: "#fce8e6", border: "1px solid #f5c6c4", borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: "center", color: "#5f6368", padding: "60px 0" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260, marginTop: 40, color: "#5f6368", textAlign: "center", userSelect: "none" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14 }} viewBox="0 0 24 24">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>No archived work items</div>
            <div style={{ maxWidth: 320, lineHeight: 1.5 }}>
              Archived work items will appear here. Archive items to keep your project organized while still retaining access to older data.
            </div>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, overflow: "hidden" }}>
            {filtered.map((task, i) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderBottom: i < filtered.length - 1 ? "1px solid #f1f3f4" : "none",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, textDecoration: "line-through", color: "#5f6368", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#9aa0a6" }}>
                    {task.sprint_name ? `Sprint: ${task.sprint_name}` : "No Sprint"}
                    {task.due_date ? ` • Due ${task.due_date}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {/* Priority */}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                  </span>

                  {/* Restore destination badge */}
                  {task.previous_status && (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[task.previous_status] || "bg-gray-100 text-gray-600"}`}
                      title="Will be restored to this column"
                    >
                      → {STATUS_LABELS[task.previous_status] || task.previous_status}
                    </span>
                  )}

                  {/* Unarchive */}
                  <button
                    onClick={() => handleUnarchive(task.id)}
                    style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "1px solid #dadce0", background: "#f8f9fa", cursor: "pointer", color: "#1a73e8", fontWeight: 500 }}
                    title={`Restore to ${STATUS_LABELS[task.previous_status] || "To Do"}`}
                  >
                    Unarchive
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(task.id)}
                    style={{ fontSize: 18, lineHeight: 1, background: "none", border: "none", cursor: "pointer", color: "#dadce0" }}
                    onMouseOver={(e) => (e.target.style.color = "#c5221f")}
                    onMouseOut={(e) => (e.target.style.color = "#dadce0")}
                    title="Delete permanently"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}