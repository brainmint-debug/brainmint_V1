import React, { useState, useEffect } from "react";
import { Search, Filter, Plus } from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

const TaskCard = ({ task, onStatusChange }) => {
  const priorityColors = {
    High: "#ffe5e5",
    Medium: "#fff4e5",
    Low: "#e5f6ff"
  };

  return (
    <div
      style={{
        backgroundColor: priorityColors[task.priority] || "#f5f5f5",
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 14,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        cursor: "pointer",
        transition: "0.2s",
      }}
      className="hover:shadow-md"
    >
      <div
        style={{
          fontSize: 11,
          color: "#555",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {task.sprint_name || "No Sprint"}
      </div>

      <div
        style={{
          fontSize: 14,
          color: "#1f1f1f",
          lineHeight: 1.4,
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        {task.title}
      </div>

      {/* Priority Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 10,
            backgroundColor: task.priority === 'High' ? '#ef4444' : 
                           task.priority === 'Medium' ? '#f59e0b' : '#6b7280',
            color: "white",
            fontWeight: 600,
          }}
        >
          {task.priority}
        </span>
        {task.dueDate && (
          <span style={{ fontSize: 11, color: "#666" }}>
            📅 {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>
          {task.subtasks.completed}/{task.subtasks.total} subtasks
        </div>
        <div
          style={{
            width: "100%",
            height: 4,
            backgroundColor: "#e0e0e0",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${task.progress}%`,
              height: "100%",
              backgroundColor: "#7c3aed",
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default function Board({ user }) {
  const [tasks, setTasks] = useState({
    todo: [],
    progress: [],
    review: [],
    done: []
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    const userId = Array.isArray(user) ? user[0] : user?.id;
    
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tasks/?user_id=${userId}`);
      const data = await res.json();
      console.log("📋 Board tasks:", data);
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = (taskList) => {
    if (!search) return taskList;
    return taskList.filter(task =>
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.sprint_name && task.sprint_name.toLowerCase().includes(search.toLowerCase()))
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 20, height: "100vh", backgroundColor: "#f7f8fa" }}>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-1 h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const columns = [
    { key: "todo", title: "TO DO", tasks: filterTasks(tasks.todo) },
    { key: "progress", title: "IN PROGRESS", tasks: filterTasks(tasks.progress) },
    { key: "review", title: "REVIEW", tasks: filterTasks(tasks.review) },
    { key: "done", title: "DONE", tasks: filterTasks(tasks.done) },
  ];

  return (
    <div
      style={{
        fontFamily: "Segoe UI, Arial",
        fontSize: 14,
        padding: 20,
        height: "100vh",
        backgroundColor: "#f7f8fa",
        boxSizing: "border-box",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          />
          <input
            type="search"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 14px 8px 42px",
              borderRadius: 18,
              border: "1px solid #d0d5dd",
              fontSize: 14,
            }}
          />
        </div>

        {/* Avatar */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            backgroundColor: "#7c3aed",
            color: "white",
            fontWeight: 600,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 14,
          }}
        >
          {Array.isArray(user) ? user[1]?.charAt(0) : user?.name?.charAt(0) || "U"}
        </div>

        <button
          style={{
            background: "#fff",
            border: "1px solid #d0d5dd",
            padding: "6px 16px",
            borderRadius: 18,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Filter size={16} />
          Filter
        </button>
      </div>

      {/* Board Columns */}
      <div
        style={{
          display: "flex",
          gap: 16,
          height: "calc(100% - 64px)",
          overflowX: "auto",
        }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            style={{
              flex: "0 0 320px",
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            }}
          >
            {/* Column Header */}
            <div
              style={{
                fontWeight: 700,
                marginBottom: 12,
                fontSize: 14,
                color: "#1f1f1f",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{column.title}</span>
              <span
                style={{
                  backgroundColor: "#e5e7eb",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {column.tasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div style={{ flexGrow: 1, overflowY: "auto" }}>
              {column.tasks.length > 0 ? (
                column.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                  />
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#9ca3af",
                    fontSize: 13,
                  }}
                >
                  No tasks
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              style={{
                border: "none",
                background: "transparent",
                color: "#7c3aed",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                textAlign: "left",
                paddingLeft: 2,
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={16} />
              Create task
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}