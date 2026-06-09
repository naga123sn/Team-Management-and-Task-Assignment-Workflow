import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../../components/user/UserLayout";
import { useAuth } from "../../context/AuthContext";
import { getMyTickets } from "../../services/ticketService";

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyTickets()
      .then((res) => {
        const tickets = res.data;
        setStats({
          total: tickets.length,
          pending: tickets.filter((t) => t.status === "pending").length,
          in_progress: tickets.filter((t) => t.status === "in_progress").length,
          resolved: tickets.filter((t) => t.status === "resolved").length,
        });
        // Show last 3 tickets as recent
        setRecentTickets(tickets.slice(-3).reverse());
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        setStats({ total: 0, pending: 0, in_progress: 0, resolved: 0 });
        setRecentTickets([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const priorityColor = (p) => ({
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  }[p] || "bg-gray-100 text-gray-600");

  const statusColor = (s) => ({
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    resolved: "bg-green-100 text-green-700",
  }[s] || "bg-gray-100 text-gray-600");

  const statusLabel = (s) => ({
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
  }[s] || s);

  return (
    <UserLayout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg uppercase">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome back, {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-sm text-gray-400">Loading your dashboard...</span>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Total Tickets
                </p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.total ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">All time</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-yellow-100">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Pending
                </p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats?.pending ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Awaiting action</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  In Progress
                </p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats?.in_progress ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Being worked on</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Resolved
                </p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats?.resolved ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Completed</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => navigate("/user/create-ticket")}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-5 text-left transition-all active:scale-95 shadow-sm"
              >
                <div className="text-2xl mb-2">🎫</div>
                <p className="font-bold text-sm">Create New Ticket</p>
                <p className="text-xs text-blue-200 mt-0.5">
                  Submit a new support request
                </p>
              </button>

              <button
                onClick={() => navigate("/user/tickets")}
                className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-5 text-left transition-all active:scale-95 shadow-sm"
              >
                <div className="text-2xl mb-2">📋</div>
                <p className="font-bold text-sm text-gray-800">View My Tickets</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Track your support history
                </p>
              </button>
            </div>

            {/* Recent Tickets */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-700">Recent Tickets</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Your latest submissions</p>
                </div>
                <button
                  onClick={() => navigate("/user/tickets")}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  View all →
                </button>
              </div>

              {recentTickets.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-3xl mb-3">🎫</p>
                  <p className="text-sm font-medium text-gray-500">No tickets yet</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">
                    Create your first support ticket to get started
                  </p>
                  <button
                    onClick={() => navigate("/user/create-ticket")}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                  >
                    Create Ticket
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3 text-left">Title</th>
                      <th className="px-6 py-3 text-left">Priority</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">{ticket.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">#{ticket.id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(ticket.status)}`}>
                            {statusLabel(ticket.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/user/tickets/${ticket.id}`)}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Resolution Rate */}
            {stats?.total > 0 && (
              <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Resolution Rate
                  </p>
                  <p className="text-xs font-bold text-green-600">
                    {Math.round((stats.resolved / stats.total) * 100)}%
                  </p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.round((stats.resolved / stats.total) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {stats.resolved} of {stats.total} tickets resolved
                </p>
              </div>
            )}

          </>
        )}
      </div>
    </UserLayout>
  );
};

export default UserDashboard;