import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * PrivateRoute
 * Usage:
 *   <PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>
 *   <PrivateRoute role="user"><UserDashboard /></PrivateRoute>
 */
const PrivateRoute = ({ children, role }) => {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Redirect to the correct panel if wrong role
    return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/user/dashboard"} replace />;
  }

  return children;
};

export default PrivateRoute;
