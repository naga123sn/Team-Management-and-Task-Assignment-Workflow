import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { PriorityBadge, StatusBadge } from "../../components/common/TicketBadge";
import { formatDate } from "../../utils/helpers";
import { getAllTickets, softDeleteTicket } from "../../services/ticketService";

const ITEMS_PER_PAGE = 5;

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const fetchTickets = () => {
    setLoading(true);
    getAllTickets()
      .then((res) => { setTickets(res.data); setFiltered(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  useEffect(() => {
    let result = tickets;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((t) => t.status === statusFilter);
    if (priorityFilter) result = result.filter((t) => t.priority === priorityFilter);
    setFiltered(result);
    setCurrentPage(1);
  }, [search, statusFilter, priorityFilter, tickets]);

  const handleDelete = async (id) => {
    if (!window.confirm("Soft delete this ticket? It can be restored later from Deleted Items.")) return;
    try {
      await softDeleteTicket(id);
      fetchTickets();
    } catch {
      alert("Failed to delete ticket.");
    }
  };

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">All Tickets</h1>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search tickets..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">User ID</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Assigned To</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">
                  No tickets found.
                </td>
              </tr>
            ) : (
              paginated.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{ticket.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">#{ticket.id}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">#{ticket.user_id}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="px-4 py-3 text-gray-500">
                    {ticket.helper_id ? `Helper #${ticket.helper_id}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(ticket.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        View
                      </button>
                      <span className="text-gray-200 select-none">|</span>
                      <button
                        onClick={() => handleDelete(ticket.id)}
                        className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {!loading && filtered.length > ITEMS_PER_PAGE && (
          <div className="border-t border-gray-100 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}
              </span>
              {" "}of{" "}
              <span className="font-semibold text-gray-700">{filtered.length}</span>
              {" "}tickets
            </p>

            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* First + ellipsis */}
              {getPageNumbers()[0] > 1 && (
                <>
                  <button
                    onClick={() => goToPage(1)}
                    className="w-8 h-8 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    1
                  </button>
                  {getPageNumbers()[0] > 2 && (
                    <span className="w-8 h-8 flex items-center justify-center text-gray-300 text-sm">···</span>
                  )}
                </>
              )}

              {/* Page numbers */}
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

              {/* Last + ellipsis */}
              {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                <>
                  {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                    <span className="w-8 h-8 flex items-center justify-center text-gray-300 text-sm">···</span>
                  )}
                  <button
                    onClick={() => goToPage(totalPages)}
                    className="w-8 h-8 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              {/* Next */}
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
        <p>Total: <span className="font-semibold text-gray-600">{tickets.length}</span> tickets</p>
        <div className="flex items-center gap-4">
          <span>Pending: <span className="font-semibold text-yellow-600">{tickets.filter(t => t.status === "pending").length}</span></span>
          <span>In Progress: <span className="font-semibold text-blue-600">{tickets.filter(t => t.status === "in_progress").length}</span></span>
          <span>Resolved: <span className="font-semibold text-green-600">{tickets.filter(t => t.status === "resolved").length}</span></span>
        </div>
      </div>

    </AdminLayout>
  );
};

export default AdminTickets;