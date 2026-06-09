import React, { useEffect, useState, useCallback } from "react";
import {
  getTeamDashboard,
  revokeTask,
  transferTask,
  getPendingTasks,
  getCompletedTasks,
  getOverdueTasks,
} from "../../services/taskManagementService";
import { getTeamMembers } from "../../services/teamService";

const priorityColor = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const statusColor   = { pending: "#f59e0b", in_progress: "#3b82f6", resolved: "#10b981" };
const statusLabel   = { pending: "Pending", in_progress: "In Progress", resolved: "Resolved" };

export default function TeamDashboard() {
  const [teams, setTeams]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activeTab, setActiveTab]     = useState("overview");
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Member tickets drill-down
  const [memberTickets, setMemberTickets]   = useState(null); // { member, tickets[] }
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Tickets tab
  const [tabTickets, setTabTickets]         = useState([]);
  const [ticketFilter, setTicketFilter]     = useState("pending");
  const [tabTicketsLoading, setTabTicketsLoading] = useState(false);

  // Revoke / Transfer modal
  const [modal, setModal]             = useState(null); // { type, ticket }
  const [transferTo, setTransferTo]   = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]     = useState(null); // { type: "success"|"error", text }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getTeamDashboard();
      setTeams(data);
      setSelectedTeam((prev) => {
        if (prev) return data.find((t) => t.team_id === prev.team_id) || data[0];
        return data[0] || null;
      });
    } catch {
      setError("Failed to load team dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load team members when transfer modal opens
  useEffect(() => {
    if (modal?.type === "transfer" && selectedTeam) {
      getTeamMembers(selectedTeam.team_id)
        .then(({ data }) => setTeamMembers(data))
        .catch(() => setTeamMembers([]));
    }
  }, [modal, selectedTeam]);

  // Load tickets tab data
  useEffect(() => {
    if (activeTab !== "tickets" || !selectedTeam) return;
    setTabTicketsLoading(true);
    const fetcher =
      ticketFilter === "pending"   ? getPendingTasks   :
      ticketFilter === "completed" ? getCompletedTasks :
                                     getOverdueTasks;
    fetcher()
      .then(({ data }) => {
        const team = data.find((t) => t.team_id === selectedTeam.team_id);
        setTabTickets(team?.tickets || []);
      })
      .catch(() => setTabTickets([]))
      .finally(() => setTabTicketsLoading(false));
  }, [activeTab, ticketFilter, selectedTeam]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleRevoke = async () => {
    try {
      setActionLoading(true);
      await revokeTask(modal.ticket.id);
      setActionMsg({ type: "success", text: `Task #${modal.ticket.id} revoked successfully.` });
      setModal(null);
      setMemberTickets(null);
      load();
    } catch (e) {
      setActionMsg({ type: "error", text: e?.response?.data?.detail || "Revoke failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferTo) return;
    try {
      setActionLoading(true);
      await transferTask(modal.ticket.id, parseInt(transferTo), transferReason || null);
      setActionMsg({ type: "success", text: `Task #${modal.ticket.id} transferred successfully.` });
      setModal(null);
      setTransferTo("");
      setTransferReason("");
      setMemberTickets(null);
      load();
    } catch (e) {
      setActionMsg({ type: "error", text: e?.response?.data?.detail || "Transfer failed" });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Member drill-down: fetch their tickets from existing summary ──────────
  const openMemberTickets = (member) => {
    // Filter team tickets assigned to this member from summary
    const allTickets = selectedTeam?.members
      ? [] // summary doesn't carry full ticket list; show modal with counts only
      : [];
    setMemberTickets({ member, tickets: allTickets });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <div style={s.center}>Loading team dashboard…</div>;
  if (error)   return <div style={{ ...s.center, color: "#ef4444" }}>{error}</div>;
  if (!teams.length) return <div style={s.center}>No teams found.</div>;

  const team = selectedTeam || teams[0];

  return (
    <div style={s.page}>
      <h2 style={s.heading}>Team Dashboard</h2>

      {/* Flash message */}
      {actionMsg && (
        <div style={{ ...s.flash, background: actionMsg.type === "success" ? "#d1fae5" : "#fee2e2",
          color: actionMsg.type === "success" ? "#065f46" : "#991b1b" }}>
          {actionMsg.type === "success" ? "✅" : "❌"} {actionMsg.text}
          <button style={s.flashClose} onClick={() => setActionMsg(null)}>✕</button>
        </div>
      )}

      {/* Team tabs */}
      <div style={s.teamTabs}>
        {teams.map((t) => (
          <button key={t.team_id}
            style={{ ...s.teamTab, ...(selectedTeam?.team_id === t.team_id ? s.teamTabActive : {}) }}
            onClick={() => { setSelectedTeam(t); setMemberTickets(null); }}>
            {t.team_name}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div style={s.cards}>
        {[
          { label: "Total Tickets", value: team.total_tickets, color: "#6366f1" },
          { label: "Pending",       value: team.pending,       color: "#f59e0b" },
          { label: "In Progress",   value: team.in_progress,   color: "#3b82f6" },
          { label: "Completed",     value: team.completed,     color: "#10b981" },
          { label: "Overdue",       value: team.overdue,       color: "#ef4444" },
          { label: "Members",       value: team.member_count,  color: "#8b5cf6" },
        ].map((c) => (
          <div key={c.label} style={{ ...s.card, borderTop: `4px solid ${c.color}` }}>
            <div style={{ ...s.cardValue, color: c.color }}>{c.value}</div>
            <div style={s.cardLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={s.subTabs}>
        {["overview", "workload", "tickets"].map((t) => (
          <button key={t}
            style={{ ...s.subTab, ...(activeTab === t ? s.subTabActive : {}) }}
            onClick={() => { setActiveTab(t); setMemberTickets(null); }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Overview — {team.team_name}</h3>
          <p style={s.muted}>{team.member_count} members · {team.total_tickets} tickets total</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Pending",     val: team.pending,     color: "#f59e0b" },
              { label: "In Progress", val: team.in_progress, color: "#3b82f6" },
              { label: "Completed",   val: team.completed,   color: "#10b981" },
              { label: "Overdue",     val: team.overdue,     color: "#ef4444" },
            ].map((bar) => (
              <div key={bar.label}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                  <span>{bar.label}</span>
                  <span style={{ color: bar.color, fontWeight: 600 }}>{bar.val}</span>
                </div>
                <div style={s.track}>
                  <div style={{ ...s.fill, background: bar.color,
                    width: team.total_tickets ? `${Math.round((bar.val / team.total_tickets) * 100)}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WORKLOAD ──────────────────────────────────────────────────────── */}
      {activeTab === "workload" && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Member Workload</h3>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Member","Level","Total","Pending","In Progress","Resolved","Overdue","Actions"].map(h =>
                    <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {team.members.map((m) => (
                  <tr key={m.user_id} style={s.tr}>
                    <td style={s.td}>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                      {m.is_lead && <span style={s.leadBadge}>Lead</span>}
                    </td>
                    <td style={s.td}>{m.agent_level || "—"}</td>
                    <td style={s.td}>{m.total_assigned}</td>
                    <td style={{ ...s.td, color: "#f59e0b", fontWeight: 600 }}>{m.pending}</td>
                    <td style={{ ...s.td, color: "#3b82f6", fontWeight: 600 }}>{m.in_progress}</td>
                    <td style={{ ...s.td, color: "#10b981", fontWeight: 600 }}>{m.resolved}</td>
                    <td style={{ ...s.td, color: m.overdue > 0 ? "#ef4444" : "#6b7280", fontWeight: m.overdue > 0 ? 600 : 400 }}>
                      {m.overdue}
                    </td>
                    <td style={s.td}>
                      <MemberActions
                        member={m}
                        team={team}
                        onRevoke={(ticket) => setModal({ type: "revoke", ticket })}
                        onTransfer={(ticket) => setModal({ type: "transfer", ticket })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TICKETS ───────────────────────────────────────────────────────── */}
      {activeTab === "tickets" && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Team Tickets</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["pending", "completed", "overdue"].map((f) => (
              <button key={f}
                style={{ ...s.filterBtn, ...(ticketFilter === f ? s.filterBtnActive : {}) }}
                onClick={() => setTicketFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {tabTicketsLoading ? (
            <div style={s.muted}>Loading…</div>
          ) : tabTickets.length === 0 ? (
            <div style={s.muted}>No {ticketFilter} tickets for this team.</div>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["#","Title","Priority","Status","Due Date","Assigned To","Actions"].map(h =>
                      <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tabTickets.map((t) => {
                    const agent = team.members.find(m => m.user_id === t.assigned_agent_id);
                    return (
                      <tr key={t.id} style={s.tr}>
                        <td style={s.td}>#{t.id}</td>
                        <td style={{ ...s.td, maxWidth: 200 }}>{t.title}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: priorityColor[t.priority] + "22",
                            color: priorityColor[t.priority] }}>
                            {t.priority}
                          </span>
                        </td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: statusColor[t.status] + "22",
                            color: statusColor[t.status] }}>
                            {statusLabel[t.status] || t.status}
                          </span>
                        </td>
                        <td style={{ ...s.td, fontSize: 12, color: "#6b7280" }}>
                          {t.due_date ? new Date(t.due_date).toLocaleDateString("en-US",
                            { month:"short", day:"numeric", year:"numeric" }) : "—"}
                        </td>
                        <td style={s.td}>{agent ? agent.name : <span style={{ color:"#9ca3af" }}>Unassigned</span>}</td>
                        <td style={s.td}>
                          <div style={{ display:"flex", gap:6 }}>
                            {t.assigned_agent_id && (
                              <button style={s.btnRevoke}
                                onClick={() => setModal({ type: "revoke", ticket: t })}>
                                Revoke
                              </button>
                            )}
                            <button style={s.btnTransfer}
                              onClick={() => setModal({ type: "transfer", ticket: t })}>
                              Transfer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── REVOKE MODAL ─────────────────────────────────────────────────── */}
      {modal?.type === "revoke" && (
        <Modal title="🚫 Revoke Task" onClose={() => setModal(null)}>
          <p style={{ marginBottom: 8 }}>
            Are you sure you want to revoke the assignment for:
          </p>
          <div style={s.ticketInfo}>
            <span style={{ fontWeight: 600 }}>#{modal.ticket.id}</span> — {modal.ticket.title}
          </div>
          <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>
            The assigned agent will be notified by email. The ticket will revert to <b>Pending</b>.
          </p>
          <div style={s.modalActions}>
            <button style={s.btnDanger} onClick={handleRevoke} disabled={actionLoading}>
              {actionLoading ? "Revoking…" : "Confirm Revoke"}
            </button>
            <button style={s.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── TRANSFER MODAL ───────────────────────────────────────────────── */}
      {modal?.type === "transfer" && (
        <Modal title="🔄 Transfer Task" onClose={() => setModal(null)}>
          <p style={{ marginBottom: 8 }}>Transfer ticket:</p>
          <div style={s.ticketInfo}>
            <span style={{ fontWeight: 600 }}>#{modal.ticket.id}</span> — {modal.ticket.title}
          </div>
          <label style={s.label}>Transfer To *</label>
          <select style={s.select} value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
            <option value="">— Select team member —</option>
            {teamMembers
              .filter((m) => m.user_id !== modal.ticket.assigned_agent_id)
              .map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name} {m.is_lead ? "(Lead)" : ""}
                </option>
              ))}
          </select>
          <label style={s.label}>Reason (optional)</label>
          <textarea style={s.textarea} placeholder="e.g. Agent is on leave…"
            value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
          <div style={s.modalActions}>
            <button style={s.btnPrimary} onClick={handleTransfer}
              disabled={actionLoading || !transferTo}>
              {actionLoading ? "Transferring…" : "Confirm Transfer"}
            </button>
            <button style={s.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ── Member Actions cell — fetches that member's assigned tickets ──────────────
function MemberActions({ member, team, onRevoke, onTransfer }) {
  const [open, setOpen]       = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    if (member.total_assigned === 0) { setOpen(true); return; }
    setLoading(true);
    try {
      // Re-use the summary data passed via team prop
      // Since we only have counts, we'll show action buttons per ticket from getPendingTasks / all
      const { getPendingTasks, getOverdueTasks, getCompletedTasks } =
        await import("../../services/taskManagementService");
      const results = await Promise.all([
        getPendingTasks(), getOverdueTasks(), getCompletedTasks()
      ]);
      const all = results.flatMap(r =>
        (r.data.find(t => t.team_id === team.team_id)?.tickets || [])
      );
      // Deduplicate by id
      const seen = new Set();
      const unique = all.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id); return true;
      });
      setTickets(unique.filter(t => t.assigned_agent_id === member.user_id));
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };

  if (member.total_assigned === 0) {
    return <span style={{ color: "#9ca3af", fontSize: 12 }}>No tickets</span>;
  }

  return (
    <div>
      <button style={s.btnView} onClick={toggle}>
        {open ? "Hide" : `View ${member.total_assigned} ticket${member.total_assigned > 1 ? "s" : ""}`}
      </button>
      {open && (
        <div style={s.ticketDropdown}>
          {loading && <div style={{ fontSize: 12, color: "#6b7280", padding: 6 }}>Loading…</div>}
          {!loading && tickets.length === 0 && (
            <div style={{ fontSize: 12, color: "#9ca3af", padding: 6 }}>No actionable tickets found.</div>
          )}
          {!loading && tickets.map((t) => (
            <div key={t.id} style={s.ticketRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>#{t.id}</span>{" "}
                <span style={{ fontSize: 12, color: "#374151" }}
                  title={t.title}>
                  {t.title.length > 30 ? t.title.slice(0, 30) + "…" : t.title}
                </span>
                <span style={{ ...s.badge, marginLeft: 6,
                  background: statusColor[t.status] + "22", color: statusColor[t.status] }}>
                  {t.status}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, shrink: 0 }}>
                <button style={s.btnRevoke} onClick={() => onRevoke(t)}>Revoke</button>
                <button style={s.btnTransfer} onClick={() => onTransfer(t)}>Transfer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}


// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:          { padding: 24, fontFamily: "Arial, sans-serif", color: "#1f2937", maxWidth: 1200, margin: "0 auto" },
  heading:       { fontSize: 24, fontWeight: 700, marginBottom: 20 },
  center:        { textAlign: "center", padding: 60, color: "#6b7280" },
  muted:         { color: "#6b7280", fontSize: 14, marginBottom: 12 },
  flash:         { padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14,
                   display: "flex", justifyContent: "space-between", alignItems: "center" },
  flashClose:    { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit" },

  teamTabs:      { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  teamTab:       { padding: "8px 18px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff",
                   cursor: "pointer", fontSize: 14, fontWeight: 500 },
  teamTabActive: { background: "#4f46e5", color: "#fff", border: "1px solid #4f46e5" },

  cards:         { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 12, marginBottom: 24 },
  card:          { background: "#fff", borderRadius: 8, padding: "16px 12px",
                   boxShadow: "0 1px 3px rgba(0,0,0,0.08)", textAlign: "center" },
  cardValue:     { fontSize: 32, fontWeight: 700, lineHeight: 1 },
  cardLabel:     { fontSize: 12, color: "#6b7280", marginTop: 4 },

  subTabs:       { display: "flex", gap: 4, marginBottom: 16 },
  subTab:        { padding: "6px 18px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff",
                   cursor: "pointer", fontSize: 14 },
  subTabActive:  { background: "#ede9fe", color: "#4f46e5", border: "1px solid #c4b5fd", fontWeight: 600 },

  section:       { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  sectionTitle:  { fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 12 },

  track:         { background: "#f3f4f6", borderRadius: 4, height: 8, overflow: "hidden" },
  fill:          { height: "100%", borderRadius: 4, transition: "width 0.4s" },

  tableWrap:     { overflowX: "auto" },
  table:         { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:            { textAlign: "left", padding: "10px 12px", background: "#f9fafb",
                   borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#374151" },
  td:            { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" },
  tr:            {},

  leadBadge:     { marginLeft: 6, background: "#ddd6fe", color: "#4f46e5", fontSize: 10,
                   padding: "2px 6px", borderRadius: 10, fontWeight: 600 },
  badge:         { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 },

  ticketDropdown:{ marginTop: 8, background: "#f9fafb", borderRadius: 6,
                   border: "1px solid #e5e7eb", padding: "6px 0" },
  ticketRow:     { display: "flex", alignItems: "center", justifyContent: "space-between",
                   padding: "6px 10px", gap: 8, borderBottom: "1px solid #f3f4f6" },

  filterBtn:     { padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb",
                   background: "#fff", cursor: "pointer", fontSize: 13 },
  filterBtnActive: { background: "#4f46e5", color: "#fff", border: "1px solid #4f46e5" },

  ticketInfo:    { background: "#f3f4f6", padding: "10px 14px", borderRadius: 6,
                   fontSize: 14, color: "#1f2937" },
  label:         { display: "block", fontSize: 13, fontWeight: 600, color: "#374151",
                   marginTop: 14, marginBottom: 4 },
  select:        { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
                   borderRadius: 6, fontSize: 14 },
  textarea:      { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
                   borderRadius: 6, fontSize: 14, minHeight: 72, resize: "vertical",
                   boxSizing: "border-box" },

  overlay:       { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
                   display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  modal:         { background: "#fff", borderRadius: 10, width: "100%", maxWidth: 480,
                   boxShadow: "0 8px 30px rgba(0,0,0,0.15)" },
  modalHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center",
                   padding: "16px 20px", borderBottom: "1px solid #e5e7eb" },
  closeBtn:      { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" },
  modalActions:  { display: "flex", gap: 10, marginTop: 20 },

  btnView:       { padding: "4px 12px", background: "#ede9fe", color: "#4f46e5",
                   border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  btnRevoke:     { padding: "4px 10px", background: "#fee2e2", color: "#dc2626",
                   border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  btnTransfer:   { padding: "4px 10px", background: "#dbeafe", color: "#2563eb",
                   border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  btnPrimary:    { padding: "9px 20px", background: "#4f46e5", color: "#fff",
                   border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
  btnDanger:     { padding: "9px 20px", background: "#ef4444", color: "#fff",
                   border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
  btnSecondary:  { padding: "9px 20px", background: "#f3f4f6", color: "#374151",
                   border: "none", borderRadius: 6, cursor: "pointer" },
};