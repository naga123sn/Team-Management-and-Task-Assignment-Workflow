import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { PriorityBadge, StatusBadge } from "../../components/common/TicketBadge";
import { formatDate } from "../../utils/helpers";
import {
  getTicketById,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  addComment,
  getAuditLogs,
} from "../../services/ticketService";
import { getAllHelpers } from "../../services/userService";
import { notifyTicketViewed } from "../../services/notificationService";
import { getAllTeams } from "../../services/teamService";
import API from "../../services/api";

const LOGS_PER_PAGE = 5;

const actionConfig = {
  TICKET_CREATED:   { icon: "🎫", color: "bg-blue-100 text-blue-700",     label: "Created"       },
  STATUS_CHANGED:   { icon: "🔄", color: "bg-purple-100 text-purple-700", label: "Status"        },
  PRIORITY_CHANGED: { icon: "🔺", color: "bg-orange-100 text-orange-700", label: "Priority"      },
  HELPER_ASSIGNED:  { icon: "👷", color: "bg-teal-100 text-teal-700",     label: "Assigned"      },
  COMMENT_ADDED:    { icon: "💬", color: "bg-green-100 text-green-700",   label: "Comment"       },
  COMMENT_DELETED:  { icon: "🗑",  color: "bg-red-100 text-red-700",      label: "Deleted"       },
  TICKET_DELETED:   { icon: "🗑",  color: "bg-red-100 text-red-700",      label: "Deleted"       },
  TICKET_RESTORED:  { icon: "♻️", color: "bg-green-100 text-green-700",   label: "Restored"      },
  AUTO_ASSIGNED:    { icon: "🤖", color: "bg-blue-100 text-blue-700",     label: "Auto Assigned" },
};

const AdminTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket]           = useState(null);
  const [helpers, setHelpers]         = useState([]);
  const [teams, setTeams]             = useState([]);
  const [comment, setComment]         = useState("");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [auditLogs, setAuditLogs]     = useState([]);
  const [logsPage, setLogsPage]       = useState(1);
  const [notified, setNotified]       = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [allUsers, setAllUsers]       = useState([]);
  const [autoAssignResult, setAutoAssignResult] = useState(null);
  const [slaLoading, setSlaLoading]   = useState(false);
  const [dueDateInput, setDueDateInput] = useState("");
  // Local team_id state so UI updates instantly without relying on fetchTicket returning team_id
  const [localTeamId, setLocalTeamId] = useState(null);

  const fetchTicket = async () => {
    try {
      const res = await getTicketById(id);
      setTicket(res.data);
      // Sync localTeamId from fetched ticket (in case backend does return it)
      if (res.data.team_id != null) {
        setLocalTeamId(res.data.team_id);
      }
    } catch {
      setError("Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await getAuditLogs(id);
      setAuditLogs(res.data);
    } catch {
      setAuditLogs([]);
    }
  };

  useEffect(() => {
    fetchTicket();
    fetchAuditLogs();
    getAllHelpers().then((res) => setHelpers(res.data)).catch(() => {});
    API.get("/users").then((res) => setAllUsers(res.data)).catch(() => {});
    getAllTeams()
      .then((res) => {
        console.log("Teams:", res.data);
        setTeams(res.data);
      })
      .catch((err) => console.error("Teams fetch error:", err));

    if (!notified) {
      notifyTicketViewed(id).catch(() => {});
      setNotified(true);
    }
    // eslint-disable-next-line
  }, [id]);

  // Once both ticket and teams are loaded, sync localTeamId and due date
  useEffect(() => {
    if (ticket && ticket.team_id != null && localTeamId == null) {
      setLocalTeamId(ticket.team_id);
    }
    // Sync due date input
    if (ticket?.due_date) {
      const d = new Date(ticket.due_date);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16);
      setDueDateInput(local);
    }
    // eslint-disable-next-line
  }, [ticket, teams]);

  const handleStatusChange = async (e) => {
    await updateTicketStatus(id, e.target.value);
    fetchTicket();
    fetchAuditLogs();
  };

  const handlePriorityChange = async (e) => {
    await updateTicketPriority(id, e.target.value);
    fetchTicket();
    fetchAuditLogs();
  };

  const handleAssignHelper = async (e) => {
    if (!e.target.value) return;
    await assignTicket(id, parseInt(e.target.value));
    fetchTicket();
    fetchAuditLogs();
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await addComment(id, comment);
    setComment("");
    fetchTicket();
    fetchAuditLogs();
  };

  // Audit log pagination
  const totalLogPages = Math.ceil(auditLogs.length / LOGS_PER_PAGE);
  const logStart      = (logsPage - 1) * LOGS_PER_PAGE;
  const paginatedLogs = auditLogs.slice(logStart, logStart + LOGS_PER_PAGE);

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center py-32 gap-3">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-400">Loading ticket...</span>
      </div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout>
      <p className="text-red-500 text-sm p-6">{error}</p>
    </AdminLayout>
  );

  // Use localTeamId (kept in sync manually) because fetchTicket may not return team_id from backend
  const assignedTeam = teams.find((t) => Number(t.id) === Number(localTeamId));

  return (
    <AdminLayout>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 hover:underline mb-4 inline-flex items-center gap-1"
      >
        ← Back to Tickets
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Main Content ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Ticket Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h1 className="text-xl font-bold text-gray-800 mb-2">{ticket.title}</h1>
            <div className="flex gap-2 mb-4 flex-wrap">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              {assignedTeam && (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                  🏢 {assignedTeam.team_name}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{ticket.description}</p>
            <p className="text-xs text-gray-400 mt-4">
              Created: {formatDate(ticket.created_at)}
            </p>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Comments ({ticket.comments?.length || 0})
            </h2>
            {ticket.comments && ticket.comments.length > 0 ? (
              <ul className="space-y-3 mb-4">
                {ticket.comments.map((c) => (
                  <li key={c.id} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                    <p>{c.comment}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(c.created_at)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No comments yet.</p>
            )}
            <form onSubmit={handleComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
              >
                Post
              </button>
            </form>
          </div>

          {/* Audit Log */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-700">Audit Log</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Complete history of all actions on this ticket
                </p>
              </div>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                {auditLogs.length} events
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-gray-400 italic">No activity recorded yet.</p>
              </div>
            ) : (
              <>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100"></div>
                  <ul className="space-y-4">
                    {paginatedLogs.map((log) => {
                      const config = actionConfig[log.action] || {
                        icon: "📌",
                        color: "bg-gray-100 text-gray-600",
                        label: log.action,
                      };
                      return (
                        <li key={log.id} className="flex gap-4 pl-2">
                          <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm shrink-0 ${config.color}`}>
                            {config.icon}
                          </div>
                          <div className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${config.color}`}>
                                  {config.label}
                                </span>
                                <span className="text-xs font-semibold text-gray-700">
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
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {formatDate(log.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {log.description}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {auditLogs.length > LOGS_PER_PAGE && (
                  <div className="mt-5 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-4">
                    <p>
                      Showing{" "}
                      <span className="font-semibold text-gray-700">
                        {logStart + 1}–{Math.min(logStart + LOGS_PER_PAGE, auditLogs.length)}
                      </span>
                      {" "}of{" "}
                      <span className="font-semibold text-gray-700">{auditLogs.length}</span>
                      {" "}events
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                        disabled={logsPage === 1}
                        className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setLogsPage(p => Math.min(totalLogPages, p + 1))}
                        disabled={logsPage === totalLogPages}
                        className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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

        {/* ── Right: Controls Sidebar ── */}
        <div className="space-y-4">

          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">STATUS</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={ticket.status}
                onChange={handleStatusChange}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">PRIORITY</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={ticket.priority}
                onChange={handlePriorityChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Assign Helper */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                ASSIGN TO HELPER
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={ticket.helper_id || ""}
                onChange={handleAssignHelper}
              >
                <option value="">Unassigned</option>
                {helpers.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Assign Team */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">
                ASSIGN TO TEAM
              </label>

              {/* Current team display */}
              {assignedTeam ? (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🏢</span>
                    <span className="text-xs font-bold text-indigo-700">{assignedTeam.team_name}</span>
                  </div>
                  <button
                    onClick={async () => {
                      setTeamLoading(true);
                      try {
                        await API.patch(`/teams/remove-ticket/${id}`);
                        setLocalTeamId(null);
                        await fetchTicket();
                        await fetchAuditLogs();
                      } catch (err) {
                        alert("Failed to unassign team.");
                      } finally {
                        setTeamLoading(false);
                      }
                    }}
                    disabled={teamLoading}
                    className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-wider disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic mb-2">No team assigned</p>
              )}

              {/* Team buttons list */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {teams.length === 0 ? (
                  <p className="text-xs text-gray-300 italic">No teams available</p>
                ) : (
                  teams.map((t) => {
                    const isAssigned = Number(localTeamId) === Number(t.id);
                    return (
                      <button
                        key={t.id}
                        disabled={teamLoading}
                        onClick={async () => {
                          setTeamLoading(true);
                          setAutoAssignResult(null);
                          try {
                            const response = await API.patch(`/teams/${t.id}/assign-ticket/${id}`);
                            const newTeamId = response.data.team_id ?? t.id;
                            setLocalTeamId(newTeamId);
                            // Show auto-assign result if agent was assigned
                            if (response.data.assigned_agent_name) {
                              setAutoAssignResult({
                                name: response.data.assigned_agent_name,
                                level: response.data.assigned_agent_level,
                                team: t.team_name,
                              });
                            }
                            await fetchTicket();
                            await fetchAuditLogs();
                          } catch (err) {
                            alert(err.response?.data?.detail || "Failed to assign team.");
                          } finally {
                            setTeamLoading(false);
                          }
                        }}
                        className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                          isAssigned
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                        }`}
                      >
                        <span>🏢 {t.team_name}</span>
                        {isAssigned && (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider">
                              ✓ Assigned
                            </span>
                            {ticket.assigned_agent_id && (() => {
                              const agent = allUsers.find(u => u.id === ticket.assigned_agent_id);
                              return agent ? (
                                <span className="text-[9px] opacity-80">
                                  👤 {agent.name}
                                  {agent.agent_level && ` · ${agent.agent_level}`}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Loading indicator */}
              {teamLoading && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                  <span className="text-[10px] text-gray-400">Updating...</span>
                </div>
              )}

              {/* Auto-assign result banner */}
              {autoAssignResult && !teamLoading && (
                <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-green-600 mb-1">
                        🤖 Auto-Assigned
                      </p>
                      <p className="text-xs font-bold text-green-800">{autoAssignResult.name}</p>
                      {autoAssignResult.level && (
                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${
                          autoAssignResult.level === "senior"
                            ? "bg-green-200 text-green-800"
                            : autoAssignResult.level === "mid"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {autoAssignResult.level}
                        </span>
                      )}
                      <p className="text-[10px] text-green-600 mt-1">
                        from team <span className="font-bold">{autoAssignResult.team}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setAutoAssignResult(null)}
                      className="text-green-400 hover:text-green-600 text-xs font-bold"
                    >✕</button>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* SLA / Due Date */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 mb-3">SLA / DUE DATE</h3>

            {/* SLA Status Badge */}
            {ticket.due_date ? (() => {
              const now = new Date();
              const due = new Date(ticket.due_date);
              const diffHrs = (due - now) / (1000 * 60 * 60);
              if (ticket.status === "resolved") return (
                <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs font-bold text-green-700">✅ Resolved</p>
                  {ticket.resolved_at && (
                    <p className="text-[10px] text-green-600 mt-0.5">
                      Resolved at: {new Date(ticket.resolved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              );
              if (diffHrs < 0) return (
                <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs font-bold text-red-700">
                    🔥 Overdue by {Math.abs(Math.round(diffHrs))}h
                  </p>
                  <p className="text-[10px] text-red-500 mt-0.5">SLA breached — needs immediate action</p>
                </div>
              );
              if (diffHrs <= 2) return (
                <div className="mb-3 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200">
                  <p className="text-xs font-bold text-orange-700">⚠️ Due in {Math.round(diffHrs)}h — Critical</p>
                </div>
              );
              return (
                <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs font-bold text-green-700">✅ On Track — {Math.round(diffHrs)}h remaining</p>
                </div>
              );
            })() : (
              <div className="mb-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-400 italic">No due date set</p>
              </div>
            )}

            {/* Due Date Setter */}
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
              Set Due Date
            </label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                disabled={slaLoading}
                onClick={async () => {
                  setSlaLoading(true);
                  try {
                    await API.patch(`/tickets/${id}/due-date`, {
                      due_date: dueDateInput ? new Date(dueDateInput).toISOString() : null,
                    });
                    await fetchTicket();
                  } catch {
                    alert("Failed to update due date.");
                  } finally {
                    setSlaLoading(false);
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {slaLoading ? "Saving..." : "Save"}
              </button>
              <button
                disabled={slaLoading}
                onClick={async () => {
                  setSlaLoading(true);
                  try {
                    await API.patch(`/tickets/${id}/due-date`, { due_date: null });
                    setDueDateInput("");
                    await fetchTicket();
                  } catch {
                    alert("Failed to clear due date.");
                  } finally {
                    setSlaLoading(false);
                  }
                }}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              >
                Clear
              </button>
            </div>

            {/* SLA Presets */}
            <div className="mt-3">
              <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1.5">Quick SLA Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "4h (High)",  hours: 4  },
                  { label: "24h (Mid)",  hours: 24 },
                  { label: "72h (Low)",  hours: 72 },
                ].map(({ label, hours }) => (
                  <button
                    key={hours}
                    onClick={() => {
                      const d = new Date(Date.now() + hours * 60 * 60 * 1000);
                      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                        .toISOString().slice(0, 16);
                      setDueDateInput(local);
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ticket Info */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 mb-3">TICKET INFO</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Ticket ID:</span> #{ticket.id}</p>
              <p><span className="font-medium">User ID:</span> #{ticket.user_id}</p>
              <p>
                <span className="font-medium">Helper:</span>{" "}
                {ticket.helper_id
                  ? helpers.find(h => h.id === ticket.helper_id)?.name || `Helper #${ticket.helper_id}`
                  : "Not assigned"}
              </p>
              <p>
                <span className="font-medium">Team:</span>{" "}
                {assignedTeam
                  ? <span className="text-indigo-600 font-semibold">{assignedTeam.team_name}</span>
                  : "Not assigned"}
              </p>
              <p><span className="font-medium">Created:</span> {formatDate(ticket.created_at)}</p>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 mb-3">ACTIVITY SUMMARY</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Total Events</span>
                <span className="font-bold text-gray-800">{auditLogs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Comments</span>
                <span className="font-bold text-gray-800">{ticket.comments?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status Changes</span>
                <span className="font-bold text-gray-800">
                  {auditLogs.filter(l => l.action === "STATUS_CHANGED").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Priority Changes</span>
                <span className="font-bold text-gray-800">
                  {auditLogs.filter(l => l.action === "PRIORITY_CHANGED").length}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTicketDetail;