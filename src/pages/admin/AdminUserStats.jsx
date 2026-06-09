import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getUserStatsSummary } from "../../services/statsService";
import { exportUsers, exportTickets, exportAuditLogs, exportLoginLogs } from "../../services/statsService";
import { formatDate } from "../../utils/helpers";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

const AdminUserStats = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserStatsSummary()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center py-32 gap-3">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-400">Loading user statistics...</span>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">User Statistics</h1>
          <p className="text-sm text-gray-500 mt-1">
            User activity overview, growth trends, and data exports.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Users",    value: data?.total,           color: "text-gray-800"   },
            { label: "Active",         value: data?.active,          color: "text-green-600"  },
            { label: "Inactive",       value: data?.inactive,        color: "text-red-500"    },
            { label: "Online Now",     value: data?.online,          color: "text-blue-600"   },
            { label: "New (7 days)",   value: data?.new_last_7_days, color: "text-purple-600" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value ?? "—"}</p>
            </div>
          ))}
        </div>

        {/* New Users Chart + Most Active side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* New Users Last 7 Days Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-1">New Users — Last 7 Days</h2>
            <p className="text-xs text-gray-400 mb-4">Daily registrations this week</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.new_per_day || []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="count" name="New Users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Most Active Users */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-1">Most Active Users</h2>
            <p className="text-xs text-gray-400 mb-4">Ranked by tickets + comments</p>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-center">Tickets</th>
                    <th className="px-3 py-2 text-center">Comments</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.most_active?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-400 py-6 text-xs">
                        No activity yet.
                      </td>
                    </tr>
                  ) : (
                    data?.most_active?.map((u, i) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                              {u.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-800">{u.name}</p>
                              <p className="text-[9px] text-gray-400 truncate max-w-[100px]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs font-bold text-blue-600">{u.tickets}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs font-bold text-green-600">{u.comments}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className={`w-2 h-2 rounded-full mx-auto ${
                            u.is_online ? "bg-green-500 animate-pulse" : "bg-gray-300"
                          }`}></div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Data Export Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-gray-700">Data Export</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Download system data as CSV files. Files download directly to your browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Export Users */}
            <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-blue-200 hover:bg-blue-50/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
                  👤
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Users List</p>
                  <p className="text-xs text-gray-400">
                    Name, email, status, login history
                  </p>
                </div>
              </div>
              <button
                onClick={exportUsers}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                ⬇️ CSV
              </button>
            </div>

            {/* Export Tickets */}
            <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-green-200 hover:bg-green-50/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-lg">
                  🎫
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Tickets Report</p>
                  <p className="text-xs text-gray-400">
                    Title, status, priority, assignment
                  </p>
                </div>
              </div>
              <button
                onClick={exportTickets}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all active:scale-95"
              >
                ⬇️ CSV
              </button>
            </div>

            {/* Export Audit Logs */}
            <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-purple-200 hover:bg-purple-50/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-lg">
                  📋
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Audit Logs</p>
                  <p className="text-xs text-gray-400">
                    All ticket actions and changes
                  </p>
                </div>
              </div>
              <button
                onClick={exportAuditLogs}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-all active:scale-95"
              >
                ⬇️ CSV
              </button>
            </div>

            {/* Export Login Logs */}
            <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-orange-200 hover:bg-orange-50/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-lg">
                  🔐
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Login Logs</p>
                  <p className="text-xs text-gray-400">
                    All login attempts with IP addresses
                  </p>
                </div>
              </div>
              <button
                onClick={exportLoginLogs}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-all active:scale-95"
              >
                ⬇️ CSV
              </button>
            </div>

          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminUserStats;