import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getAllTeams, createTeam, deleteTeam,
  addTeamMember, removeTeamMember,
  getTeamMembers, assignTeamLead,
} from "../../services/teamService";
import { getAllUsers, updateAgentLevel } from "../../services/userService";
import { formatDate } from "../../utils/helpers";

const LEVEL_CONFIG = {
  senior: { label: "Senior", color: "bg-green-100 text-green-700 border-green-200" },
  mid:    { label: "Mid",    color: "bg-blue-100 text-blue-700 border-blue-200"   },
  junior: { label: "Junior", color: "bg-gray-100 text-gray-600 border-gray-200"   },
  null:   { label: "No Level", color: "bg-white text-gray-400 border-gray-200"    },
};

const AdminTeams = () => {
  const [teams, setTeams]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [teamName, setTeamName]   = useState("");
  const [teamError, setTeamError] = useState("");
  const [selected, setSelected]   = useState(null);
  const [members, setMembers]     = useState([]);
  const [addUserId, setAddUserId] = useState("");
  const [memberError, setMemberError] = useState("");
  const [levelLoading, setLevelLoading] = useState({}); // per userId

  const fetchTeams = () => {
    setLoading(true);
    getAllTeams()
      .then((res) => setTeams(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchUsers = () => {
    getAllUsers().then((res) => setUsers(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const fetchMembers = (teamId) => {
    getTeamMembers(teamId)
      .then((res) => setMembers(res.data))
      .catch(() => setMembers([]));
  };

  const handleSelectTeam = (team) => {
    setSelected(team);
    setMemberError("");
    fetchMembers(team.id);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setTeamError("");
    try {
      await createTeam(teamName.trim());
      setTeamName("");
      fetchTeams();
    } catch (err) {
      setTeamError(err.response?.data?.detail || "Failed to create team.");
    }
  };

  const handleDeleteTeam = async (id, name) => {
    if (!window.confirm(`Delete team "${name}"? All ticket assignments will be cleared.`)) return;
    await deleteTeam(id);
    if (selected?.id === id) setSelected(null);
    fetchTeams();
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError("");
    if (!addUserId) return;
    try {
      await addTeamMember(selected.id, parseInt(addUserId));
      setAddUserId("");
      fetchMembers(selected.id);
      fetchTeams();
    } catch (err) {
      setMemberError(err.response?.data?.detail || "Failed to add member.");
    }
  };

  const handleRemoveMember = async (userId) => {
    await removeTeamMember(selected.id, userId);
    fetchMembers(selected.id);
    fetchTeams();
  };

  const handleAssignLead = async (userId) => {
    try {
      await assignTeamLead(selected.id, userId);
      fetchMembers(selected.id);
      fetchTeams();
      setSelected(prev => ({ ...prev, team_lead_id: userId }));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to assign lead.");
    }
  };

  const handleSetAgentLevel = async (userId, level) => {
    setLevelLoading(prev => ({ ...prev, [userId]: true }));
    try {
      await updateAgentLevel(userId, level === "none" ? null : level);
      // Update local members list immediately
      setMembers(prev =>
        prev.map(m => m.user_id === userId ? { ...m, agent_level: level === "none" ? null : level } : m)
      );
      // Also update users list so dropdown reflects change
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update level.");
    } finally {
      setLevelLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const availableUsers = users.filter(
    (u) => !members.find((m) => m.user_id === u.id)
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create teams, manage members, assign leads and set agent levels.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Create + Teams List ── */}
          <div className="space-y-4">

            {/* Create Team */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-3">Create New Team</h2>
              {teamError && (
                <p className="text-xs text-red-500 bg-red-50 p-2 rounded mb-3">{teamError}</p>
              )}
              <form onSubmit={handleCreateTeam} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Team name..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  Create
                </button>
              </form>
            </div>

            {/* Agent Level Legend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                Agent Levels
              </p>
              <div className="space-y-2">
                {[
                  { level: "senior", desc: "Senior agents — complex tickets", color: "bg-green-100 text-green-700" },
                  { level: "mid",    desc: "Mid-level agents — standard tickets", color: "bg-blue-100 text-blue-700" },
                  { level: "junior", desc: "Junior agents — basic tickets", color: "bg-gray-100 text-gray-600" },
                ].map(({ level, desc, color }) => (
                  <div key={level} className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${color}`}>
                      {level}
                    </span>
                    <span className="text-[10px] text-gray-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Teams List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  All Teams
                </p>
                <span className="text-xs text-gray-400 font-semibold">
                  {teams.length} teams
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-400">Loading...</span>
                </div>
              ) : teams.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-8">
                  No teams created yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {teams.map((team) => (
                    <li
                      key={team.id}
                      onClick={() => handleSelectTeam(team)}
                      className={`px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selected?.id === team.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{team.team_name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {team.members?.length || 0} members •{" "}
                            {team.team_lead_id ? "Has lead" : "No lead"}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id, team.team_name); }}
                          className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Right: Team Detail ── */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-3xl mb-3">👥</p>
                  <p className="text-sm font-bold text-gray-400">Select a team to manage</p>
                  <p className="text-xs text-gray-300 mt-1">Click any team from the left panel</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">

                {/* Team Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">{selected.team_name}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Created {formatDate(selected.created_at)} •{" "}
                        {members.length} member{members.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.team_lead_id ? (
                        <span className="text-xs font-bold px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full">
                          👑 Has Team Lead
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full">
                          No Lead Assigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Member */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                    Add Member
                  </h3>
                  {memberError && (
                    <p className="text-xs text-red-500 bg-red-50 p-2 rounded mb-3">{memberError}</p>
                  )}
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <select
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      required
                    >
                      <option value="">Select a user to add...</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email}
                          {u.agent_level ? ` [${u.agent_level}]` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition"
                    >
                      Add
                    </button>
                  </form>
                </div>

                {/* Members List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Team Members ({members.length})
                    </p>
                  </div>

                  {members.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-8">
                      No members yet. Add users above.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 text-left">Member</th>
                          <th className="px-4 py-3 text-center">Agent Level</th>
                          <th className="px-4 py-3 text-center">Team Role</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {members.map((m) => {
                          const levelCfg = LEVEL_CONFIG[m.agent_level] || LEVEL_CONFIG["null"];
                          return (
                            <tr key={m.user_id} className="hover:bg-gray-50 transition-colors">

                              {/* Name */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                                    m.is_lead ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
                                  }`}>
                                    {m.name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800 text-xs">{m.name}</p>
                                    <p className="text-[9px] text-gray-400">{m.email}</p>
                                    {m.is_lead && (
                                      <p className="text-[9px] text-yellow-600 font-bold uppercase tracking-wider">
                                        👑 Team Lead
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Agent Level Setter */}
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {/* Current level badge */}
                                  {m.agent_level ? (
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${levelCfg.color}`}>
                                      {levelCfg.label}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-300 italic">Not set</span>
                                  )}
                                  {/* Level selector buttons */}
                                  <div className="flex gap-1 mt-1">
                                    {["junior", "mid", "senior"].map((lvl) => (
                                      <button
                                        key={lvl}
                                        disabled={levelLoading[m.user_id]}
                                        onClick={() => handleSetAgentLevel(m.user_id, lvl)}
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition ${
                                          m.agent_level === lvl
                                            ? lvl === "senior"
                                              ? "bg-green-500 text-white border-green-500"
                                              : lvl === "mid"
                                              ? "bg-blue-500 text-white border-blue-500"
                                              : "bg-gray-500 text-white border-gray-500"
                                            : "bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600"
                                        } disabled:opacity-50`}
                                      >
                                        {lvl === "junior" ? "Jr" : lvl === "mid" ? "Mid" : "Sr"}
                                      </button>
                                    ))}
                                    {m.agent_level && (
                                      <button
                                        disabled={levelLoading[m.user_id]}
                                        onClick={() => handleSetAgentLevel(m.user_id, "none")}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-200 text-red-400 hover:bg-red-50 transition disabled:opacity-50"
                                        title="Clear level"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                  {levelLoading[m.user_id] && (
                                    <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin mt-1"></div>
                                  )}
                                </div>
                              </td>

                              {/* Team Role */}
                              <td className="px-4 py-3 text-center">
                                {m.is_lead ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                                    Lead
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAssignLead(m.user_id)}
                                    className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full hover:bg-yellow-100 hover:text-yellow-700 transition"
                                  >
                                    Make Lead
                                  </button>
                                )}
                              </td>

                              {/* Remove */}
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleRemoveMember(m.user_id)}
                                  className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded hover:bg-red-50 transition"
                                >
                                  Remove
                                </button>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTeams;