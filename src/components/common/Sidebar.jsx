import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ links }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    navigate("/login");  // navigate first immediately
    await logout();      // then logout in background
  };

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">
            🎫
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide">TicketMS</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              {user?.role === "admin" ? "Admin Panel" : "User Panel"}
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold uppercase shrink-0">
              {user.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
            {/* Online indicator */}
            <div className="ml-auto shrink-0 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link, index) => (
          <NavLink
            key={index}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-gray-400 hover:bg-gray-700 hover:text-white"
              }`
            }
          >
            <span className="text-base">{link.icon}</span>
            <span className="font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 space-y-2">

        {/* Role badge */}
        <div className="px-3 py-1.5 rounded-lg bg-gray-800 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Role
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
            user?.role === "admin"
              ? "bg-blue-900/50 text-blue-400"
              : "bg-green-900/50 text-green-400"
          }`}>
            {user?.role}
          </span>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-all"
        >
          <span>🚪</span>
          <span className="font-medium">Logout</span>
        </button>

      </div>
    </aside>
  );
};

export default Sidebar;