import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAllUsers, updateUserStatus, softDeleteUser, unblockUser, updateAgentLevel } from "../../services/userService";
import { formatDate } from "../../utils/helpers";

const ITEMS_PER_PAGE = 5;

const agentLevelConfig = {
  junior: { label: "🟢 Junior",    color: "bg-green-100 text-green-700"  },
  mid:    { label: "🟡 Mid-level", color: "bg-yellow-100 text-yellow-700" },
  senior: { label: "🔴 Senior",    color: "bg-red-100 text-red-700"      },
};

const AdminUsers = () => {
  const [users, setUsers]         = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = () => {
    setLoading(true);
    getAllUsers()
      .then((res) => { setUsers(res.data); setFiltered(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    const result = users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
    setFiltered(result);
    setCurrentPage(1);
  }, [search, users]);

  const handleToggle = async (id, is_active) => {
    await updateUserStatus(id, !is_active);
    fetchUsers();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Soft delete this user? They can be restored later.")) return;
    try {
      await softDeleteUser(id);
      fetchUsers();
    } catch {
      alert("Failed to delete user.");
    }
  };

  const handleUnblock = async (id) => {
    try {
      await unblockUser(id);
      fetchUsers();
    } catch {
      alert("Failed to unblock user.");
    }
  };

  const handleAgentLevel = async (id, level) => {
    try {
      await updateAgentLevel(id, level || null);
      fetchUsers();
    } catch {
      alert("Failed to update agent level.");
    }
  };

  // Pagination
  const totalPages  = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex  = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated   = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const onlineCount  = users.filter(u => u.is_online).length;
  const blockedCount = users.filter(u => u.is_blocked).length;
  const agentCount   = users.filter(u => u.agent_level).length;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage Users</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Users</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Currently Online</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Blocked Users</p>
          <div className="flex items-center gap-2 mt-1">
            {blockedCount > 0 && <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>}
            <p className={`text-2xl font-bold ${blockedCount > 0 ? "text-orange-500" : "text-gray-800"}`}>
              {blockedCount}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Agents Assigned</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg">🤖</span>
            <p className="text-2xl font-bold text-blue-600">{agentCount}</p>
          </div>
        </div>
      </div>

      {/* Search + Refresh + Blocked warning */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or email..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={fetchUsers}
          className="px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          🔄 Refresh
        </button>
        {blockedCount > 0 && (
          <span className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg">
            ⚠️ {blockedCount} user{blockedCount > 1 ? "s" : ""} blocked
          </span>
        )}
      </div>

      {/* Agent Level Legend */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Auto-Assignment Levels:</p>
        {Object.entries(agentLevelConfig).map(([key, val]) => (
          <span key={key} className={`text-[10px] font-bold px-2 py-1 rounded-full ${val.color}`}>
            {val.label}
          </span>
        ))}
        <span className="text-[10px] text-gray-400 font-medium">
          — Assign levels so tickets auto-route to the right agent
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Session</th>
              <th className="px-4 py-3 text-left">Agent Level</th>
              <th className="px-4 py-3 text-left">Last Login</th>
              <th className="px-4 py-3 text-left">Last Logout</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center text-gray-400 py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-gray-400 py-8">No users found.</td>
              </tr>
            ) : (
              paginated.map((u, index) => (
                <tr
                  key={u.id}
                  className={`hover:bg-gray-50 transition-colors ${u.is_blocked ? "bg-orange-50/30" : ""}`}
                >
                  {/* Row # */}
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {startIndex + index + 1}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                        u.is_blocked ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {u.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{u.name}</p>
                        <p className="text-[10px] text-gray-400">ID: #{u.id}</p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>

                  {/* Active Status */}
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Session / Online / Blocked */}
                  <td className="px-4 py-3">
                    {u.is_blocked ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <span className="text-xs font-bold text-orange-500">Blocked</span>
                        </div>
                        <p className="text-[10px] text-orange-400 mt-0.5">
                          {u.failed_login_attempts} failed attempts
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${
                          u.is_online ? "bg-green-500 animate-pulse" : "bg-gray-300"
                        }`}></div>
                        <span className={`text-xs font-semibold ${
                          u.is_online ? "text-green-600" : "text-gray-400"
                        }`}>
                          {u.is_online ? "Online" : "Offline"}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Agent Level */}
                  <td className="px-4 py-3">
                    <select
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
                      value={u.agent_level || ""}
                      onChange={(e) => handleAgentLevel(u.id, e.target.value)}
                    >
                      <option value="">No Level</option>
                      <option value="junior">🟢 Junior</option>
                      <option value="mid">🟡 Mid-level</option>
                      <option value="senior">🔴 Senior</option>
                    </select>
                    {u.agent_level && (
                      <p className="text-[9px] text-gray-400 mt-0.5 font-medium">
                        Auto-receives {u.agent_level === "senior" ? "🔴 High" : u.agent_level === "mid" ? "🟡 Medium" : "🟢 Low"} priority tickets
                      </p>
                    )}
                  </td>

                  {/* Last Login */}
                  <td className="px-4 py-3">
                    {u.last_login ? (
                      <p className="text-xs text-gray-600 font-medium">{formatDate(u.last_login)}</p>
                    ) : (
                      <span className="text-xs text-gray-300 italic">Never</span>
                    )}
                  </td>

                  {/* Last Logout */}
                  <td className="px-4 py-3">
                    {u.last_logout ? (
                      <p className="text-xs text-gray-600 font-medium">{formatDate(u.last_logout)}</p>
                    ) : (
                      <span className="text-xs text-gray-300 italic">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(u.id, u.is_active)}
                          className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                            u.is_active
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <span className="text-gray-200 select-none">|</span>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                      {u.is_blocked && (
                        <button
                          onClick={() => handleUnblock(u.id)}
                          className="text-xs px-3 py-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors w-fit flex items-center gap-1"
                        >
                          🔓 Unblock
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && filtered.length > ITEMS_PER_PAGE && (
          <div className="border-t border-gray-100 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}
              </span>
              {" "}of{" "}
              <span className="font-semibold text-gray-700">{filtered.length}</span>
              {" "}users
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {getPageNumbers()[0] > 1 && (
                <>
                  <button onClick={() => goToPage(1)}
                    className="w-8 h-8 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all">
                    1
                  </button>
                  {getPageNumbers()[0] > 2 && (
                    <span className="w-8 h-8 flex items-center justify-center text-gray-300 text-sm">···</span>
                  )}
                </>
              )}

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-all ${
                    currentPage === page
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {page}
                </button>
              ))}

              {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                <>
                  {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                    <span className="w-8 h-8 flex items-center justify-center text-gray-300 text-sm">···</span>
                  )}
                  <button onClick={() => goToPage(totalPages)}
                    className="w-8 h-8 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all">
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <p>Total: <span className="font-semibold text-gray-600">{users.length}</span> users</p>
        <div className="flex items-center gap-4">
          <span>Online: <span className="font-semibold text-green-600">{onlineCount}</span></span>
          <span>Active: <span className="font-semibold text-blue-600">{users.filter(u => u.is_active).length}</span></span>
          <span>Inactive: <span className="font-semibold text-red-500">{users.filter(u => !u.is_active).length}</span></span>
          <span>Blocked: <span className="font-semibold text-orange-500">{blockedCount}</span></span>
          <span>Agents: <span className="font-semibold text-purple-600">{agentCount}</span></span>
        </div>
      </div>

    </AdminLayout>
  );
};

export default AdminUsers;