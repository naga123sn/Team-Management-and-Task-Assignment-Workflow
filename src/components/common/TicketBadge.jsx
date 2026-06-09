import React from "react";

const priorityColors = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

const statusColors = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
};

const statusLabels = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export const PriorityBadge = ({ priority }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
      priorityColors[priority] || "bg-gray-100 text-gray-600"
    }`}
  >
    {priority}
  </span>
);

export const StatusBadge = ({ status }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
      statusColors[status] || "bg-gray-100 text-gray-600"
    }`}
  >
    {statusLabels[status] || status}
  </span>
);
