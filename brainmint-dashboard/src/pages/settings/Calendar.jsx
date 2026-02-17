import React, { useState, useEffect, useMemo, useCallback } from "react";

const API_BASE_URL = "http://localhost:8000/api";

const PRIORITY_COLORS = {
  High:   { bar: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  Medium: { bar: "bg-yellow-400", text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  Low:    { bar: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
};

const STATUS_LABELS = {
  todo:     "To Do",
  progress: "In Progress",
  review:   "Review",
  done:     "Done",
};

const STATUS_COLORS = {
  todo:     { bg: "bg-gray-100",   text: "text-gray-700",   border: "border-gray-300" },
  progress: { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-300" },
  review:   { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-300" },
  done:     { bg: "bg-green-50",   text: "text-green-700",  border: "border-green-300" },
};

const monthNames = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function buildWorkWeekGrid(year, month) {
  const weeks = [];
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const firstDow     = new Date(year, month, 1).getDay();

  let week = [];

  if (firstDow >= 2 && firstDow <= 5) {
    for (let d = firstDow - 1; d >= 1; d--) {
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      week.push({ date: prevMonthDays - d + 1, month: pm, year: py, prev: true });
    }
  } else if (firstDow === 6 || firstDow === 0) {
    const offset = firstDow === 6 ? 5 : 6;
    for (let i = offset; i >= 1; i--) {
      const d = prevMonthDays - i + 1;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      if (new Date(py, pm, d).getDay() !== 0 && new Date(py, pm, d).getDay() !== 6) {
        week.push({ date: d, month: pm, year: py, prev: true });
      }
    }
    if (week.length > 0) { weeks.push([...week]); week = []; }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 0 || dow === 6) continue;

    week.push({ date: d, month, year, prev: false });

    if (dow === 5) {
      weeks.push([...week]);
      week = [];
    }
  }

  if (week.length > 0) {
    let nextDate = 1;
    const nm = month === 11 ? 0  : month + 1;
    const ny = month === 11 ? year + 1 : year;
    while (week.length < 5) {
      const dow = new Date(ny, nm, nextDate).getDay();
      if (dow !== 0 && dow !== 6) {
        week.push({ date: nextDate, month: nm, year: ny, prev: true });
      }
      nextDate++;
    }
    weeks.push([...week]);
  }

  return weeks;
}

function toDateKey(year, month, date) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

// ── Task Pill (Draggable) ────────────────────────────────────────
function TaskPill({ task, onClick, onDragStart }) {
  const p = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e, task);
      }}
      onClick={(e) => { 
        e.stopPropagation(); 
        onClick(task); 
      }}
      className={`
        w-full text-left text-xs rounded px-2 py-1 mb-1 truncate font-medium border
        ${p.bg} ${p.text} ${p.border} hover:brightness-95 transition-all cursor-move
        ${isOverdue ? 'ring-1 ring-red-400' : ''}
      `}
      title={task.title}
    >
      <div className="flex items-center gap-1">
        <span className="flex-1 truncate">{task.title}</span>
        {task.subtasks?.total > 0 && (
          <span className="text-[10px] opacity-70 flex-shrink-0">
            {task.subtasks.completed}/{task.subtasks.total}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Enhanced Task Modal ──────────────────────────────────────────
function TaskModal({ task, onClose, onUpdate, onDelete, sprints }) {
  const [editMode, setEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  useEffect(() => {
    setEditedTask(task);
    setEditMode(false);
  }, [task]);

  if (!task) return null;

  const p = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium;

  const handleSave = async () => {
    await onUpdate(editedTask);
    setEditMode(false);
  };

  const handleStatusChange = async (newStatus) => {
    const updated = { ...task, status: newStatus };
    await onUpdate(updated);
  };

  const handlePriorityChange = async (newPriority) => {
    const updated = { ...task, priority: newPriority };
    await onUpdate(updated);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-4">
            {editMode ? (
              <input
                type="text"
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                className="w-full font-semibold text-gray-900 text-base border border-gray-300 rounded px-2 py-1"
                autoFocus
              />
            ) : (
              <h3 className="font-semibold text-gray-900 text-base leading-snug">{task.title}</h3>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0">×</button>
        </div>

        {/* Quick Status Change */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              className={`
                px-3 py-2 rounded text-xs font-medium border transition-all
                ${task.status === key 
                  ? `${STATUS_COLORS[key].bg} ${STATUS_COLORS[key].text} ${STATUS_COLORS[key].border} ring-2 ring-offset-1 ring-blue-400` 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm">
          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 flex-shrink-0">Priority</span>
            <div className="flex gap-2">
              {['High', 'Medium', 'Low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => handlePriorityChange(priority)}
                  className={`
                    px-3 py-1 rounded text-xs font-medium border transition-all
                    ${task.priority === priority
                      ? `${PRIORITY_COLORS[priority].bg} ${PRIORITY_COLORS[priority].text} ${PRIORITY_COLORS[priority].border} ring-2 ring-offset-1`
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Sprint */}
          {task.sprint_name && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20 flex-shrink-0">Sprint</span>
              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium border border-purple-200">
                {task.sprint_name}
              </span>
            </div>
          )}

          {/* Due Date */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 flex-shrink-0">Due Date</span>
            {task.dueDate ? (
              <span className="text-gray-700">
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            ) : (
              <span className="text-gray-400 text-xs">No due date</span>
            )}
          </div>

          {/* Progress */}
          {task.subtasks?.total > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20 flex-shrink-0">Progress</span>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      task.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                  {task.subtasks.completed}/{task.subtasks.total}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              if (window.confirm('Delete this task?')) {
                onDelete(task.id);
                onClose();
              }
            }}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors border border-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats Card ───────────────────────────────────────────────────
function StatsCard({ icon, label, value, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`px-4 py-3 rounded-lg border ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-xs font-medium opacity-75">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function CalendarUI({ user }) {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("Status");
  const [filterSprint, setFilterSprint] = useState("Assignee");
  const [filterPriority, setFilterPriority] = useState("Priority");
  const [sprints,      setSprints]      = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask,  setDraggedTask]  = useState(null);

  const userId = Array.isArray(user) ? user[0] : user?.id;

  // ── Fetch data ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

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
      ].filter(t => t.dueDate);

      setTasks(all);
      setSprints(sprintData.sprints || []);
    } catch (err) {
      console.error("Calendar fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Task Actions ───────────────────────────────────────────────
  const updateTask = async (updatedTask) => {
    try {
      await Promise.all([
        fetch(`${API_BASE_URL}/tasks/update-status/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: updatedTask.id, status: updatedTask.status }),
        }),
        fetch(`${API_BASE_URL}/tasks/update-priority/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: updatedTask.id, priority: updatedTask.priority }),
        }),
      ]);

      await fetchData();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await fetch(`${API_BASE_URL}/tasks/delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // ── Drag & Drop ────────────────────────────────────────────────
  const handleDragStart = useCallback((e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  }, []);

  const handleDrop = useCallback(async (e, newDate) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTask) return;

    try {
      await fetch(`${API_BASE_URL}/tasks/update-due-date/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_id: draggedTask.id, 
          due_date: newDate 
        }),
      });
      
      setDraggedTask(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to update task date:', err);
    }
  }, [draggedTask, fetchData]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // ── Group tasks by date ────────────────────────────────────────
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      const key = task.dueDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  // ── Apply filters ──────────────────────────────────────────────
  const filteredByDate = useMemo(() => {
    const statusMap = {
      "Not Started": "todo",
      "In Progress":  "progress",
      "Completed":    "done",
    };
    const map = {};
    Object.entries(tasksByDate).forEach(([key, dayTasks]) => {
      const filtered = dayTasks.filter(t => {
        if (filterStatus !== "Status" && t.status !== statusMap[filterStatus]) return false;
        if (filterSprint !== "Assignee" && String(t.sprint_id) !== filterSprint) return false;
        if (filterPriority !== "Priority" && t.priority !== filterPriority) return false;
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
      if (filtered.length) map[key] = filtered;
    });
    return map;
  }, [tasksByDate, filterStatus, filterSprint, filterPriority, search]);

  // ── Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => 
      new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length;
    const thisWeek = tasks.filter(t => {
      const taskDate = new Date(t.dueDate);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return taskDate >= new Date() && taskDate <= weekFromNow;
    }).length;

    return { total, completed, overdue, thisWeek };
  }, [tasks]);

  // ── Navigation ─────────────────────────────────────────────────
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const weeks = useMemo(
    () => buildWorkWeekGrid(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="p-6 w-full font-sans bg-gray-50 min-h-screen">

      <TaskModal 
        task={selectedTask} 
        onClose={() => setSelectedTask(null)}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sprints={sprints}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard icon="📋" label="Total Tasks" value={stats.total} color="blue" />
        <StatsCard icon="✅" label="Completed" value={stats.completed} color="green" />
        <StatsCard icon="🔥" label="Overdue" value={stats.overdue} color="red" />
        <StatsCard icon="📅" label="This Week" value={stats.thisWeek} color="yellow" />
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="search"
            placeholder="🔍 Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />

          <select
            value={filterSprint}
            onChange={e => setFilterSprint(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="Assignee">All Sprints</option>
            {sprints.map(s => (
              <option key={s.id} value={String(s.id)}>{s.title}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="Priority">All Priorities</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="Status">All Status</option>
            <option>Not Started</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
            onClick={() => {
              setCurrentYear(today.getFullYear());
              setCurrentMonth(today.getMonth());
            }}
          >
            Today
          </button>

          {(search || filterStatus !== 'Status' || filterSprint !== 'Assignee' || filterPriority !== 'Priority') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterStatus('Status');
                setFilterSprint('Assignee');
                setFilterPriority('Priority');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}

          {loading && (
            <span className="text-xs text-gray-400 animate-pulse ml-auto">Loading…</span>
          )}
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button 
            className="p-2 text-xl rounded-lg hover:bg-white border border-gray-200 transition-colors shadow-sm" 
            onClick={prevMonth}
          >
            ←
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button 
            className="p-2 text-xl rounded-lg hover:bg-white border border-gray-200 transition-colors shadow-sm" 
            onClick={nextMonth}
          >
            →
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          Showing {Object.values(filteredByDate).flat().length} of {tasks.length} tasks
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-gray-200 overflow-hidden rounded-xl shadow-lg">

        {/* Week Header */}
        <div className="grid grid-cols-5 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
          {weekdays.map((day) => (
            <div
              key={day}
              className="py-3 text-center font-bold text-gray-700 text-sm border-r border-gray-200 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-5">
            {week.map((cell, ci) => {
              const key       = toDateKey(cell.year, cell.month, cell.date);
              const cellTasks = filteredByDate[key] || [];
              const isToday   =
                cell.date  === today.getDate()  &&
                cell.month === today.getMonth() &&
                cell.year  === today.getFullYear();
              const MAX = 3;

              return (
                <div
                  key={ci}
                  onDrop={(e) => handleDrop(e, key)}
                  onDragOver={handleDragOver}
                  className={`
                    min-h-[120px] p-2 border-r border-b border-gray-200 last:border-r-0 text-sm transition-colors
                    ${cell.prev ? "text-gray-400 bg-gray-50/50" : "text-gray-900 bg-white"}
                    ${wi === weeks.length - 1 ? "border-b-0" : ""}
                    ${draggedTask ? "hover:bg-blue-50/30" : ""}
                  `}
                >
                  {/* Date number */}
                  <div className={`
                    w-7 h-7 flex items-center justify-center rounded-full font-semibold mb-2 text-sm
                    ${isToday ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md" : ""}
                  `}>
                    {cell.date}
                  </div>

                  {/* Task pills */}
                  <div className="space-y-0.5">
                    {cellTasks.slice(0, MAX).map(task => (
                      <TaskPill 
                        key={task.id} 
                        task={task} 
                        onClick={setSelectedTask}
                        onDragStart={handleDragStart}
                      />
                    ))}
                    {cellTasks.length > MAX && (
                      <div className="text-[10px] text-blue-600 pl-1 pt-0.5 font-medium">
                        +{cellTasks.length - MAX} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority:</span>
          {Object.entries(PRIORITY_COLORS).map(([name, style]) => (
            <div key={name} className="flex items-center gap-2 text-xs text-gray-600">
              <span className={`w-3 h-3 rounded ${style.bar}`} />
              {name}
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          💡 Drag tasks to reschedule
        </div>
      </div>
    </div>
  );
}