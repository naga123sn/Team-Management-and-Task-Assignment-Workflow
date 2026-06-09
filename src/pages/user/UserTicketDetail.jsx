import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/user/UserLayout";
import { PriorityBadge, StatusBadge } from "../../components/common/TicketBadge";
import { formatDate, formatDateTime } from "../../utils/helpers";

import {
  getTicketById,
  addComment,
  deleteComment,
  getTicketActivity,
} from "../../services/ticketService";
import { useAuth } from "../../context/AuthContext";

const LOGS_PER_PAGE = 5;

const actionConfig = {
  TICKET_CREATED:   { icon: "🎫", color: "bg-blue-100 text-blue-700",     label: "Created"   },
  STATUS_CHANGED:   { icon: "🔄", color: "bg-purple-100 text-purple-700", label: "Status"    },
  PRIORITY_CHANGED: { icon: "🔺", color: "bg-orange-100 text-orange-700", label: "Priority"  },
  HELPER_ASSIGNED:  { icon: "👷", color: "bg-teal-100 text-teal-700",     label: "Assigned"  },
  COMMENT_ADDED:    { icon: "💬", color: "bg-green-100 text-green-700",   label: "Comment"   },
  COMMENT_DELETED:  { icon: "🗑", color: "bg-red-100 text-red-700",       label: "Deleted"   },
  TICKET_DELETED:   { icon: "🗑", color: "bg-red-100 text-red-700",       label: "Deleted"   },
  TICKET_RESTORED:  { icon: "♻️", color: "bg-green-100 text-green-700",   label: "Restored"  },
  AUTO_ASSIGNED: { icon: "🤖", color: "bg-blue-100 text-blue-700", label: "Auto Assigned" },
};

const UserTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);

  const fetchTicket = async () => {
    try {
      const res = await getTicketById(id);
      setTicket(res.data);
    } catch {
      setError("Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const res = await getTicketActivity(id);
      setAuditLogs(res.data);
    } catch {
      setAuditLogs([]);
    }
  };

  useEffect(() => {
    fetchTicket();
    fetchActivity();
    // eslint-disable-next-line
  }, [id]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await addComment(id, comment);
    setComment("");
    fetchTicket();
    fetchActivity();
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment(id, commentId);
      fetchTicket();
      fetchActivity();
    } catch {
      alert("Failed to delete comment.");
    }
  };

  // Audit log pagination
  const totalLogPages = Math.ceil(auditLogs.length / LOGS_PER_PAGE);
  const logStart = (logsPage - 1) * LOGS_PER_PAGE;
  const paginatedLogs = auditLogs.slice(logStart, logStart + LOGS_PER_PAGE);

  if (loading) return (
    <UserLayout>
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-[#450a0a] rounded-full animate-spin"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Loading ticket...
          </span>
        </div>
      </div>
    </UserLayout>
  );

  if (error) return (
    <UserLayout>
      <div className="max-w-7xl mx-auto py-10 px-6">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    </UserLayout>
  );

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto py-10 px-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          <span>Platform</span>
          <span>/</span>
          <button
            onClick={() => navigate("/user/tickets")}
            className="hover:text-[#450a0a] transition-colors"
          >
            Ticket Registry
          </button>
          <span>/</span>
          <span className="text-[#450a0a] font-black">#{ticket.id}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Main Content ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Ticket Info */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Incident Report
                </p>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
              <div className="px-6 py-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">
                  {ticket.title}
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>
              <div className="border-t border-slate-100 px-6 py-3 bg-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Submitted: {formatDate(ticket.created_at)}
                </p>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Activity Log — {ticket.comments?.length || 0} Comments
                </p>
              </div>
              <div className="px-6 py-4 space-y-3">
                {ticket.comments && ticket.comments.length > 0 ? (
                  ticket.comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start justify-between gap-4 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-slate-700 leading-relaxed">{c.comment}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
  {formatDateTime(c.created_at)}
</p>
                      </div>
                      {c.user_id === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-[9px] font-black uppercase tracking-widest"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                      No activity logged yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Add Comment */}
              <div className="border-t border-slate-100 px-6 py-4 bg-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  Add to Activity Log
                </p>
                <form onSubmit={handleComment} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Type your comment..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#450a0a] placeholder:text-slate-300 font-medium transition-all"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#450a0a] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-900 transition-all active:scale-95 shadow-lg shadow-red-950/20"
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>

            {/* ── Ticket Activity Timeline ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Ticket History
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    All updates, status changes and actions on this ticket
                  </p>
                </div>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  {auditLogs.length} events
                </span>
              </div>

              <div className="px-6 py-5">
                {auditLogs.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                      No history recorded yet.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Timeline */}
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100"></div>

                      <ul className="space-y-4">
                        {paginatedLogs.map((log) => {
                          const config = actionConfig[log.action] || {
                            icon: "📌",
                            color: "bg-gray-100 text-gray-600",
                            label: log.action,
                          };
                          return (
                            <li key={log.id} className="flex gap-4 pl-2">
                              {/* Icon bubble */}
                              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm shrink-0 ${config.color}`}>
                                {config.icon}
                              </div>

                              {/* Content */}
                              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${config.color}`}>
                                      {config.label}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700">
                                      {log.performed_by}
                                    </span>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      log.performed_by_role === "admin"
                                        ? "bg-blue-50 text-blue-500"
                                        : "bg-green-50 text-green-500"
                                    }`}>
                                      {log.performed_by_role}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0">
  {formatDateTime(log.created_at)}
</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {log.description}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Pagination */}
                    {auditLogs.length > LOGS_PER_PAGE && (
                      <div className="mt-5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-4">
                        <p>
                          Showing{" "}
                          <span className="font-semibold text-slate-700">
                            {logStart + 1}–{Math.min(logStart + LOGS_PER_PAGE, auditLogs.length)}
                          </span>
                          {" "}of{" "}
                          <span className="font-semibold text-slate-700">{auditLogs.length}</span>
                          {" "}events
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                            disabled={logsPage === 1}
                            className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-[#450a0a] hover:text-white hover:border-[#450a0a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          {Array.from({ length: totalLogPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setLogsPage(page)}
                              className={`w-7 h-7 rounded border text-xs font-semibold transition-all ${
                                logsPage === page
                                  ? "bg-[#450a0a] text-white border-[#450a0a]"
                                  : "border-slate-200 text-slate-500 hover:bg-[#450a0a] hover:text-white hover:border-[#450a0a]"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setLogsPage(p => Math.min(totalLogPages, p + 1))}
                            disabled={logsPage === totalLogPages}
                            className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-[#450a0a] hover:text-white hover:border-[#450a0a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-4">

            {/* Status Panel */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Ticket Details
                </p>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="w-full h-px bg-slate-100"></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Priority</p>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="w-full h-px bg-slate-100"></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Assigned Agent
                  </p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ticket.helper_id ? "bg-emerald-500" : "bg-slate-200"}`}></div>
                    <span className="text-xs font-bold text-slate-600">
                      {ticket.helper_id ? `Agent #${ticket.helper_id}` : "Pending Assignment"}
                    </span>
                  </div>
                </div>
                <div className="w-full h-px bg-slate-100"></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Submitted On
                  </p>
                  <p className="text-xs font-bold text-slate-600">{formatDate(ticket.created_at)}</p>
                </div>
                <div className="w-full h-px bg-slate-100"></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Ticket Reference
                  </p>
                  <p className="text-xs font-bold text-slate-600">#{ticket.id}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Activity Summary
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Total Events</span>
                  <span className="text-xs font-bold text-slate-700">{auditLogs.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Comments</span>
                  <span className="text-xs font-bold text-slate-700">{ticket.comments?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Status Changes</span>
                  <span className="text-xs font-bold text-slate-700">
                    {auditLogs.filter(l => l.action === "STATUS_CHANGED").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <button
              onClick={() => navigate("/user/tickets")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Registry
            </button>

          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserTicketDetail;