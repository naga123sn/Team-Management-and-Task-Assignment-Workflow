import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAllTickets } from "../../services/ticketService";
import { getAllTeams, getTeamMembers } from "../../services/teamService";
import { getAllUsers } from "../../services/userService";
import { useNavigate } from "react-router-dom";

// ── Reusable Components ───────────────────────────────────────────────────────

const StatCard = ({ label, value, color, icon, sub }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <span className="text-lg">{icon}</span>
    </div>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
    {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 mt-8 flex items-center gap-2">
    {children}
  </h2>
);

const ProgressBar = ({ value, max, color }) => (
  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
    <div
      className={`h-1.5 rounded-full ${color}`}
      style={{ width: max > 0 ? `${Math.min(100, (value / max) * 100)}%` : "0%" }}
    />
  </div>
);

// ── SLA Badge ─────────────────────────────────────────────────────────────────
const SLABadge = ({ ticket }) => {
  if (!ticket.due_date || ticket.status === "resolved")
    return <span className="text-[10px] text-gray-300">—</span>;
  const diff = (new Date(ticket.due_date) - new Date()) / (1000 * 60 * 60);
  if (diff < 0)
    return <span className="text-[10px] font-black text-red-600">🔥 {Math.abs(Math.round(diff))}h overdue</span>;
  if (diff <= 2)
    return <span className="text-[10px] font-black text-orange-500">⚠️ {Math.round(diff)}h left</span>;
  return <span className="text-[10px] text-green-600">✅ {Math.round(diff)}h left</span>;
};

const PriBadge = ({ p }) => {
  const cfg = { high: "bg-red-100 text-red-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-gray-100 text-gray-600" };
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg[p] || ""}`}>{p}</span>;
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate   = useNavigate();
  const [tickets,  setTickets]  = useState([]);
  const [teams,    setTeams]    = useState([]);
  const [users,    setUsers]    = useState([]);
  const [teamMembers, setTeamMembers] = useState({}); // { teamId: [members] }
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      getAllTickets(),
      getAllTeams(),
      getAllUsers(),
    ]).then(async ([tRes, tmRes, uRes]) => {
      setTickets(tRes.data);
      setTeams(tmRes.data);
      setUsers(uRes.data);
      // Fetch members for each team
      const membersMap = {};
      await Promise.all(
        tmRes.data.map(async (team) => {
          try {
            const res = await getTeamMembers(team.id);
            membersMap[team.id] = res.data;
          } catch { membersMap[team.id] = []; }
        })
      );
      setTeamMembers(membersMap);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const now = new Date();

  // ── Core Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!tickets.length) return null;
    const overdue  = tickets.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== "resolved");
    const dueSoon  = tickets.filter(t => {
      if (!t.due_date || t.status === "resolved") return false;
      const h = (new Date(t.due_date) - now) / (1000 * 60 * 60);
      return h >= 0 && h <= 8;
    });
    return {
      total:       tickets.length,
      pending:     tickets.filter(t => t.status === "pending").length,
      in_progress: tickets.filter(t => t.status === "in_progress").length,
      resolved:    tickets.filter(t => t.status === "resolved").length,
      low:         tickets.filter(t => t.priority === "low").length,
      medium:      tickets.filter(t => t.priority === "medium").length,
      high:        tickets.filter(t => t.priority === "high").length,
      overdue:     overdue.length,
      due_soon:    dueSoon.length,
      overdueList: overdue.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
      dueSoonList: dueSoon.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
    };
  }, [tickets]);

  // ── Team-wise Ticket Count ──────────────────────────────────────────────────
  const teamStats = useMemo(() => {
    return teams.map(team => {
      const teamTickets = tickets.filter(t => t.team_id === team.id);
      return {
        id:          team.id,
        name:        team.team_name,
        total:       teamTickets.length,
        pending:     teamTickets.filter(t => t.status === "pending").length,
        in_progress: teamTickets.filter(t => t.status === "in_progress").length,
        resolved:    teamTickets.filter(t => t.status === "resolved").length,
        high:        teamTickets.filter(t => t.priority === "high").length,
        memberCount: (teamMembers[team.id] || []).length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [teams, tickets, teamMembers]);

  // ── Agent Workload (Senior vs Mid vs Junior) ────────────────────────────────
  const agentStats = useMemo(() => {
    const agents = users.filter(u => u.agent_level && u.role === "user" && !u.is_deleted);
    return agents.map(agent => {
      const agentTickets = tickets.filter(t => t.assigned_agent_id === agent.id);
      return {
        id:          agent.id,
        name:        agent.name,
        level:       agent.agent_level,
        total:       agentTickets.length,
        pending:     agentTickets.filter(t => t.status === "pending").length,
        in_progress: agentTickets.filter(t => t.status === "in_progress").length,
        resolved:    agentTickets.filter(t => t.status === "resolved").length,
        high:        agentTickets.filter(t => t.priority === "high").length,
        overdue:     agentTickets.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== "resolved").length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [users, tickets]);

  const workloadByLevel = useMemo(() => {
    const levels = { senior: [], mid: [], junior: [] };
    agentStats.forEach(a => { if (levels[a.level]) levels[a.level].push(a); });
    return Object.entries(levels).map(([level, agents]) => ({
      level,
      agents,
      total:    agents.reduce((s, a) => s + a.total, 0),
      resolved: agents.reduce((s, a) => s + a.resolved, 0),
      pending:  agents.reduce((s, a) => s + a.pending, 0),
      overdue:  agents.reduce((s, a) => s + a.overdue, 0),
    }));
  }, [agentStats]);

  const maxTeamTotal  = Math.max(...teamStats.map(t => t.total), 1);
  const maxAgentTotal = Math.max(...agentStats.map(a => a.total), 1);

  const levelCfg = {
    senior: { color: "bg-green-500",  badge: "bg-green-100 text-green-700",  bar: "bg-green-400"  },
    mid:    { color: "bg-blue-500",   badge: "bg-blue-100 text-blue-700",    bar: "bg-blue-400"   },
    junior: { color: "bg-gray-400",   badge: "bg-gray-100 text-gray-600",    bar: "bg-gray-400"   },
  };

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center py-32 gap-3">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Loading dashboard...</span>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
      <p className="text-xs text-gray-400 mb-6">Real-time overview of tickets, teams, and agent workload</p>

      {/* ── SLA Alert Banners ── */}
      {(stats?.overdue > 0 || stats?.due_soon > 0) && (
        <div className="space-y-2 mb-6">
          {stats?.overdue > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
              <span className="text-xl">🔥</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700">
                  {stats.overdue} overdue ticket{stats.overdue > 1 ? "s" : ""} — SLA breached!
                </p>
                <p className="text-xs text-red-400 mt-0.5">Scroll down to see overdue ticket details.</p>
              </div>
            </div>
          )}
          {stats?.due_soon > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-orange-700">
                  {stats.due_soon} ticket{stats.due_soon > 1 ? "s" : ""} due within 8 hours
                </p>
                <p className="text-xs text-orange-400 mt-0.5">Act now to avoid SLA breach.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Ticket Overview ── */}
      <SectionTitle>🎫 Ticket Overview</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total"       value={stats?.total       ?? "—"} color="text-gray-800"   icon="🎫" sub={`${stats?.resolved ?? 0} resolved`} />
        <StatCard label="Pending"     value={stats?.pending     ?? "—"} color="text-yellow-600" icon="⏳" />
        <StatCard label="In Progress" value={stats?.in_progress ?? "—"} color="text-blue-600"   icon="🔄" />
        <StatCard label="Resolved"    value={stats?.resolved    ?? "—"} color="text-green-600"  icon="✅"
          sub={stats?.total ? `${Math.round((stats.resolved / stats.total) * 100)}% resolution rate` : ""} />
      </div>

      {/* ── SLA Stats ── */}
      <SectionTitle>⏱ SLA Status</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Overdue"       value={stats?.overdue   ?? "—"} color="text-red-600"    icon="🔥" sub="SLA breached" />
        <StatCard label="Due ≤ 8h"      value={stats?.due_soon  ?? "—"} color="text-orange-600" icon="⚠️" sub="Needs attention" />
        <StatCard label="High Priority" value={stats?.high      ?? "—"} color="text-red-600"    icon="🔺" />
        <StatCard label="Medium"        value={stats?.medium    ?? "—"} color="text-yellow-600" icon="🔸" />
      </div>

      {/* ── Overdue Tickets ── */}
      {stats?.overdueList?.length > 0 && (
        <>
          <SectionTitle>🔥 Overdue Tickets ({stats.overdueList.length})</SectionTitle>
          <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-red-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Ticket</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Due Date</th>
                  <th className="px-4 py-3 text-center">Overdue By</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.overdueList.map(t => {
                  const hrs = Math.round((now - new Date(t.due_date)) / (1000 * 60 * 60));
                  return (
                    <tr key={t.id} className="hover:bg-red-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-xs text-gray-800">#{t.id} — {t.title}</p>
                        <p className="text-[10px] text-gray-400">{t.category}</p>
                      </td>
                      <td className="px-4 py-3 text-center"><PriBadge p={t.priority} /></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          t.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
                        }`}>{t.status.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {new Date(t.due_date).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold text-red-600">🔥 {hrs}h ago</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => navigate(`/admin/tickets/${t.id}`)}
                          className="text-xs font-bold text-blue-600 hover:underline">View →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Due Soon ── */}
      {stats?.dueSoonList?.length > 0 && (
        <>
          <SectionTitle>⚠️ Due Within 8 Hours ({stats.dueSoonList.length})</SectionTitle>
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-orange-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Ticket</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">SLA</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.dueSoonList.map(t => (
                  <tr key={t.id} className="hover:bg-orange-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-xs text-gray-800">#{t.id} — {t.title}</p>
                      <p className="text-[10px] text-gray-400">{t.category}</p>
                    </td>
                    <td className="px-4 py-3 text-center"><PriBadge p={t.priority} /></td>
                    <td className="px-4 py-3 text-center"><SLABadge ticket={t} /></td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => navigate(`/admin/tickets/${t.id}`)}
                        className="text-xs font-bold text-blue-600 hover:underline">View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Team-wise Ticket Count ── */}
      <SectionTitle>🏢 Team-wise Ticket Count</SectionTitle>
      {teamStats.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No teams created yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-center">Members</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Pending</th>
                <th className="px-4 py-3 text-center">In Progress</th>
                <th className="px-4 py-3 text-center">Resolved</th>
                <th className="px-4 py-3 text-center">High Priority</th>
                <th className="px-5 py-3 text-left">Workload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teamStats.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-xs text-gray-800">🏢 {t.name}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">{t.memberCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-gray-800 text-sm">{t.total}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{t.pending}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t.in_progress}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{t.resolved}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t.high}</span>
                  </td>
                  <td className="px-5 py-3 w-40">
                    <ProgressBar value={t.total} max={maxTeamTotal} color="bg-indigo-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Senior vs Mid vs Junior Workload ── */}
      <SectionTitle>👤 Agent Level Workload Comparison</SectionTitle>

      {/* Level summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {workloadByLevel.map(({ level, agents, total, resolved, pending, overdue }) => {
          const cfg = levelCfg[level];
          const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
          return (
            <div key={level} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-black uppercase px-2 py-1 rounded ${cfg.badge}`}>
                  {level}
                </span>
                <span className="text-xs text-gray-400">{agents.length} agent{agents.length !== 1 ? "s" : ""}</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">{total}</p>
              <p className="text-[10px] text-gray-400 mb-3">total assigned tickets</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending</span>
                  <span className="font-bold text-yellow-600">{pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Resolved</span>
                  <span className="font-bold text-green-600">{resolved}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Overdue</span>
                  <span className={`font-bold ${overdue > 0 ? "text-red-600" : "text-gray-400"}`}>{overdue}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5 mt-1.5">
                  <span className="text-gray-500">Resolution Rate</span>
                  <span className="font-bold text-blue-600">{resRate}%</span>
                </div>
              </div>
              <ProgressBar value={resolved} max={total || 1} color={cfg.bar} />
            </div>
          );
        })}
      </div>

      {/* Per-agent breakdown table */}
      {agentStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Per-Agent Breakdown</p>
            <span className="text-xs text-gray-400">{agentStats.length} agents with level assigned</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-center">Level</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Pending</th>
                <th className="px-4 py-3 text-center">In Progress</th>
                <th className="px-4 py-3 text-center">Resolved</th>
                <th className="px-4 py-3 text-center">Overdue</th>
                <th className="px-5 py-3 text-left">Workload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agentStats.map(a => {
                const cfg = levelCfg[a.level] || levelCfg.junior;
                return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase ${cfg.color}`}>
                          {a.name.charAt(0)}
                        </div>
                        <p className="font-semibold text-xs text-gray-800">{a.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${cfg.badge}`}>
                        {a.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-800">{a.total}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{a.pending}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a.in_progress}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{a.resolved}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.overdue > 0
                        ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">🔥 {a.overdue}</span>
                        : <span className="text-[10px] text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 w-40">
                      <ProgressBar value={a.total} max={maxAgentTotal} color={cfg.bar} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {agentStats.length === 0 && (
        <p className="text-xs text-gray-400 italic">No agents with levels assigned yet. Set agent levels in Team Management.</p>
      )}

      {/* ── Priority Distribution ── */}
      <SectionTitle>📊 Priority Distribution</SectionTitle>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Low"    value={stats?.low    ?? "—"} color="text-green-600"  icon="🟢" />
        <StatCard label="Medium" value={stats?.medium ?? "—"} color="text-yellow-600" icon="🟡" />
        <StatCard label="High"   value={stats?.high   ?? "—"} color="text-red-600"    icon="🔴" />
      </div>

    </AdminLayout>
  );
};

export default AdminDashboard;