/**
 * Format a date string to a readable format
 * e.g. "2024-03-15T10:30:00Z" → "Mar 15, 2024"
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format a date string to a readable date + time format
 * e.g. "2024-03-15T10:30:00Z" → "Mar 15, 2024, 10:30 AM"
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Capitalize the first letter of a string
 */
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Return a friendly label for ticket status
 */
export const statusLabel = (status) => {
  const map = {
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
  };
  return map[status] || status;
};