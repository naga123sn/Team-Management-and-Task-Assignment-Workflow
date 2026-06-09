import API from "./api";

export const getAllTickets = () => API.get("/tickets");
export const getMyTickets = () => API.get("/tickets/my");
export const getTicketById = (id) => API.get(`/tickets/${id}`);
export const createTicket = (data) => API.post("/tickets", data);
export const updateTicketStatus = (id, status) =>
  API.patch(`/tickets/${id}/status`, { status });
export const updateTicketPriority = (id, priority) =>
  API.patch(`/tickets/${id}/priority`, { priority });
export const assignTicket = (id, helper_id) =>
  API.patch(`/tickets/${id}/assign`, { helper_id });
export const addComment = (id, comment) =>
  API.post(`/tickets/${id}/comments`, { comment });
export const deleteComment = (ticketId, commentId) =>
  API.delete(`/tickets/${ticketId}/comments/${commentId}`);
export const getAuditLogs = (ticketId) =>
  API.get(`/tickets/${ticketId}/audit-logs`);

export const softDeleteTicket = (id) => API.delete(`/tickets/${id}`);
export const restoreTicket = (id) => API.patch(`/tickets/${id}/restore`);
export const getUserAuditLogs = (ticketId) =>
  API.get(`/tickets/${ticketId}/audit-logs`);
export const permanentDeleteTicket = (id) => API.delete(`/tickets/${id}/permanent`);
export const getTicketActivity = (ticketId) =>
  API.get(`/tickets/${ticketId}/activity`);