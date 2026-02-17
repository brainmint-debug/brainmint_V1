import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_BASE_URL = "http://localhost:8000/api";

const AppContext = createContext(null);

export function AppProvider({ user, children }) {
  const [tasks, setTasks] = useState({
    todo: [], progress: [], review: [], done: []
  });
  const [sprints, setSprints] = useState([]);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Single fetch for everything
  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const [tasksRes, sprintsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks/?user_id=${user.id}`),
        fetch(`${API_BASE_URL}/sprints/?user_id=${user.id}`).catch(() => null)
      ]);

      if (!tasksRes.ok) throw new Error("Failed to fetch tasks");
      const tasksData = await tasksRes.json();
      setTasks({
        todo: tasksData.todo || [],
        progress: tasksData.progress || [],
        review: tasksData.review || [],
        done: tasksData.done || [],
      });

      if (sprintsRes?.ok) {
        const sprintsData = await sprintsRes.json();
        setSprints(sprintsData.sprints || []);
        setCurrentSprint(sprintsData.current_sprint || null);
        setProjectTitle(sprintsData.project_title || "My Project");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setIsLoading(true);
    refreshData();
  }, [refreshData]);

  // All API mutations live here — components just call these
  const api = {
    async createTask(taskData) {
      const res = await fetch(`${API_BASE_URL}/tasks/create/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed to create task"); }
      await refreshData();
    },

    async updateTaskStatus(taskId, newStatus) {
      const res = await fetch(`${API_BASE_URL}/tasks/update-status/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await refreshData();
    },

    async incrementSubtask(taskId, currentCompleted, currentTotal) {
      const res = await fetch(`${API_BASE_URL}/tasks/increment-subtask/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, subtasks_completed: Math.min(currentCompleted + 1, currentTotal) }),
      });
      if (!res.ok) throw new Error("Failed to increment subtask");
      await refreshData();
    },

    async deleteTask(taskId) {
      const res = await fetch(`${API_BASE_URL}/tasks/delete/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      if (!res.ok) throw new Error("Failed to delete task");
      await refreshData();
    },

    async updatePriority(taskId, priority) {
      const res = await fetch(`${API_BASE_URL}/tasks/update-priority/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, priority }),
      });
      if (!res.ok) throw new Error("Failed to update priority");
      await refreshData();
    },

    async assignTaskToSprint(taskId, sprintId) {
      const res = await fetch(`${API_BASE_URL}/tasks/assign-sprint/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, sprint_id: sprintId }),
      });
      if (!res.ok) throw new Error("Failed to assign sprint");
      await refreshData();
    },

    async createSprints(userId, projectTitle, sprintList) {
      const res = await fetch(`${API_BASE_URL}/sprints/create/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, project_title: projectTitle, sprints: sprintList }),
      });
      if (!res.ok) throw new Error("Failed to create sprints");
      await refreshData();
    },

    async deleteSprints(userId) {
      const res = await fetch(`${API_BASE_URL}/sprints/delete/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) throw new Error("Failed to delete sprints");
      await refreshData();
    },
  };

  // Flat list of all tasks with status labels (for Backlog)
  const allTasksFlat = [
    ...tasks.todo.map(t => ({ ...t, status: "todo", statusLabel: "To Do" })),
    ...tasks.progress.map(t => ({ ...t, status: "progress", statusLabel: "In Progress" })),
    ...tasks.review.map(t => ({ ...t, status: "review", statusLabel: "Review" })),
    ...tasks.done.map(t => ({ ...t, status: "done", statusLabel: "Done" })),
  ];

  return (
    <AppContext.Provider value={{
      tasks,           // { todo: [], progress: [], review: [], done: [] }
      allTasksFlat,    // flat array for Backlog
      sprints,
      currentSprint,
      projectTitle,
      isLoading,
      error,
      refreshData,
      api,
      user,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}