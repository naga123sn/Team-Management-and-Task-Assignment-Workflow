import API from "./api";

// ── Task Revocation & Transfer ─────────────────────────────────────────────
export const revokeTask = (ticketId) =>
  API.patch(`/task-management/tickets/${ticketId}/revoke`);

export const transferTask = (ticketId, newAgentId, reason = null) =>
  API.patch(`/task-management/tickets/${ticketId}/transfer`, {
    new_agent_id: newAgentId,
    ...(reason && { reason }),
  });

// ── Team Dashboard APIs ────────────────────────────────────────────────────
export const getTeamTaskCount    = () => API.get("/task-management/dashboard/team-task-count");
export const getPendingTasks     = () => API.get("/task-management/dashboard/pending-tasks");
export const getCompletedTasks   = () => API.get("/task-management/dashboard/completed-tasks");
export const getOverdueTasks     = () => API.get("/task-management/dashboard/overdue-tasks");
export const getMemberWorkload   = () => API.get("/task-management/dashboard/member-workload");
export const getTeamDashboard    = () => API.get("/task-management/dashboard/summary");