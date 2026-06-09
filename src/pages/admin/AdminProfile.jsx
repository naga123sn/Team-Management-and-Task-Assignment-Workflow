import React, { useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { updateProfile } from "../../services/userService";

const AdminProfile = () => {
  const { user, login, token } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess(""); setError("");
    try {
      const res = await updateProfile(user.id, { name, email });
      login(res.data, token);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Profile</h1>
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-md">
        {success && <p className="mb-3 text-sm text-green-600 bg-green-50 p-2 rounded">{success}</p>}
        {error && <p className="mb-3 text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              value="Admin" readOnly />
          </div>
          <button type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
            Save Changes
          </button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
