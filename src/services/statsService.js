import API from "./api";

export const getStats = () => API.get("/stats");
export const getAnalytics = () => API.get("/analytics/dashboard");
export const getLoginLogs = (params) => API.get("/login-logs", { params });
export const getLoginSummary = () => API.get("/login-logs/summary");
export const getUserStatsSummary = () => API.get("/user-stats/summary");

// ── CSV Download helper ────────────────────────────────────────────────────
const downloadCSV = async (endpoint, filename) => {
  try {
    const response = await API.get(endpoint, {
      responseType: "blob", // important — treat response as file
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(`Export failed for ${filename}:`, err);
    alert(`Failed to download ${filename}. Please try again.`);
  }
};

export const exportUsers     = () => downloadCSV("/export/users",       "users_export.csv");
export const exportTickets   = () => downloadCSV("/export/tickets",     "tickets_export.csv");
export const exportAuditLogs = () => downloadCSV("/export/audit-logs",  "audit_logs_export.csv");
export const exportLoginLogs = () => downloadCSV("/export/login-logs",  "login_logs_export.csv");