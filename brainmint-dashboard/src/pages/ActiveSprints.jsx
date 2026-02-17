import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  List,
  Calendar,
  RefreshCw,
  LayoutDashboard,
  Clock,
  BarChart3,
  Loader2,
  PlayCircle,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE_URL = "http://localhost:8000/api";

// ────────────────────────────────────────────────
//  Main Component
// ────────────────────────────────────────────────
export default function ActiveSprints({ user }) {
  const [page, setPage] = useState("loading");
  const [projectTitle, setProjectTitle] = useState("");
  const [sprints, setSprints] = useState([]);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [backlogTasks, setBacklogTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    loadAllData();

    intervalRef.current = setInterval(() => {
      if (page === "sprintList") {
        loadAllData();
      }
    }, 30000);

    return () => clearInterval(intervalRef.current);
  }, [user?.id, page]);

  const loadAllData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // 1. Load sprints
      const sprintsRes = await fetch(`${API_BASE_URL}/sprints/?user_id=${user.id}`);
      let sprintData = { sprints: [], project_title: "My Project", current_sprint: null };

      if (sprintsRes.ok) {
        sprintData = await sprintsRes.json();
      }

      setSprints(sprintData.sprints || []);
      setProjectTitle(sprintData.project_title || "My Project");
      setCurrentSprint(sprintData.current_sprint || null);

      // 2. Load all tasks to calculate backlog
      const tasksRes = await fetch(`${API_BASE_URL}/tasks/?user_id=${user.id}`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();

        const allTasks = [
          ...(tasksData.todo || []),
          ...(tasksData.progress || []),
          ...(tasksData.review || []),
          ...(tasksData.done || []),
        ];

        const total = allTasks.length;
        const backlog = allTasks.filter((t) => !t.sprint_id).length;

        setTotalTasks(total);
        setBacklogTasks(backlog);
      }

      setPage(sprintData.sprints?.length > 0 ? "sprintList" : "setup");
    } catch (error) {
      console.error("Error loading data:", error);
      if (sprints.length === 0) setPage("setup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = async (title, sprintList) => {
    try {
      clearInterval(intervalRef.current);

      const res = await fetch(`${API_BASE_URL}/sprints/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          project_title: title,
          sprints: sprintList,
        }),
      });

      if (res.ok) {
        setProjectTitle(title);
        await loadAllData();
      } else {
        const err = await res.json();
        alert("Failed to save sprints: " + (err.error || "Unknown error"));
      }
    } catch (err) {
      alert("Failed to save sprints: " + err.message);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Delete all sprints and start over?")) return;

    try {
      clearInterval(intervalRef.current);

      await fetch(`${API_BASE_URL}/sprints/delete/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      setProjectTitle("");
      setSprints([]);
      setCurrentSprint(null);
      setBacklogTasks(0);
      setTotalTasks(0);
      setPage("setup");
    } catch (err) {
      console.error(err);
      alert("Failed to reset sprints");
    }
  };

  if (page === "loading" || (isLoading && sprints.length === 0 && totalTasks === 0)) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans text-slate-900">
      {page === "setup" && <SetupWizard onSetupComplete={handleSetupComplete} />}

      {page === "sprintList" && (
        <SprintList
          projectTitle={projectTitle}
          sprints={sprints}
          currentSprint={currentSprint}
          backlogCount={backlogTasks}
          totalTasksCount={totalTasks}
          onReset={handleReset}
          onRefresh={loadAllData}
          isRefreshing={isLoading}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
//  Setup Wizard (unchanged)
// ────────────────────────────────────────────────
function SetupWizard({ onSetupComplete }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [sprintCount, setSprintCount] = useState(4);
  const [sprintDetails, setSprintDetails] = useState(
    Array.from({ length: 4 }, (_, i) => ({
      title: `Sprint ${i + 1}`,
      startDate: "",
      endDate: "",
    }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCountChange = (e) => {
    const val = e.target.value.trim();
    if (val === "") {
      setSprintCount("");
      return;
    }

    let count = parseInt(val, 10);
    count = Math.max(1, Math.min(20, count || 1));

    setSprintCount(count);

    setSprintDetails((prev) => {
      const newList = [...prev];
      while (newList.length < count) {
        newList.push({
          title: `Sprint ${newList.length + 1}`,
          startDate: "",
          endDate: "",
        });
      }
      while (newList.length > count) newList.pop();
      return newList;
    });
  };

  const handleDetailChange = (index, field, value) => {
    setSprintDetails((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const finalSprints = sprintDetails.map((s, i) => ({
        title: s.title.trim() || `Sprint ${i + 1}`,
        start_date: s.startDate || "",
        end_date: s.endDate || "",
      }));

      await onSetupComplete(title.trim() || "My Project", finalSprints);
    } catch (err) {
      alert("Failed to create sprints: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepInfo = () => {
    const steps = [
      { title: "Project Initialization", desc: "Give your project a name." },
      { title: "Sprint Configuration", desc: "How many sprints do you plan?" },
      { title: "Timeline Planning", desc: "Set start and end dates for each sprint." },
    ];
    return steps[step - 1] || {};
  };

  const { title: stepTitle, desc: stepDesc } = getStepInfo();

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Progress */}
        <div className="px-8 py-6 bg-slate-50/70 border-b">
          <div className="flex justify-between text-xs mb-2">
            <span className="font-bold text-violet-600 uppercase tracking-wide">
              Step {step} of 3
            </span>
            <span className="text-slate-400">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{stepTitle}</h2>
            <p className="text-slate-500">{stepDesc}</p>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Phoenix Redesign 2025"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-500"
                  autoFocus
                  disabled={isSubmitting}
                  onKeyDown={(e) => e.key === "Enter" && title.trim() && setStep(2)}
                />
              </div>
              <button
                onClick={() => title.trim() && setStep(2)}
                disabled={!title.trim() || isSubmitting}
                className="w-full py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Number of Sprints
                </label>
                <input
                  type="number"
                  value={sprintCount}
                  onChange={handleCountChange}
                  min={1}
                  max={20}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-500"
                  disabled={isSubmitting}
                  onKeyDown={(e) => e.key === "Enter" && sprintCount >= 1 && setStep(3)}
                />
                <p className="text-xs text-slate-400 mt-1.5 text-right">1 – 20 sprints</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  <ArrowLeft size={16} className="inline mr-2" />
                  Back
                </button>
                <button
                  onClick={() => sprintCount >= 1 && setStep(3)}
                  disabled={isSubmitting || sprintCount < 1}
                  className="flex-1 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="max-h-[340px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {sprintDetails.map((sprint, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-violet-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </div>
                      <input
                        type="text"
                        value={sprint.title}
                        onChange={(e) => handleDetailChange(i, "title", e.target.value)}
                        placeholder={`Sprint ${i + 1}`}
                        className="flex-1 bg-transparent border-none text-base font-semibold focus:outline-none text-slate-800"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Start</label>
                        <input
                          type="date"
                          value={sprint.startDate}
                          onChange={(e) => handleDetailChange(i, "startDate", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-1 focus:ring-violet-300"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">End</label>
                        <input
                          type="date"
                          value={sprint.endDate}
                          onChange={(e) => handleDetailChange(i, "endDate", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-1 focus:ring-violet-300"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  <ArrowLeft size={16} className="inline mr-2" />
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="flex-[2] py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Finish Setup <Check size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────
//  Sprint List / Dashboard View – with Backlog support
// ────────────────────────────────────────────────
function SprintList({ projectTitle, sprints, currentSprint, backlogCount, totalTasksCount, onReset, onRefresh, isRefreshing }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const sprintStats = useMemo(() => {
    let totalDays = 0;
    let earliest = null;
    let latest = null;

    const chartData = sprints.map((s) => {
      let duration = 0;
      if (s.start_date && s.end_date) {
        const start = new Date(s.start_date);
        const end = new Date(s.end_date);
        if (end >= start) {
          duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          totalDays += duration;

          if (!earliest || start < earliest) earliest = start;
          if (!latest || end > latest) latest = end;
        }
      }

      return {
        name: s.title,
        Duration: duration,
        Tasks: s.task_count || 0,
        Done: s.completed_count || 0,
      };
    });

    let totalProjectDays = 0;
    if (earliest && latest && latest >= earliest) {
      totalProjectDays = Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)) + 1;
    }

    const totalSprintTasks = sprints.reduce((sum, s) => sum + (s.task_count || 0), 0);
    const completedSprintTasks = sprints.reduce((sum, s) => sum + (s.completed_count || 0), 0);
    const sprintCompletion = totalSprintTasks > 0 ? Math.round((completedSprintTasks / totalSprintTasks) * 100) : 0;

    const backlogPct = totalTasksCount > 0 ? Math.round((backlogCount / totalTasksCount) * 100) : 0;

    const activeTasks = currentSprint
      ? (currentSprint.task_count || 0) - (currentSprint.completed_count || 0)
      : 0;

    return {
      chartData,
      totalProjectDays,
      avgSprintDays: sprints.length ? (totalDays / sprints.length).toFixed(1) : "0",
      sprintCompletion,
      totalSprintTasks,
      completedSprintTasks,
      activeTasks,
      backlogCount,
      backlogPct,
      totalTasksCount,
    };
  }, [sprints, currentSprint, backlogCount, totalTasksCount]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="bg-slate-800/95 text-white px-3 py-2 rounded-md text-xs shadow-xl border border-slate-700">
        <p className="font-semibold mb-1">{label}</p>
        <p className="text-violet-300">{p.Duration} days</p>
        {p.Tasks > 0 && (
          <p className="text-emerald-300 mt-1">
            {p.Done} / {p.Tasks} done
          </p>
        )}
      </div>
    );
  };

  const backlogStatus = sprintStats.backlogPct > 25 ? "high" : sprintStats.backlogPct > 10 ? "moderate" : "healthy";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/70">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{projectTitle}</h1>
            <p className="text-sm text-slate-500">
              {currentSprint ? `Active: ${currentSprint.title}` : "Sprint Overview"}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition"
          >
            <RefreshCw size={14} />
            Reset Project
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto">
        {/* Active Sprint Highlight */}
        {currentSprint && (
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-violet-200">
                    Active Sprint
                  </span>
                </div>
                <h3 className="text-2xl font-bold">{currentSprint.title}</h3>
                <p className="text-violet-100 mt-1">
                  {formatDate(currentSprint.start_date)} – {formatDate(currentSprint.end_date)}
                </p>
              </div>

              <div className="text-right">
                <div className="text-4xl font-bold">
                  {currentSprint.task_count > 0
                    ? Math.round((currentSprint.completed_count / currentSprint.task_count) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-violet-200 mt-1">
                  {currentSprint.completed_count} / {currentSprint.task_count} tasks
                </div>
                <div className="w-40 h-2 bg-violet-500/30 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-700"
                    style={{
                      width: `${
                        currentSprint.task_count > 0
                          ? (currentSprint.completed_count / currentSprint.task_count) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards – now including Backlog */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-violet-200 transition-colors group relative overflow-hidden">
            <Clock className="absolute -right-6 -top-6 w-28 h-28 text-violet-500 opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <Clock size={16} />
                <span className="text-sm font-medium">Project Timeline</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {sprintStats.totalProjectDays}
                <span className="text-xl font-normal text-slate-500 ml-1">days</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors group relative overflow-hidden">
            <BarChart3 className="absolute -right-6 -top-6 w-28 h-28 text-emerald-500 opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <BarChart3 size={16} />
                <span className="text-sm font-medium">Avg Sprint</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {sprintStats.avgSprintDays}
                <span className="text-xl font-normal text-slate-500 ml-1">days</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors group relative overflow-hidden">
            <CheckCircle2 className="absolute -right-6 -top-6 w-28 h-28 text-blue-500 opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <CheckCircle2 size={16} />
                <span className="text-sm font-medium">Sprint Progress</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {sprintStats.sprintCompletion}%
                <span className="text-xl font-normal text-slate-500 ml-1">done</span>
              </div>
              <div className="text-sm text-slate-500 mt-2">
                {sprintStats.completedSprintTasks} / {sprintStats.totalSprintTasks} tasks
              </div>
            </div>
          </div>

          {/* Backlog Card */}
          <div
            className={`bg-white p-6 rounded-2xl border shadow-sm transition-colors group relative overflow-hidden ${
              sprintStats.backlogPct > 25
                ? "border-amber-300 hover:border-amber-400"
                : sprintStats.backlogPct > 10
                ? "border-yellow-300 hover:border-yellow-400"
                : "border-green-300 hover:border-green-400"
            }`}
          >
            <Inbox className="absolute -right-6 -top-6 w-28 h-28 text-amber-500 opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <Inbox size={16} />
                <span className="text-sm font-medium">Backlog</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {sprintStats.backlogCount}
                <span className="text-xl font-normal text-slate-500 ml-1">tasks</span>
              </div>
              <div className="text-sm mt-2">
                <span
                  className={
                    sprintStats.backlogPct > 25
                      ? "text-amber-700 font-medium"
                      : sprintStats.backlogPct > 10
                      ? "text-yellow-700 font-medium"
                      : "text-green-700 font-medium"
                  }
                >
                  {sprintStats.backlogPct}% of all tasks
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              Sprint Duration Overview
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sprintStats.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Duration"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="url(#colorUv)"
                    activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Backlog Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
              <Inbox size={18} className="text-amber-600" />
              Backlog Overview
            </h3>

            <div className="flex-1 flex flex-col justify-center items-center text-center py-6">
              <div
                className={`text-5xl font-bold mb-3 ${
                  sprintStats.backlogPct > 25
                    ? "text-amber-600"
                    : sprintStats.backlogPct > 10
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {sprintStats.backlogCount}
              </div>
              <p className="text-xl font-medium text-slate-700 mb-2">Unassigned Tasks</p>
              <p className="text-sm text-slate-500 mb-6">
                {sprintStats.backlogPct}% of total tasks ({sprintStats.totalTasksCount})
              </p>

              <div
                className={`px-5 py-2 rounded-full text-sm font-medium ${
                  sprintStats.backlogPct > 25
                    ? "bg-amber-100 text-amber-800"
                    : sprintStats.backlogPct > 10
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {sprintStats.backlogPct > 25
                  ? "High – Consider grooming"
                  : sprintStats.backlogPct > 10
                  ? "Moderate"
                  : "Healthy – Well planned"}
              </div>
            </div>
          </div>
        </div>

        {/* Sprint Cards */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">All Sprints</h2>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-full">
              {sprints.length} sprints
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sprints.map((sprint) => {
              const isActive = currentSprint?.id === sprint.id;
              const pct = sprint.task_count > 0 ? Math.round((sprint.completed_count / sprint.task_count) * 100) : 0;

              return (
                <div
                  key={sprint.id}
                  className={`bg-white rounded-xl border shadow-sm hover:shadow transition-all flex flex-col overflow-hidden ${
                    isActive
                      ? "border-violet-400 ring-1 ring-violet-200/50"
                      : "border-slate-200 hover:border-violet-300"
                  }`}
                >
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2.5 rounded-lg ${isActive ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-500"}`}>
                        <List size={18} />
                      </div>
                      {isActive && (
                        <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-slate-800 mb-3 line-clamp-2">{sprint.title}</h3>

                    {sprint.task_count > 0 ? (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                          <span>
                            {sprint.completed_count} / {sprint.task_count}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isActive ? "bg-violet-500" : "bg-slate-400"} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic mb-4">No tasks in this sprint</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                      <Calendar size={14} />
                      <span>{formatDate(sprint.start_date)}</span>
                      <ArrowRight size={14} className="text-slate-300 mx-1" />
                      <span>{formatDate(sprint.end_date)}</span>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-100">
                    <button className="w-full py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition">
                      View Sprint Details
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Backlog pseudo-card (visual hint) */}
            {backlogCount > 0 && (
              <div
                className={`bg-white rounded-xl border shadow-sm hover:shadow transition-all flex flex-col overflow-hidden border-amber-300 hover:border-amber-400`}
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 rounded-lg bg-amber-100 text-amber-600">
                      <Inbox size={18} />
                    </div>
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                      Backlog
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-800 mb-3">Unassigned Tasks</h3>

                  <div className="mb-4">
                    <div className="text-3xl font-bold text-amber-700 mb-1">{backlogCount}</div>
                    <p className="text-sm text-slate-500">
                      {sprintStats.backlogPct}% of all tasks
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    <Clock size={14} />
                    <span>Needs planning</span>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-amber-100">
                  <button className="w-full py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition">
                    View Backlog Tasks
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}