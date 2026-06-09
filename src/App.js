import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/common/PrivateRoute";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminTeams from "./pages/admin/AdminTeams";
import TeamDashboard from "./pages/admin/TeamDashboard";

// Auth
import Login from "./pages/Login";
import AdminDeleted from "./pages/admin/AdminDeleted";
import AdminLoginLogs from "./pages/admin/AdminLoginLogs";
import AdminUserStats from "./pages/admin/AdminUserStats";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminTicketDetail from "./pages/admin/AdminTicketDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminHelpers from "./pages/admin/AdminHelpers";
import AdminProfile from "./pages/admin/AdminProfile";

// User Pages
import UserDashboard from "./pages/user/UserDashboard";
import UserTickets from "./pages/user/UserTickets";
import UserTicketDetail from "./pages/user/UserTicketDetail";
import CreateTicket from "./pages/user/CreateTicket";
import UserProfile from "./pages/user/UserProfile";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
<Route path="/admin/deleted" element={<PrivateRoute role="admin"><AdminDeleted /></PrivateRoute>} />
<Route path="/admin/teams" element={<PrivateRoute role="admin"><AdminTeams /></PrivateRoute>} />
<Route path="/admin/team-dashboard" element={<TeamDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/tickets" element={<PrivateRoute role="admin"><AdminTickets /></PrivateRoute>} />
          <Route path="/admin/tickets/:id" element={<PrivateRoute role="admin"><AdminTicketDetail /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute role="admin"><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/helpers" element={<PrivateRoute role="admin"><AdminHelpers /></PrivateRoute>} />
          <Route path="/admin/profile" element={<PrivateRoute role="admin"><AdminProfile /></PrivateRoute>} />
<Route path="/admin/analytics" element={<PrivateRoute role="admin"><AdminAnalytics /></PrivateRoute>} />
<Route path="/admin/login-logs" element={<PrivateRoute role="admin"><AdminLoginLogs /></PrivateRoute>} />
<Route path="/admin/user-stats" element={<PrivateRoute role="admin"><AdminUserStats /></PrivateRoute>} />

          {/* User Routes */}
          <Route path="/user/dashboard" element={<PrivateRoute role="user"><UserDashboard /></PrivateRoute>} />
          <Route path="/user/tickets" element={<PrivateRoute role="user"><UserTickets /></PrivateRoute>} />
          <Route path="/user/tickets/:id" element={<PrivateRoute role="user"><UserTicketDetail /></PrivateRoute>} />
          <Route path="/user/create-ticket" element={<PrivateRoute role="user"><CreateTicket /></PrivateRoute>} />
          <Route path="/user/profile" element={<PrivateRoute role="user"><UserProfile /></PrivateRoute>} />

          {/* Default */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
