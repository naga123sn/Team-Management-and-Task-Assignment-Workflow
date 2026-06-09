import API from "./api";

export const getNotifications    = ()   => API.get("/notifications");
export const getUnreadCount      = ()   => API.get("/notifications/unread-count");
export const markAsRead          = (id) => API.patch(`/notifications/${id}/read`);
export const markAllRead         = ()   => API.patch("/notifications/read-all");
export const notifyTicketViewed  = (id) => API.post(`/notifications/ticket-viewed/${id}`);