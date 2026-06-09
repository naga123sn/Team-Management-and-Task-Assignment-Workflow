import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getLoginLogs, getLoginSummary } from "../../services/statsService";
import { formatDate } from "../../utils/helpers";

const ITEMS_PER_PAGE = 10;

const AdminLoginLogs = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (emailFilter) params.email = emailFilter;
    params.limit = 200;

    Promise.all([
      getLoginLogs(params),
      getLoginSummary(),
    ])
      .then(([logsRes, summaryRes]) => {
        setLogs(logsRes.data);
        setSummary(summaryRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  // Pagination
  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const statusConfig = {
    success: { color: "bg-green-100 text-green-700",  dot: "bg-green-500",  label: "Success"  },
    failed:  { color: "bg-red-100 text-red-700",      dot: "bg-red-500",    label: "Failed"   },
    blocked: { color: "bg-orange-100 text-orange-700", dot: "bg-orange-500", label: "Blocked"  },
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Login Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every login attempt — success, failure, and blocked access recorded here.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Attempts</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{summary?.total ?? "—"}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Successful</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{summary?.success ?? "—"}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Failed</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{summary?.failed ?? "—"}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Blocked</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{summary?.blocked ?? "—"}</p>
          </div>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by email..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={emailFilter}
            onChange={(e) => { setEmailFilter(e.target.value); setCurrentPage(1); }}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter(""); setEmailFilter(""); setCurrentPage(1); fetchLogs(); }}
            className="px-4 py-2 border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            🔄 Reset
          </button>
        </form>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">IP Address</th>
                <th className="px-4 py-3 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-10">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                      Loading logs...
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-10 italic text-xs">
                    No login attempts found.
                  </td>
                </tr>
              ) : (
                paginated.map((log, index) => {
                  const cfg = statusConfig[log.status] || statusConfig.failed;
                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        log.status === "blocked"
                          ? "bg-orange-50/20 hover:bg-orange-50/40"
                          : log.status === "failed"
                          ? "bg-red-50/10 hover:bg-red-50/30"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Row # */}
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {startIndex + index + 1}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{log.email}</p>
                        {log.user_id && (
                          <p className="text-[10px] text-gray-400">User ID: #{log.user_id}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`}></div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500">{log.reason || "—"}</p>
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-gray-500">
                          {log.ip_address || "—"}
                        </p>
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">
                          {formatDate(log.attempted_at)}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {!loading && logs.length > ITEMS_PER_PAGE && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, logs.length)}
                </span>
                {" "}of{" "}
                <span className="font-semibold text-gray-700">{logs.length}</span>
                {" "}logs
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={i} className="w-7 h-7 flex items-center justify-center text-gray-300 text-xs">···</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={`w-7 h-7 rounded border text-xs font-semibold transition-all ${
                          currentPage === p
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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

export default AdminLoginLogs;