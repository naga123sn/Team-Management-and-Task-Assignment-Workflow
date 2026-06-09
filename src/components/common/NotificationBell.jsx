import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
} from "../../services/notificationService";
import { formatDateTime } from "../../utils/helpers";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchUnread = () => {
    getUnreadCount()
      .then((res) => setUnread(res.data.unread))
      .catch(() => {});
  };

  const fetchNotifications = () => {
    setLoading(true);
    getNotifications()
      .then((res) => setNotifications(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUnread();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) {
      fetchNotifications();
    }
  };

  const handleRead = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
      fetchUnread();
      fetchNotifications();
    }
    navigate(`/user/tickets/${notif.ticket_id}`);
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    fetchUnread();
    fetchNotifications();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 text-slate-400 hover:text-[#450a0a] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* Unread badge */}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">

          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Notifications
              </p>
              {unread > 0 && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {unread} unread
                </p>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-[#450a0a] hover:underline uppercase tracking-wider"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <div className="w-4 h-4 border-2 border-slate-200 border-t-[#450a0a] rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleRead(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    !notif.is_read ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread dot */}
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      !notif.is_read ? "bg-[#450a0a]" : "bg-slate-200"
                    }`}></div>
                    <div className="flex-1">
                      <p className={`text-xs leading-relaxed ${
                        !notif.is_read
                          ? "font-semibold text-slate-800"
                          : "text-slate-500"
                      }`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {formatDateTime(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
                Showing last 20 notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;