import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../../components/user/UserLayout";
import { PriorityBadge, StatusBadge } from "../../components/common/TicketBadge";
import { formatDate } from "../../utils/helpers";
import { getMyTickets } from "../../services/ticketService";

const ITEMS_PER_PAGE = 5;

const UserTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    getMyTickets()
      .then((res) => { setTickets(res.data); setFiltered(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    setCurrentPage(1); // reset to page 1 on filter change
  }, [search, statusFilter, priorityFilter, tickets]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Generate page numbers to show (max 5 buttons)
  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto py-10 px-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <nav className="flex items-center gap-2 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              <span>Platform</span>
              <span>/</span>
              <span className="text-[#450a0a] font-black">Ticket Registry</span>
            </nav>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tighter">
              My Support Archive
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium italic">
              Centralized repository for all your technical inquiries and their current resolution status.
            </p>
          </div>

          <button
            onClick={() => navigate("/user/create-ticket")}
            className="flex items-center gap-3 px-6 py-3 bg-[#450a0a] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded shadow-xl shadow-red-950/20 hover:bg-red-900 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Initialize New Query
          </button>
        </div>

        {/* Command Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px] relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#450a0a] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search registry by title or description..."
              className="w-full bg-white border border-slate-200 rounded-md pl-11 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#450a0a] transition-all placeholder:text-slate-300 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <select
              className="bg-white border border-slate-200 rounded-md px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#450a0a] cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              className="bg-white border border-slate-200 rounded-md px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#450a0a] cursor-pointer"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {/* Registry Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Title / Reference</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Priority Classification</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Agent Assignment</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Creation Date</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-[#450a0a] rounded-full animate-spin"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Querying database...</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No matching records found in registry.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-[#450a0a] transition-colors">
                          {ticket.title}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                          ID: #{ticket.id.toString().slice(-6)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${ticket.helper_id ? "bg-emerald-500" : "bg-slate-200"}`}></div>
                        <span className="text-xs font-bold text-slate-500">
                          {ticket.helper_id ? `Agent #${ticket.helper_id}` : "Pending Assignment"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-medium text-slate-500">
                        {formatDate(ticket.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button
                        onClick={() => navigate(`/user/tickets/${ticket.id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-[#450a0a] hover:text-white hover:border-[#450a0a] transition-all"
                      >
                        Details
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Bar — inside the table card */}
          {!loading && filtered.length > ITEMS_PER_PAGE && (
            <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50">

              {/* Record Info */}
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing{" "}
                <span className="text-slate-700">{startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}</span>
                {" "}of{" "}
                <span className="text-slate-700">{filtered.length}</span>{" "}records
              </p>

              {/* Page Buttons */}
              <div className="flex items-center gap-1">

                {/* Prev */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center w-8 h-8 rounded border border-slate-200 text-slate-500 hover:bg-[#450a0a] hover:text-white hover:border-[#450a0a] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-500 disabled:hover:border-slate-200 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* First page + ellipsis */}
                {getPageNumbers()[0] > 1 && (
                  <>
                    <button
                      onClick={() => goToPage(1)}
                      className="w-8 h-8 rounded border border-slate-200 text-[10px] font-black text-slate-500 hover:bg-[#450a0a] hover:text-white hover:border-[#450a0a] transition-all"
                    >
                      1
                    </button>
                    {getPageNumbers()[0] > 2 && (
                      <span className="w-8 h-8 flex items-center justify-center text-slate-300 text-xs">···</span>
                    )}
                  </>
                )}

                {/* Page numbers */}
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-8 h-8 rounded border text-[10px] font-black transition-all ${
                      currentPage === page
                        ? "bg-[#450a0a] text-white border-[#450a0a] shadow-lg shadow-red-950/20"
                        : "border-slate-200 text-slate-500 hover:bg-[#450a0a] hover:text-white hover:border-[#450a0a]"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Last page + ellipsis */}
                {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                  <>
                    {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                      <span className="w-8 h-8 flex items-center justify-center text-slate-300 text-xs">···</span>
                    )}
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="w-8 h-8 rounded border border-slate-200 text-[10px] font-black text-slate-500 hover:bg-[#450a0a] hover:text-white hover:border-[#450a0a] transition-all"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                {/* Next */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center w-8 h-8 rounded border border-slate-200 text-slate-500 hover:bg-[#450a0a] hover:text-white hover:border-[#450a0a] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-500 disabled:hover:border-slate-200 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

              </div>
            </div>
          )}
        </div>

        {/* Footer Statistics */}
        <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            System Status: <span className="text-emerald-500">Operational</span> • Total Records: {filtered.length}
          </p>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 leading-none">{tickets.filter(t => t.status === "resolved").length}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Resolved</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-100"></div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 leading-none">{tickets.filter(t => t.status === "pending").length}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Awaiting</p>
            </div>
          </div>
        </div>

      </div>
    </UserLayout>
  );
};

export default UserTickets;