// FILE: src/pages/settings/AllWork.jsx
import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000/api";

export default function AllWork({ user }) {
  const userId = user?.id || null;

  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSprint, setSelectedSprint] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [tasksRes, sprintsRes] = await Promise.all([
        fetch(`${API_BASE}/tasks/?user_id=${userId}`),
        fetch(`${API_BASE}/sprints/?user_id=${userId}`),
      ]);
      const tasksData = await tasksRes.json();
      const sprintsData = await sprintsRes.json();

      const allTasks = [
        ...(tasksData.todo || []),
        ...(tasksData.progress || []),
        ...(tasksData.review || []),
        ...(tasksData.done || []),
      ];
      setTasks(allTasks);
      setSprints(sprintsData.sprints || []);
    } catch (err) {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/archive/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      alert("Failed to archive task.");
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await fetch(`${API_BASE}/tasks/delete/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      alert("Failed to delete task.");
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await fetch(`${API_BASE}/tasks/update-status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, status: newStatus }),
      });
      fetchData();
    } catch {
      alert("Failed to update status.");
    }
  };

  const inProgress = tasks.filter((t) => t.isWIP).length;
  const done = tasks.filter((t) => !t.isWIP && t.progress === 100).length;

  const filtered = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.sprint_name || "").toLowerCase().includes(search.toLowerCase());
    const matchSprint =
      selectedSprint === "all" || String(t.sprint_id) === selectedSprint;
    const rawStatus = t.isWIP ? "progress" : t.progress === 100 ? "done" : "todo";
    const matchStatus = selectedStatus === "all" || rawStatus === selectedStatus;
    return matchSearch && matchSprint && matchStatus;
  });

  const getStatusStyle = (task) => {
    if (task.isWIP) return "bg-yellow-100 text-yellow-700";
    if (task.progress === 100) return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  const getPriorityStyle = (priority) => {
    if (priority === "High") return "bg-red-100 text-red-600";
    if (priority === "Medium") return "bg-orange-100 text-orange-600";
    return "bg-blue-100 text-blue-600";
  };

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-semibold mb-4">All Work</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-sm text-gray-500">Total Items</div>
          <div className="text-2xl font-bold">{tasks.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-sm text-gray-500">In Progress</div>
          <div className="text-2xl font-bold text-yellow-600">{inProgress}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-2xl font-bold text-green-600">{done}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm p-4">
        {/* Filters */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Search work items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="border rounded-md px-3 py-2 text-sm outline-none"
              value={selectedSprint}
              onChange={(e) => setSelectedSprint(e.target.value)}
            >
              <option value="all">All Sprints</option>
              {sprints.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.title}</option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm outline-none"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            ↻ Refresh
          </button>
        </div>

        {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">No tasks found.</div>
        ) : (
          <div className="divide-y">
            {filtered.map((task) => (
              <div key={task.id} className="py-3 flex justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">{task.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {task.sprint_name ? `Sprint: ${task.sprint_name}` : "No Sprint"}
                    {task.dueDate ? ` • Due ${task.dueDate}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                  </span>

                  {task.subtasks?.total > 0 && (
                    <span className="text-xs text-gray-400">
                      {task.subtasks.completed}/{task.subtasks.total} subtasks
                    </span>
                  )}

                  <select
                    className={`text-xs font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${getStatusStyle(task)}`}
                    defaultValue={task.isWIP ? "progress" : task.progress === 100 ? "done" : "todo"}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  >
                    <option value="todo">To Do</option>
                    <option value="progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>

                  {/* Archive button */}
                  <button
                    onClick={() => handleArchive(task.id)}
                    className="text-yellow-400 hover:text-yellow-600 transition"
                    title="Archive task"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <polyline points="21 8 21 21 3 21 3 8" />
                      <rect x="1" y="3" width="22" height="5" />
                      <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-gray-300 hover:text-red-500 transition text-lg leading-none"
                    title="Delete task"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}