import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, Plus, Filter, ChevronDown, Calendar, 
  ArrowUp, ArrowDown, Trash2, Tag,
  CheckCircle2, Loader2, PlayCircle, X, Archive
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

// ────────────────────────────────────────────────
const TaskModal = ({ isOpen, onClose, onAddTask, userId, defaultStatus = "todo", sprints = [] }) => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [subtaskCount, setSubtaskCount] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || isSubmitting) return;
    if (!userId) {
      alert("User ID is missing. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = dueDate
        ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : "";

      await onAddTask({
        user_id: userId,
        title,
        priority,
        status: defaultStatus,
        due_date: formattedDate,
        subtasks_total: parseInt(subtaskCount) || 0,
        sprint_id: sprintId ? parseInt(sprintId) : null,
      });

      setTitle("");
      setPriority("Medium");
      setDueDate("");
      setSubtaskCount("");
      setSprintId("");
      onClose();
    } catch (err) {
      alert("Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">New Task</h3>
          <button onClick={onClose} disabled={isSubmitting}>
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Implement new feature"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                disabled={isSubmitting}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprint (optional)</label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                disabled={isSubmitting}
              >
                <option value="">No Sprint (Backlog)</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Subtasks</label>
              <input
                type="number"
                value={subtaskCount}
                onChange={(e) => setSubtaskCount(e.target.value)}
                placeholder="e.g., 5"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Adding..." : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
export default function Backlog({ user }) {
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sprintFilter, setSprintFilter] = useState("All");
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSprintMenu, setShowSprintMenu] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user?.id) loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, sprintsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks/?user_id=${user.id}`),
        fetch(`${API_BASE_URL}/sprints/?user_id=${user.id}`).catch(() => ({ ok: false }))
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const allTasks = [
          ...data.todo.map(t => ({ ...t, status: "todo" })),
          ...data.progress.map(t => ({ ...t, status: "progress" })),
          ...data.review.map(t => ({ ...t, status: "review" })),
          ...data.done.map(t => ({ ...t, status: "done" })),
        ];
        setTasks(allTasks);
      }

      if (sprintsRes.ok) {
        const sData = await sprintsRes.json();
        setSprints(sData.sprints || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (taskData) => {
    await fetch(`${API_BASE_URL}/tasks/create/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData)
    });
    await loadAll();
  };

  const deleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try {
      await fetch(`${API_BASE_URL}/tasks/delete/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId })
      });
      await loadAll();
    } catch {
      alert("Failed to delete task");
    }
  };

  const archiveTask = async (taskId) => {
    try {
      await fetch(`${API_BASE_URL}/tasks/archive/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId })
      });
      await loadAll();
    } catch {
      alert("Failed to archive task");
    }
  };

  const bulkArchive = async () => {
    if (!confirm(`Archive ${selectedTasks.length} tasks?`)) return;
    try {
      await Promise.all(
        selectedTasks.map(id =>
          fetch(`${API_BASE_URL}/tasks/archive/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_id: id })
          })
        )
      );
      setSelectedTasks([]);
      await loadAll();
    } catch {
      alert("Failed to archive tasks");
    }
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
      await fetch(`${API_BASE_URL}/tasks/update-status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, status: newStatus })
      });
      await loadAll();
    } catch {
      alert("Failed to update status");
    }
  };

  const updatePriority = async (taskId, newPriority) => {
    try {
      await fetch(`${API_BASE_URL}/tasks/update-priority/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, priority: newPriority })
      });
      await loadAll();
    } catch {
      alert("Failed to update priority");
    }
  };

  const assignSprint = async (taskId, sprintIdValue) => {
    const sprint_id = sprintIdValue ? parseInt(sprintIdValue) : null;
    try {
      await fetch(`${API_BASE_URL}/tasks/assign-sprint/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, sprint_id })
      });
      await loadAll();
    } catch {
      alert("Failed to assign sprint");
    }
  };

  const bulkMoveToSprint = async () => {
    if (!confirm(`Move ${selectedTasks.length} tasks to active sprint?`)) return;
    try {
      await Promise.all(
        selectedTasks.map(id =>
          fetch(`${API_BASE_URL}/tasks/update-status/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_id: id, status: "progress" })
          })
        )
      );
      setSelectedTasks([]);
      await loadAll();
    } catch {
      alert("Failed to move tasks");
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedTasks.length} tasks?`)) return;
    try {
      await Promise.all(
        selectedTasks.map(id =>
          fetch(`${API_BASE_URL}/tasks/delete/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_id: id })
          })
        )
      );
      setSelectedTasks([]);
      await loadAll();
    } catch {
      alert("Failed to delete tasks");
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesSprint =
        sprintFilter === "All" ||
        (sprintFilter === "none" ? !task.sprint_id : task.sprint_id === Number(sprintFilter));
      return matchesSearch && matchesPriority && matchesStatus && matchesSprint;
    });
  }, [tasks, searchTerm, priorityFilter, statusFilter, sprintFilter]);

  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    list.sort((a, b) => {
      let aVal = sortBy === "due_date" ? a.dueDate : a[sortBy];
      let bVal = sortBy === "due_date" ? b.dueDate : b[sortBy];

      if (sortBy === "priority") {
        const order = { High: 1, Medium: 2, Low: 3 };
        aVal = order[a.priority] ?? 999;
        bVal = order[b.priority] ?? 999;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredTasks, sortBy, sortOrder]);

  const priorityColors = {
    High: "bg-red-50 text-red-700 border-red-200",
    Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Low: "bg-green-50 text-green-700 border-green-200"
  };

  const statusColors = {
    todo: "bg-gray-100 text-gray-700",
    progress: "bg-blue-100 text-blue-700",
    review: "bg-purple-100 text-purple-700",
    done: "bg-green-100 text-green-700"
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => {
        if (sortBy === field) {
          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
          setSortBy(field);
          setSortOrder("asc");
        }
      }}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === field && (sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
      </div>
    </th>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const sprintFilterLabel =
    sprintFilter === "All" ? "All Sprints" :
    sprintFilter === "none" ? "No Sprint" :
    sprints.find(s => s.id === Number(sprintFilter))?.title || "Unknown Sprint";

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Backlog</h1>
          <p className="text-sm text-gray-500">{sortedTasks.length} tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Bulk actions */}
      {selectedTasks.length > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
          <span className="font-medium text-indigo-900">{selectedTasks.length} selected</span>
          <button
            onClick={bulkMoveToSprint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
          >
            <PlayCircle size={16} /> Move to Sprint
          </button>
          <button
            onClick={bulkArchive}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
          >
            <Archive size={16} /> Archive
          </button>
          <button
            onClick={bulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            <Trash2 size={16} /> Delete
          </button>
          <button
            onClick={() => setSelectedTasks([])}
            className="ml-auto text-sm text-gray-600 hover:text-gray-900"
          >
            Clear
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Priority */}
        <div className="relative">
          <button
            onClick={() => setShowPriorityMenu(!showPriorityMenu)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter size={16} />
            <span className="text-sm font-medium">
              {priorityFilter === "All" ? "Priority" : priorityFilter}
            </span>
            <ChevronDown size={16} />
          </button>
          {showPriorityMenu && (
            <div className="absolute z-20 mt-1 w-40 bg-white border rounded-lg shadow-lg">
              {["All", "High", "Medium", "Low"].map(p => (
                <button
                  key={p}
                  onClick={() => { setPriorityFilter(p); setShowPriorityMenu(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <span className="text-sm font-medium">
              {statusFilter === "All" ? "Status" : statusFilter.replace(/^\w/, c => c.toUpperCase())}
            </span>
            <ChevronDown size={16} />
          </button>
          {showStatusMenu && (
            <div className="absolute z-20 mt-1 w-40 bg-white border rounded-lg shadow-lg">
              {["All", "todo", "progress", "review", "done"].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setShowStatusMenu(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 capitalize"
                >
                  {s === "All" ? "All" : s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sprint */}
        {sprints.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowSprintMenu(!showSprintMenu)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Tag size={16} />
              <span className="text-sm font-medium">{sprintFilterLabel}</span>
              <ChevronDown size={16} />
            </button>
            {showSprintMenu && (
              <div className="absolute z-20 mt-1 w-56 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                <button
                  onClick={() => { setSprintFilter("All"); setShowSprintMenu(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  All Sprints
                </button>
                <button
                  onClick={() => { setSprintFilter("none"); setShowSprintMenu(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-600"
                >
                  No Sprint (Backlog)
                </button>
                {sprints.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSprintFilter(String(s.id)); setShowSprintMenu(false); }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={sortedTasks.length > 0 && selectedTasks.length === sortedTasks.length}
                    onChange={e => setSelectedTasks(
                      e.target.checked ? sortedTasks.map(t => t.id) : []
                    )}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <SortableHeader field="title">Task</SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sprint</th>
                <SortableHeader field="priority">Priority</SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <SortableHeader field="due_date">Due Date</SortableHeader>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No tasks found
                  </td>
                </tr>
              ) : (
                sortedTasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task.id)}
                        onChange={e => {
                          setSelectedTasks(prev =>
                            e.target.checked
                              ? [...prev, task.id]
                              : prev.filter(id => id !== task.id)
                          );
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {task.progress === 100 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        <span className="text-sm font-medium text-gray-900">{task.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={task.sprint_id || ""}
                        onChange={e => assignSprint(task.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 cursor-pointer focus:ring-2 focus:ring-indigo-500 max-w-[160px]"
                      >
                        <option value="">No Sprint</option>
                        {sprints.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={task.priority}
                        onChange={e => updatePriority(task.id, e.target.value)}
                        className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer ${priorityColors[task.priority] || "bg-gray-50 text-gray-700"}`}
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={task.status}
                        onChange={e => updateStatus(task.id, e.target.value)}
                        className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer ${statusColors[task.status]}`}
                      >
                        <option value="todo">To Do</option>
                        <option value="progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {task.subtasks?.total > 0
                        ? `${task.subtasks.completed} / ${task.subtasks.total}`
                        : task.progress != null ? `${task.progress}%` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar size={14} />
                        {task.dueDate || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {task.status !== "progress" && (
                          <button
                            onClick={() => updateStatus(task.id, "progress")}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Start task"
                          >
                            <PlayCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => archiveTask(task.id)}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                          title="Archive"
                        >
                          <Archive size={16} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAddTask={createTask}
        userId={user?.id}
        sprints={sprints}
      />
    </div>
  );
}