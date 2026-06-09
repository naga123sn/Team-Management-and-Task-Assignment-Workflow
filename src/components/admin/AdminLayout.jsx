import React from "react";
import Sidebar from "../common/Sidebar";

const adminLinks = [
  { to: "/admin/dashboard",       icon: "📊", label: "Dashboard"       },
  { to: "/admin/analytics",       icon: "📈", label: "Analytics"       },
  { to: "/admin/user-stats",      icon: "👥", label: "User Stats"      },
  { to: "/admin/tickets",         icon: "📋", label: "All Tickets"     },
  { to: "/admin/users",           icon: "👤", label: "Manage Users"    },
  { to: "/admin/teams",           icon: "🏢", label: "Teams"           },
  { to: "/admin/team-dashboard",  icon: "📉", label: "Team Dashboard"  }, // ← NEW
  { to: "/admin/helpers",         icon: "🤝", label: "Manage Helpers"  },
  { to: "/admin/login-logs",      icon: "🔐", label: "Login Logs"      },
  { to: "/admin/deleted",         icon: "🗑️", label: "Deleted Items"   },
  { to: "/admin/profile",         icon: "🙍", label: "Profile"         },
];

const AdminLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar links={adminLinks} />
      <main className="flex-1 p-6 bg-gray-100">{children}</main>
    </div>
  );
};

export default AdminLayout;