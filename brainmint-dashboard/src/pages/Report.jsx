import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, CheckCircle2, AlertCircle, LayoutDashboard,
  ArrowUpRight, ArrowDownRight, Download, Filter, ChevronDown, Clock,
  Inbox, ChevronUp, Search, Calendar, Flag
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

// ── Priority + Status style maps ────────────────────────────────
const PRIORITY_STYLES = {
  High:   { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500" },
  Medium: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-400" },
  Low:    { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500" },
};

const STATUS_STYLES = {
  todo:     { label: "To Do",       bg: "bg-gray-100",   text: "text-gray-600" },
  progress: { label: "In Progress", bg: "bg-blue-100",   text: "text-blue-700" },
  review:   { label: "Review",      bg: "bg-purple-100", text: "text-purple-700" },
  done:     { label: "Done",        bg: "bg-green-100",  text: "text-green-700" },
};

// ── Stat Card (unchanged) ────────────────────────────────────────
const StatCard = ({ title, value, subValue, trend, trendUp, icon: Icon, color = "purple" }) => {
  const colorMap = {
    purple: { bg: "bg-purple-50", text: "text-purple-600" },
    blue:   { bg: "bg-blue-50",   text: "text-blue-600" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-600" },
    red:    { bg: "bg-red-50",    text: "text-red-600" },
  };
  const c = colorMap[color] || colorMap.purple;
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 ${c.bg} rounded-lg`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${trendUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
};

// ── Backlog Table ────────────────────────────────────────────────
function BacklogTable({ tasks }) {
  const [search,   setSearch]   = useState("");
  const [priority, setPriority] = useState("All");
  const [status,   setStatus]   = useState("All");
  const [sortKey,  setSortKey]  = useState("id");
  const [sortDir,  setSortDir]  = useState("desc");
  const [page,     setPage]     = useState(1);
  const PER_PAGE = 8;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-purple-600" />
      : <ChevronDown size={12} className="text-purple-600" />;
  };

  const filtered = tasks
    .filter(t => {
      if (priority !== "All" && t.priority !== priority) return false;
      if (status   !== "All" && t.status   !== status)   return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "priority") {
        const o = { High: 0, Medium: 1, Low: 2 };
        av = o[a.priority] ?? 3; bv = o[b.priority] ?? 3;
      }
      if (sortKey === "dueDate") {
        av = a.dueDate ? new Date(a.dueDate) : new Date("9999");
        bv = b.dueDate ? new Date(b.dueDate) : new Date("9999");
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < today;

  // Priority breakdown counts
  const highCount   = tasks.filter(t => t.priority === "High").length;
  const mediumCount = tasks.filter(t => t.priority === "Medium").length;
  const lowCount    = tasks.filter(t => t.priority === "Low").length;
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate)).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <Inbox className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Backlog</h3>
              <p className="text-sm text-gray-500 mt-0.5">Tasks not assigned to any sprint</p>
            </div>
          </div>

          {/* Mini priority breakdown */}
          <div className="flex items-center gap-3 text-xs">
            {highCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {highCount} High
              </span>
            )}
            {mediumCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {mediumCount} Medium
              </span>
            )}
            {lowCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {lowCount} Low
              </span>
            )}
            {overdueCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-full font-medium">
                <AlertCircle size={11} />
                {overdueCount} Overdue
              </span>
            )}
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-52 focus:outline-none focus:border-purple-400"
            />
          </div>

          <select
            value={priority}
            onChange={e => { setPriority(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-400"
          >
            <option value="All">All Priorities</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-400"
          >
            <option value="All">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="progress">In Progress</option>
            <option value="review">Review</option>
          </select>

          <span className="ml-auto text-sm text-gray-400">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Table */}
      {paged.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th
                    className="px-6 py-3 text-left cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => toggleSort("title")}
                  >
                    <span className="flex items-center gap-1">Task <SortIcon col="title" /></span>
                  </th>
                  <th
                    className="px-6 py-3 text-center cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => toggleSort("priority")}
                  >
                    <span className="flex items-center justify-center gap-1">Priority <SortIcon col="priority" /></span>
                  </th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th
                    className="px-6 py-3 text-center cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => toggleSort("dueDate")}
                  >
                    <span className="flex items-center justify-center gap-1">Due Date <SortIcon col="dueDate" /></span>
                  </th>
                  <th className="px-6 py-3 text-center">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map(task => {
                  const p   = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;
                  const s   = STATUS_STYLES[task.status]    || STATUS_STYLES.todo;
                  const ov  = isOverdue(task.dueDate) && task.status !== "done";
                  const prog = task.progress || 0;

                  return (
                    <tr key={task.id} className={`hover:bg-gray-50/60 transition-colors ${ov ? "bg-red-50/30" : ""}`}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          {ov && <AlertCircle size={13} className="text-red-500 flex-shrink-0" />}
                          <span className="font-medium text-gray-900">{task.title}</span>
                        </div>
                        {task.subtasks?.total > 0 && (
                          <span className="text-xs text-gray-400 mt-0.5 block">
                            {task.subtasks.completed}/{task.subtasks.total} subtasks
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${p.bg} ${p.text} ${p.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                          {task.priority}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                          {s.label}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-center">
                        {task.dueDate ? (
                          <span className={`flex items-center justify-center gap-1.5 text-xs font-medium ${ov ? "text-red-600" : "text-gray-600"}`}>
                            <Calendar size={11} />
                            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${prog}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{prog}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages} · {filtered.length} tasks
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-white"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-xs rounded-lg border ${
                      page === p
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "border-gray-200 text-gray-600 hover:bg-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center">
          <Flag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {search || priority !== "All" || status !== "All"
              ? "No tasks match your filters"
              : "No backlog tasks — everything is assigned to a sprint!"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────
export default function SprintReportDashboard({ user }) {
  const [report, setReport] = useState({
    historical: [],
    current_burndown: [],
    task_distribution: [],
    summary: { avg_velocity: 0, completion_rate: 0, total_tasks: 0, bug_ratio: 0 }
  });
  const [backlogTasks, setBacklogTasks] = useState([]);   // full task objects
  const [totalTasks,   setTotalTasks]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    const userId = user?.[0] || user?.id;
    if (!userId) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportRes, tasksRes] = await Promise.all([
          fetch(`${API_BASE_URL}/sprint-report/?user_id=${userId}`),
          fetch(`${API_BASE_URL}/tasks/?user_id=${userId}`),
        ]);
        if (!reportRes.ok) throw new Error((await reportRes.json()).error || "Failed to load sprint report");
        if (!tasksRes.ok)  throw new Error("Failed to load tasks");

        const reportData = await reportRes.json();
        const tasksData  = await tasksRes.json();

        setReport(reportData);

        const allTasks = [
          ...(tasksData.todo     || []).map(t => ({ ...t, status: "todo" })),
          ...(tasksData.progress || []).map(t => ({ ...t, status: "progress" })),
          ...(tasksData.review   || []).map(t => ({ ...t, status: "review" })),
          ...(tasksData.done     || []).map(t => ({ ...t, status: "done" })),
        ];

        setTotalTasks(allTasks.length);
        // Only show non-done backlog tasks (done ones don't need a sprint)
        setBacklogTasks(allTasks.filter(t => !t.sprint_id && t.status !== "done"));

      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const { historical, current_burndown, task_distribution, summary } = report;

  const backlogCount      = backlogTasks.length;
  const backlogPercentage = totalTasks > 0 ? Math.round((backlogCount / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading sprint retrospective...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Something went wrong</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (historical.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-10 bg-white rounded-2xl shadow-xl">
          <LayoutDashboard className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No sprint history yet</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Once you complete at least one sprint with tasks, you'll see velocity trends, burndown charts, and more here.
          </p>
          <button className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
            Go to Active Sprints
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sprint Retrospective</h1>
            <p className="text-sm text-gray-500 mt-1">
              Insights from {historical.length} sprint{historical.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Filter size={16} /> All Sprints <ChevronDown size={16} />
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 shadow-sm">
              <Download size={16} /> Export Report
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-10">

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <StatCard title="Avg Velocity"     value={`${summary.avg_velocity || 0} pts`}  subValue="per sprint"         trend="+8%"   trendUp={true}  icon={TrendingUp}    />
            <StatCard title="Completion Rate"  value={`${summary.completion_rate || 0}%`}  subValue="of committed"       trend="-2%"   trendUp={false} icon={CheckCircle2}  />
            <StatCard title="Total Tasks"      value={totalTasks || summary.total_tasks || 0} subValue="all time"         icon={LayoutDashboard} color="blue"   />
            <StatCard title="Backlog Tasks"    value={backlogCount} subValue={`${backlogPercentage}% unassigned`}        icon={Inbox}   color="amber"  />
            <StatCard title="Bug Ratio"        value={`${summary.bug_ratio || 0}%`}         subValue="of effort"         trend="-1.5%" trendUp={true}  icon={AlertCircle}   color="red"    />
          </div>

          {/* Velocity + Burndown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Velocity Trend</h3>
                  <p className="text-sm text-gray-600 mt-1">Committed vs Delivered per sprint</p>
                </div>
                <div className="flex gap-5 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-200 rounded" /> Committed</div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-600 rounded" /> Completed</div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historical} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "#f9fafb" }} />
                    <Bar dataKey="committed" fill="#d8b4fe" radius={[6,6,0,0]} name="Committed" />
                    <Bar dataKey="completed" fill="#9333ea" radius={[6,6,0,0]} name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Current Sprint Burndown</h3>
                <p className="text-sm text-gray-600 mt-1">Ideal vs Actual remaining effort</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={current_burndown} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="redFade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="day"       tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis                     tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="ideal"     stroke="#9ca3af" strokeDasharray="5 5" fill="none"            strokeWidth={2}   name="Ideal" />
                    <Area type="monotone" dataKey="remaining" stroke="#ef4444"                       fill="url(#redFade)"   strokeWidth={2.5} name="Actual" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Pie + Sprint History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Work Distribution</h3>
              <div className="h-80 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={task_distribution} cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={3} dataKey="value">
                      {task_distribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-4xl font-bold text-gray-900">100%</span>
                  <span className="text-sm uppercase text-gray-500 mt-2 tracking-wide">Effort Split</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                {task_distribution.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-700 font-medium">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Sprint History</h3>
                <span className="text-sm text-gray-600">{historical.length} sprints</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                    <tr>
                      <th className="px-6 py-4 text-left">Sprint</th>
                      <th className="px-6 py-4 text-center">Velocity</th>
                      <th className="px-6 py-4 text-center">Bugs</th>
                      <th className="px-6 py-4 text-center">Tech Debt</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historical.map((s, i) => (
                      <tr key={`${s.name}-${i}`} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                        <td className="px-6 py-4 text-center font-medium">
                          {s.completed} <span className="text-gray-400">/</span> {s.committed}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={s.bugs > 3 ? "text-red-600 font-medium" : "text-gray-700"}>{s.bugs}</span>
                        </td>
                        <td className="px-6 py-4 text-center">{s.techDebt}%</td>
                        <td className="px-6 py-4 text-right">
                          {s.is_current ? (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                              <Clock size={14} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              <CheckCircle2 size={14} /> Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Backlog Section ── */}
          <BacklogTable tasks={backlogTasks} />

        </div>
      </main>
    </div>
  );
}