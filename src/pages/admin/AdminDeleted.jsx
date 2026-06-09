import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import API from "../../services/api";
import { restoreTicket } from "../../services/ticketService";
import { restoreUser } from "../../services/userService";
import { permanentDeleteTicket } from "../../services/ticketService";
import { permanentDeleteUser } from "../../services/userService";
import { PriorityBadge, StatusBadge } from "../../components/common/TicketBadge";
import { formatDate } from "../../utils/helpers";

const ITEMS_PER_PAGE = 5;

const AdminDeleted = () => {
  const [tab, setTab] = useState("tickets");
  const [deletedTickets, setDeletedTickets] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketPage, setTicketPage] = useState(1);
  const [userPage, setUserPage] = useState(1);

  const fetchDeleted = async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([
        API.get("/deleted/tickets"),
        API.get("/deleted/users"),
      ]);
      setDeletedTickets(t.data);
      setDeletedUsers(u.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeleted(); }, []);

  const handleRestoreTicket = async (id) => {
    if (!window.confirm("Restore this ticket?")) return;
    await restoreTicket(id);
    fetchDeleted();
  };

  const handleRestoreUser = async (id) => {
    if (!window.confirm("Restore this user?")) return;
    await restoreUser(id);
    fetchDeleted();
  };

  const handlePermanentDeleteTicket = async (id, title) => {
    if (!window.confirm(
      `⚠️ PERMANENT DELETE\n\nAre you sure you want to permanently delete ticket "${title}"?\n\nThis action CANNOT be undone. All comments and audit logs will also be deleted.`
    )) return;
    try {
      await permanentDeleteTicket(id);
      fetchDeleted();
    } catch {
      alert("Failed to permanently delete ticket.");
    }
  };

  const handlePermanentDeleteUser = async (id, name) => {
    if (!window.confirm(
      `⚠️ PERMANENT DELETE\n\nAre you sure you want to permanently delete user "${name}"?\n\nThis action CANNOT be undone. The user account will be removed from the database forever.`
    )) return;
    try {
      await permanentDeleteUser(id);
      fetchDeleted();
    } catch {
      alert("Failed to permanently delete user.");
    }
  };

  // Pagination
  const paginate = (items, page) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return {
      items: items.slice(start, start + ITEMS_PER_PAGE),
      total: items.length,
      totalPages: Math.ceil(items.length / ITEMS_PER_PAGE),
      start,
    };
  };

  const PaginationBar = ({ page, totalPages, total, start, onPage, label }) =>
    totalPages > 1 ? (
      <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50 text-xs text-gray-500">
        <p>
          Showing{" "}
          <span className="font-semibold text-gray-700">{start + 1}–{Math.min(start + ITEMS_PER_PAGE, total)}</span>
          {" "}of{" "}
          <span className="font-semibold text-gray-700">{total}</span> {label}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => onPage(() => p)}
              className={`w-7 h-7 rounded border text-xs font-semibold transition-all ${
                page === p
                  ? "bg-red-600 text-white border-red-600"
                  : "border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    ) : null;

  const tData = paginate(deletedTickets, ticketPage);
  const uData = paginate(deletedUsers, userPage);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">🗑️ Deleted Items</h1>
          <p className="text-sm text-gray-500 mt-1">
            Restore items or permanently delete them. Permanent deletion cannot be undone.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Deleted Tickets</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{deletedTickets.length}</p>
            <p className="text-xs text-gray-400 mt-1">Can be restored or permanently removed</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Deleted Users</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{deletedUsers.length}</p>
            <p className="text-xs text-gray-400 mt-1">Can be restored or permanently removed</p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-red-500 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-700">Permanent deletion warning</p>
            <p className="text-xs text-red-600 mt-0.5">
              Permanently deleted records cannot be recovered. Use restore if you might need the data again.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("tickets")}
            className={`px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
              tab === "tickets"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🎫 Tickets ({deletedTickets.length})
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
              tab === "users"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            👤 Users ({deletedUsers.length})
          </button>
        </div>

        {/* Deleted Tickets Table */}
        {tab === "tickets" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">User ID</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-10">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : tData.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-10 italic text-xs">
                      No deleted tickets. 🎉
                    </td>
                  </tr>
                ) : (
                  tData.items.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-red-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700">{ticket.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">#{ticket.id}</p>
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                      <td className="px-4 py-3 text-gray-500">#{ticket.user_id}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(ticket.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Restore */}
                          <button
                            onClick={() => handleRestoreTicket(ticket.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-semibold hover:bg-green-100 transition-all"
                          >
                            ♻️ Restore
                          </button>
                          {/* Permanent Delete */}
                          <button
                            onClick={() => handlePermanentDeleteTicket(ticket.id, ticket.title)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all"
                          >
                            🗑️ Delete Forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <PaginationBar
              page={ticketPage}
              totalPages={tData.totalPages}
              total={tData.total}
              start={tData.start}
              onPage={setTicketPage}
              label="deleted tickets"
            />
          </div>
        )}

        {/* Deleted Users Table */}
        {tab === "users" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-10">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : uData.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-10 italic text-xs">
                      No deleted users. 🎉
                    </td>
                  </tr>
                ) : (
                  uData.items.map((user) => (
                    <tr key={user.id} className="hover:bg-red-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                            {user.name?.charAt(0)}
                          </div>
                          <p className="font-medium text-gray-700">{user.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Restore */}
                          <button
                            onClick={() => handleRestoreUser(user.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-semibold hover:bg-green-100 transition-all"
                          >
                            ♻️ Restore
                          </button>
                          {/* Permanent Delete */}
                          <button
                            onClick={() => handlePermanentDeleteUser(user.id, user.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all"
                          >
                            🗑️ Delete Forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <PaginationBar
              page={userPage}
              totalPages={uData.totalPages}
              total={uData.total}
              start={uData.start}
              onPage={setUserPage}
              label="deleted users"
            />
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminDeleted;