import React, { useState, useEffect, useMemo } from "react";

const API_BASE_URL = "http://localhost:8000/api";

// ── Status config ────────────────────────────────────────────────
const STATUS_CONFIG = {
  todo:     { label: "TO DO",      bg: "#E7E9EC", color: "#3b82f6" },
  progress: { label: "IN PROGRESS",bg: "#dbeafe", color: "#1d4ed8" },
  review:   { label: "REVIEW",     bg: "#ede9fe", color: "#7c3aed" },
  done:     { label: "DONE",       bg: "#dcfce7", color: "#16a34a" },
};

const PRIORITY_ICON = {
  High:   { icon: "▲", color: "#ef4444" },
  Medium: { icon: "■", color: "#f59e0b" },
  Low:    { icon: "▼", color: "#22c55e" },
};

// ── Sub-components (matching original style exactly) ─────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  return (
    <div style={{
      backgroundColor: cfg.bg,
      color: cfg.color,
      fontWeight: 600,
      fontSize: 11,
      borderRadius: 12,
      padding: "2px 8px",
      whiteSpace: "nowrap",
      display: "inline-block",
      textAlign: "center",
    }}>
      {cfg.label}
    </div>
  );
};

const Avatar = ({ initials, size = 26 }) => (
  <div style={{
    width: size,
    height: size,
    borderRadius: "50%",
    backgroundColor: "#2563EB",
    color: "white",
    fontWeight: 600,
    fontSize: size * 0.45,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  }}>
    {initials}
  </div>
);

