import React, { useState, useEffect } from "react";
import { Clock, AlertCircle, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

export default function Summary({ user }) {
  console.log("👤 USER PROP:", user); // DEBUG

  const [stats, setStats] = useState({
    open_tasks: 0,
    overdue: 0,
    sprints_active: 0,
    completed_this_week: 0,
    total_sprints: 0,
    completion_rate: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      // Handle both array format [id, name] and object format {id, name}
      const userId = Array.isArray(user) ? user[0] : user?.id;
      
      console.log("👤 Extracted User ID:", userId); // DEBUG
      
      if (!userId) {
        console.log("❌ No user ID found");
        setLoading(false);
        return;
      }
      
      console.log("✅ Fetching summary for user:", userId);
      
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/summary/?user_id=${userId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        console.log("✅ Summary data received:", data);
        
        setStats(data.stats || {
          open_tasks: 0,
          overdue: 0,
          sprints_active: 0,
          completed_this_week: 0,
          total_sprints: 0,
          completion_rate: 0
        });
        setRecentActivity(data.recent_activity || []);
      } catch (err) {
        console.error("❌ Failed to fetch summary:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSummary();
    } else {
      console.log("❌ No user prop provided");
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      id: 1, 
      title: "Open tasks", 
      value: stats.open_tasks,
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    { 
      id: 2, 
      title: "Overdue", 
      value: stats.overdue,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50"
    },
    { 
      id: 3, 
      title: "Sprints active", 
      value: stats.sprints_active,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    { 
      id: 4, 
      title: "Completed this week", 
      value: stats.completed_this_week,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    { 
      id: 5, 
      title: "Total sprints", 
      value: stats.total_sprints,
      icon: Calendar,
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    { 
      id: 6, 
      title: "Completion rate", 
      value: `${stats.completion_rate}%`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    }
  ];

  return (
    <div className="p-6 w-full overflow-auto">
      <h1 className="text-2xl font-semibold mb-6">Summary</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {statCards.map(s => (
          <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-500 font-medium">{s.title}</div>
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="text-gray-900 font-semibold mb-4 text-lg">Recent Activity</div>
        {recentActivity.length > 0 ? (
          <ul className="space-y-3">
            {recentActivity.map((activity, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 pb-3 border-b last:border-b-0">
                <div className={`p-1.5 rounded-lg mt-0.5 ${
                  activity.type === 'created' ? 'bg-green-50' :
                  activity.type === 'status_change' ? 'bg-blue-50' :
                  activity.type === 'completed' ? 'bg-purple-50' : 'bg-gray-50'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'created' ? 'bg-green-500' :
                    activity.type === 'status_change' ? 'bg-blue-500' :
                    activity.type === 'completed' ? 'bg-purple-500' : 'bg-gray-500'
                  }`}></div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time_ago}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No recent activity</p>
        )}
      </div>
    </div>
  );
}