import React, { useState, useEffect } from "react";
import { ChevronDown, Calendar, Clock, User } from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

export default function Timeline({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "Any",
    priority: "Any",
    sort: "Time Created"
  });

  useEffect(() => {
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
        
        console.log("📋 Tasks data:", data); // DEBUG
        
        // Flatten all tasks from all columns
        const allTasks = [
          ...data.todo,
          ...data.progress,
          ...data.review,
          ...data.done
        ];
        
        console.log("📋 All tasks:", allTasks); // DEBUG
        setTasks(allTasks);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTasks();
    }
  }, [user]);

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      console.log("🔍 Filtering task:", task.title, "Status:", task.status, "Filter:", filters.status); // DEBUG
      
      if (filters.status !== "Any") {
        const statusMap = {
          "To Do": "todo",
          "In Progress": "progress",
          "Review": "review",
          "Done": "done"
        };
        const mappedStatus = statusMap[filters.status];
        console.log("🔍 Mapped status:", mappedStatus, "Task status:", task.status); // DEBUG
        if (task.status !== mappedStatus) return false;
      }
      
      if (filters.priority !== "Any" && task.priority !== filters.priority) {
        console.log("🔍 Priority mismatch:", task.priority, "vs", filters.priority); // DEBUG
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "Time Created") {
        // Convert string IDs to numbers for comparison
        return parseInt(b.id) - parseInt(a.id);
      }
      if (filters.sort === "Due Date") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (filters.sort === "Priority") {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });

  console.log("✅ Filtered tasks:", filteredTasks.length, filteredTasks); // DEBUG

  const getStatusDisplay = (status) => {
    const statusMap = {
      todo: { emoji: "🟡", text: "To Do", color: "text-yellow-600" },
      progress: { emoji: "🔵", text: "In Progress", color: "text-blue-600" },
      review: { emoji: "🟣", text: "Review", color: "text-purple-600" },
      done: { emoji: "🟢", text: "Completed", color: "text-green-600" }
    };
    return statusMap[status] || { emoji: "⚪", text: status, color: "text-gray-600" };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full overflow-auto">
      <h1 className="text-2xl font-semibold mb-6">Timeline</h1>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border flex flex-wrap items-center gap-4 mb-6">
        
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">Status:</span>
          <select
            value={filters.status}
            onChange={(e) => {
              console.log("Status changed to:", e.target.value); // DEBUG
              setFilters({...filters, status: e.target.value});
            }}
            className="px-4 py-2 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition cursor-pointer"
          >
            <option>Any</option>
            <option>To Do</option>
            <option>In Progress</option>
            <option>Review</option>
            <option>Done</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">Priority:</span>
          <select
            value={filters.priority}
            onChange={(e) => {
              console.log("Priority changed to:", e.target.value); // DEBUG
              setFilters({...filters, priority: e.target.value});
            }}
            className="px-4 py-2 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition cursor-pointer"
          >
            <option>Any</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">Sort:</span>
          <select
            value={filters.sort}
            onChange={(e) => {
              console.log("Sort changed to:", e.target.value); // DEBUG
              setFilters({...filters, sort: e.target.value});
            }}
            className="px-4 py-2 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition cursor-pointer"
          >
            <option>Time Created</option>
            <option>Due Date</option>
            <option>Priority</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-500">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        {filteredTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 font-medium border-b">
                  <th className="pb-3 px-3">Name</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Priority</th>
                  <th className="pb-3 px-3">Sprint</th>
                  <th className="pb-3 px-3">Progress</th>
                  <th className="pb-3 px-3">Due Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => {
                  const statusInfo = getStatusDisplay(task.status);
                  return (
                    <tr key={task.id} className="border-b last:border-b-0 hover:bg-gray-50 transition">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {task.subtasks.completed}/{task.subtasks.total} subtasks
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <span className={`flex items-center gap-2 ${statusInfo.color}`}>
                          <span>{statusInfo.emoji}</span>
                          <span className="font-medium">{statusInfo.text}</span>
                        </span>
                      </td>
                      
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          task.priority === 'High' ? 'bg-red-50 text-red-700' :
                          task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {task.sprint_name || "No Sprint"}
                        </span>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 font-medium">{task.progress}%</span>
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <span className="text-sm text-gray-600">{formatDate(task.dueDate)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No tasks found</p>
          </div>
        )}
      </div>
    </div>
  );
}