// ── Create Task Modal ─────────────────────────────────────────────
function CreateModal({ onClose, onCreated, user, sprints }) {
  const [title,    setTitle]    = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status,   setStatus]   = useState("todo");
  const [dueDate,  setDueDate]  = useState("");
  const [sprintId, setSprintId] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const userId = Array.isArray(user) ? user[0] : user?.id;
      const res = await fetch(`${API_BASE_URL}/tasks/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title: title.trim(),
          priority,
          status,
          due_date: dueDate || "",
          subtasks_total: 0,
          sprint_id: sprintId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");
      onCreated({ ...data.task, status });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.25)",
        zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: 24,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create Task</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>×</button>
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Title *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="What needs to be done?"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}>
                <option value="todo">To Do</option>
                <option value="progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Sprint</label>
              <select value={sprintId} onChange={e => setSprintId(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}>
                <option value="">No Sprint</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 600, color: "#374151" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: saving ? "#9ca3af" : "#1a73e8", color: "#fff", fontSize: 14, cursor: saving ? "not-allowed" : "pointer", fontWeight: 600 }}>
            {saving ? "Creating…" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function ListView({ user }) {
  const [tasks,       setTasks]       = useState([]);
  const [sprints,     setSprints]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [groupBy,     setGroupBy]     = useState("none");
  const [filterStatus,setFilterStatus]= useState("all");
  const [filterPrio,  setFilterPrio]  = useState("all");
  const [showCreate,  setShowCreate]  = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    const userId = Array.isArray(user) ? user[0] : user?.id;
    if (!userId) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      try {
        const [taskRes, sprintRes] = await Promise.all([
          fetch(`${API_BASE_URL}/tasks/?user_id=${userId}`),
          fetch(`${API_BASE_URL}/sprints/?user_id=${userId}`),
        ]);
        const taskData   = await taskRes.json();
        const sprintData = await sprintRes.json();

        const all = [
          ...(taskData.todo     || []).map(t => ({ ...t, status: "todo" })),
          ...(taskData.progress || []).map(t => ({ ...t, status: "progress" })),
          ...(taskData.review   || []).map(t => ({ ...t, status: "review" })),
          ...(taskData.done     || []).map(t => ({ ...t, status: "done" })),
        ];
        setTasks(all);
        setSprints(sprintData.sprints || []);
      } catch (err) {
        console.error("ListView fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ── Filter + Search ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus !== "all" && t.status   !== filterStatus) return false;
      if (filterPrio   !== "all" && t.priority !== filterPrio)   return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !`task-${t.id}`.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterPrio, search]);

  // ── Group ────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (groupBy === "none") return { "All Tasks": filtered };
    if (groupBy === "status") {
      const groups = { todo: [], progress: [], review: [], done: [] };
      filtered.forEach(t => (groups[t.status] = groups[t.status] || []).push(t) && groups[t.status]);
      filtered.forEach(t => { if (!groups[t.status]) groups[t.status] = [t]; else if (!groups[t.status].includes(t)) groups[t.status].push(t); });
      return Object.fromEntries(
        Object.entries(groups)
          .filter(([, arr]) => arr.length > 0)
          .map(([k, arr]) => [STATUS_CONFIG[k]?.label || k, arr])
      );
    }
    if (groupBy === "priority") {
      const groups = { High: [], Medium: [], Low: [] };
      filtered.forEach(t => { if (groups[t.priority]) groups[t.priority].push(t); });
      return Object.fromEntries(Object.entries(groups).filter(([, arr]) => arr.length > 0));
    }
    if (groupBy === "sprint") {
      const groups = { "No Sprint": [] };
      sprints.forEach(s => { groups[s.title] = []; });
      filtered.forEach(t => {
        const key = t.sprint_name || "No Sprint";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.fromEntries(Object.entries(groups).filter(([, arr]) => arr.length > 0));
    }
    return { "All Tasks": filtered };
  }, [filtered, groupBy, sprints]);

  const handleCreated = (newTask) => {
    setTasks(prev => [newTask, ...prev]);
  };

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const today = new Date(); today.setHours(0,0,0,0);
  const isOverdue = (d) => d && new Date(d) < today;

  // Derive user initials
  const userInitials = useMemo(() => {
    if (Array.isArray(user) && user[1]) {
      return user[1].split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    }
    return "SK";
  }, [user]);

  const COL = "50px 36px 110px 1fr 110px 130px 70px 80px 36px";

  if (loading) {
    return (
      <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[300, 80, 80].map((w, i) => (
            <div key={i} style={{ height: 36, width: w, background: "#f3f4f6", borderRadius: 6, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ height: 44, background: "#f9fafb", borderRadius: 6, marginBottom: 6 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", fontSize: 14, color: "#202124" }}>

      {showCreate && (
        <CreateModal
          user={user}
          sprints={sprints}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <input
          type="search"
          placeholder="Search list"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #d0d5da", fontSize: 14 }}
        />

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d0d5da", fontSize: 14 }}
        >
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>

        {/* Priority filter */}
        <select
          value={filterPrio}
          onChange={e => setFilterPrio(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d0d5da", fontSize: 14 }}
        >
          <option value="all">All Priority</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <Avatar initials={userInitials} />

        <button
          style={{ border: "1px solid #d0d5da", background: "#fff", padding: "8px 14px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
        >
          Filter
        </button>
      </div>

      {/* ── Row Controls ────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d0d5da", fontSize: 14 }}
          >
            <option value="none">Group: None</option>
            <option value="status">Group: Status</option>
            <option value="priority">Group: Priority</option>
            <option value="sprint">Group: Sprint</option>
          </select>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 18, cursor: "pointer" }}>
          <span>⚙️</span>
          <span>⋮</span>
        </div>
      </div>

      {/* ── Table Header ────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: COL,
        fontWeight: 600,
        color: "#5f6368",
        borderBottom: "1px solid #dadce0",
        paddingBottom: 8,
        marginBottom: 6,
        fontSize: 13,
      }}>
        <div><input type="checkbox" disabled /></div>
        <div>Type</div>
        <div>Key</div>
        <div>Summary</div>
        <div>Status</div>
        <div>Sprint</div>
        <div>Assignee</div>
        <div>Due</div>
        <div>+</div>
      </div>

      {/* ── Groups + Rows ────────────────────────────────────────── */}
      {Object.entries(grouped).map(([groupName, groupTasks]) => (
        <div key={groupName}>

          {/* Group header (only shown when grouping is active) */}
          {groupBy !== "none" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 0 4px 0",
              fontWeight: 700, fontSize: 12,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              borderBottom: "1px solid #e5e7eb",
              marginBottom: 4,
            }}>
              <span>{groupName}</span>
              <span style={{
                background: "#f3f4f6", color: "#9ca3af",
                borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 600,
              }}>{groupTasks.length}</span>
            </div>
          )}

          {groupTasks.map(item => {
            const prio    = PRIORITY_ICON[item.priority] || PRIORITY_ICON.Medium;
            const overdue = isOverdue(item.dueDate) && item.status !== "done";
            const isExp   = expandedId === item.id;

            return (
              <React.Fragment key={item.id}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: COL,
                  alignItems: "center",
                  borderBottom: "1px solid #f1f3f4",
                  padding: "9px 0",
                  cursor: "default",
                  background: overdue ? "#fef2f2" : "transparent",
                  transition: "background 0.1s",
                }}
                  onMouseEnter={e => { if (!overdue) e.currentTarget.style.background = "#fafbfc"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = overdue ? "#fef2f2" : "transparent"; }}
                >
                  {/* Checkbox */}
                  <div><input type="checkbox" readOnly /></div>

                  {/* Priority icon */}
                  <div style={{ fontWeight: 900, color: prio.color, fontSize: 13, textAlign: "center" }}>
                    {prio.icon}
                  </div>

                  {/* Key */}
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1a73e8" }}>
                    TASK-{item.id}
                  </div>

                  {/* Summary */}
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
                    {item.title}
                    {item.subtasks?.total > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#9ca3af" }}>
                        {item.subtasks.completed}/{item.subtasks.total} subtasks
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div><StatusBadge status={item.status} /></div>

                  {/* Sprint */}
                  <div style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.sprint_name || <span style={{ color: "#d1d5db" }}>—</span>}
                  </div>

                  {/* Assignee */}
                  <div><Avatar initials={userInitials} /></div>

                  {/* Due date */}
                  <div style={{
                    fontSize: 12,
                    color: overdue ? "#ef4444" : "#6b7280",
                    fontWeight: overdue ? 600 : 400,
                  }}>
                    {formatDate(item.dueDate) || <span style={{ color: "#d1d5db" }}>—</span>}
                  </div>

                  {/* Expand toggle */}
                  <div
                    style={{ fontWeight: 900, cursor: "pointer", color: "#9ca3af", textAlign: "center", fontSize: 16 }}
                    onClick={() => setExpandedId(isExp ? null : item.id)}
                  >
                    {isExp ? "−" : "+"}
                  </div>
                </div>

                {/* Expanded detail row */}
                {isExp && (
                  <div style={{
                    background: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    padding: "12px 20px 14px 60px",
                    fontSize: 13,
                    color: "#374151",
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Priority</div>
                      <div style={{ color: prio.color, fontWeight: 600 }}>{prio.icon} {item.priority}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Sprint</div>
                      <div>{item.sprint_name || "Unassigned"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Progress</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${item.progress || 0}%`, height: "100%", background: "#6366f1", borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>{item.progress || 0}%</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Due Date</div>
                      <div style={{ color: overdue ? "#ef4444" : "#374151" }}>
                        {item.dueDate
                          ? new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      ))}

      {/* Empty state */}
      {filtered.length === 0 && !loading && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 600 }}>No tasks found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters or create a new task</div>
        </div>
      )}

      {/* ── Create Row ──────────────────────────────────────────── */}
      <div
        onClick={() => setShowCreate(true)}
        style={{ marginTop: 14, color: "#1a73e8", fontWeight: 600, cursor: "pointer", fontSize: 14 }}
      >
        + Create
      </div>
    </div>
  );
}