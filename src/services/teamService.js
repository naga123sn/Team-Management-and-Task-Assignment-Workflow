import API from "./api";

export const getAllTeams       = ()              => API.get("/teams");
export const getTeam          = (id)            => API.get(`/teams/${id}`);
export const createTeam       = (team_name)     => API.post("/teams", { team_name });
export const deleteTeam       = (id)            => API.delete(`/teams/${id}`);
export const assignTeamLead   = (id, lead_id)   => API.patch(`/teams/${id}/lead`, { team_lead_id: lead_id });
export const addTeamMember    = (id, user_id)   => API.post(`/teams/${id}/members`, { user_id });
export const removeTeamMember = (id, user_id)   => API.delete(`/teams/${id}/members/${user_id}`);
export const getTeamMembers   = (id)            => API.get(`/teams/${id}/members`);
export const assignTicketToTeam = (team_id, ticket_id) =>
  API.patch(`/teams/${team_id}/assign-ticket/${ticket_id}`);
export const unassignTicketFromTeam = (ticket_id)       => API.patch(`/teams/remove-ticket/${ticket_id}`);
