import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000/api";

export default function Forms({ user }) {
  const userId = user?.id || null;

  const [formData, setFormData] = useState({
    title: "",
    priority: "Medium",
    status: "todo",
    due_date: "",
    subtasks_total: 0,
    sprint_id: "",
  });

  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/sprints/?user_id=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.sprints) setSprints(data.sprints);
      })
      .catch(() => {});
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("You must be logged in to create a task.");
      return;
    }

    if (!formData.title.trim()) {
      setError("Task title is required.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        user_id: userId,
        title: formData.title.trim(),
        priority: formData.priority,
        status: formData.status,
        due_date: formData.due_date,
        subtasks_total: parseInt(formData.subtasks_total) || 0,
        sprint_id: formData.sprint_id ? parseInt(formData.sprint_id) : null,
      };

      const res = await fetch(`${API_BASE}/tasks/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create task.");
      } else {
        setSuccess(`Task "${data.task.title}" created successfully!`);
        setFormData({
          title: "",
          priority: "Medium",
          status: "todo",
          due_date: "",
          subtasks_total: 0,
          sprint_id: "",
        });
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #dadce0",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 14,
    color: "#202124",
  };

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: 24,
        backgroundColor: "#f5f7fa",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: "600", color: "#202124" }}>
          Create New Task
        </h2>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "#4285f4",
            color: "white",
            fontWeight: "bold",
            fontSize: 14,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            userSelect: "none",
          }}
        >
          {user?.name ? user.name[0].toUpperCase() : "?"}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto 16px",
            padding: "10px 14px",
            backgroundColor: "#fce8e6",
            color: "#c5221f",
            borderRadius: 6,
            fontSize: 14,
            border: "1px solid #f5c6c4",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto 16px",
            padding: "10px 14px",
            backgroundColor: "#e6f4ea",
            color: "#137333",
            borderRadius: 6,
            fontSize: 14,
            border: "1px solid #b7dfbe",
          }}
        >
          {success}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          maxWidth: 700,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <label style={labelStyle}>Task Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter task title"
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Priority</label>
          <select name="priority" value={formData.priority} onChange={handleChange} style={inputStyle}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
            <option value="todo">To Do</option>
            <option value="progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Due Date</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Number of Subtasks</label>
          <input
            type="number"
            name="subtasks_total"
            value={formData.subtasks_total}
            onChange={handleChange}
            min="0"
            placeholder="0"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Sprint (optional)</label>
          <select name="sprint_id" value={formData.sprint_id} onChange={handleChange} style={inputStyle}>
            <option value="">— No Sprint —</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: loading ? "#aaa" : "#1a73e8",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            alignSelf: "flex-end",
            fontSize: 14,
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) => { if (!loading) e.target.style.backgroundColor = "#155ab6"; }}
          onMouseOut={(e) => { if (!loading) e.target.style.backgroundColor = "#1a73e8"; }}
        >
          {loading ? "Creating..." : "Create Task"}
        </button>
      </form>
    </div>
  );
}