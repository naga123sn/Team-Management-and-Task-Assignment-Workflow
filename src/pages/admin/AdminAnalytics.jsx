import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAnalytics } from "../../services/statsService";
import { formatDate } from "../../utils/helpers";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#f59e0b", "#3b82f6", "#10b981"];

const StatCard = ({ label, value, sub, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState("bar"); // "bar" | "line"
  const [resPage, setResPage] = useState(1);
  const RES_PER_PAGE = 5;

  useEffect(() => {
    getAnalytics()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center py-32 gap-3">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-400">Loading analytics...</span>
      </div>
    </AdminLayout>
  );

  if (!data) return (
    <AdminLayout>
      <p className="text-red-500 text-sm">Failed to load analytics.</p>
    </AdminLayout>
  );

  // Resolution table pagination
  const totalResPages = Math.ceil(data.resolution_list.length / RES_PER_PAGE);
  const resStart = (resPage - 1) * RES_PER_PAGE;
  const paginatedRes = data.resolution_list.slice(resStart, resStart + RES_PER_PAGE);

  const priorityColor = (p) => ({
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  }[p] || "bg-gray-100 text-gray-600");

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            System-wide ticket trends, resolution performance, and user activity.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Tickets"
            value={data.status_breakdown.reduce((a, b) => a + b.count, 0)}
            color="text-gray-800"
          />
          <StatCard
            label="Avg Resolution"
            value={`${data.avg_resolution_hours}h`}
            sub="Average time to resolve"
            color="text-blue-600"
          />
          <StatCard
            label="Resolved"
            value={data.status_breakdown.find(s => s.status === "Resolved")?.count || 0}
            color="text-green-600"
          />
          <StatCard
            label="Pending"
            value={data.status_breakdown.find(s => s.status === "Pending")?.count || 0}
            color="text-yellow-600"
          />
        </div>

        {/* Tickets Per Day Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-gray-700">Tickets Per Day</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 14 days</p>
            </div>
            {/* Toggle Bar / Line */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setChartType("bar")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  chartType === "bar"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  chartType === "line"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Line
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            {chartType === "bar" ? (
              <BarChart data={data.tickets_per_day} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="count" name="Tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={data.tickets_per_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Tickets"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Status Pie + User Stats side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Donut Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-1">Status Breakdown</h2>
            <p className="text-xs text-gray-400 mb-4">Distribution of all tickets by status</p>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.status_breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, percent }) =>
                      percent > 0 ? `${status} ${(percent * 100).toFixed(0)}%` : ""
                    }
                    labelLine={false}
                  >
                    {data.status_breakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ fontSize: 12, color: "#64748b" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-1">User Activity</h2>
            <p className="text-xs text-gray-400 mb-4">Ticket count per user</p>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2.5 text-left">User</th>
                    <th className="px-4 py-2.5 text-center">Total</th>
                    <th className="px-4 py-2.5 text-center">Resolved</th>
                    <th className="px-4 py-2.5 text-center">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.user_stats.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-400 py-6 text-xs">
                        No data yet.
                      </td>
                    </tr>
                  ) : (
                    data.user_stats.map((u, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-700">{u.name}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-800">{u.total}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-green-600 font-semibold">{u.resolved}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-yellow-600 font-semibold">{u.pending}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resolution Time Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-700">Resolution Time — Resolved Tickets</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Time taken from creation to resolution per ticket
              </p>
            </div>
            <div className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg">
              Avg: {data.avg_resolution_hours}h
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left">Ticket ID</th>
                  <th className="px-4 py-2.5 text-left">Title</th>
                  <th className="px-4 py-2.5 text-left">User</th>
                  <th className="px-4 py-2.5 text-left">Priority</th>
                  <th className="px-4 py-2.5 text-right">Resolution Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedRes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-8 text-xs">
                      No resolved tickets yet.
                    </td>
                  </tr>
                ) : (
                  paginatedRes.map((t) => (
                    <tr key={t.ticket_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">#{t.ticket_id}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{t.title}</td>
                      <td className="px-4 py-3 text-gray-500">{t.user}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold text-sm ${
                          t.resolution_hours < 24
                            ? "text-green-600"
                            : t.resolution_hours < 72
                            ? "text-yellow-600"
                            : "text-red-500"
                        }`}>
                          {t.resolution_hours}h
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for resolution table */}
          {data.resolution_list.length > RES_PER_PAGE && (
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <p>
                Showing {resStart + 1}–{Math.min(resStart + RES_PER_PAGE, data.resolution_list.length)} of {data.resolution_list.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setResPage(p => Math.max(1, p - 1))}
                  disabled={resPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: totalResPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setResPage(page)}
                    className={`w-7 h-7 rounded border text-xs font-semibold transition-all ${
                      resPage === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setResPage(p => Math.min(totalResPages, p + 1))}
                  disabled={resPage === totalResPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;