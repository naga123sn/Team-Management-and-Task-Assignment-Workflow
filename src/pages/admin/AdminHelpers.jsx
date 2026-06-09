import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAllHelpers, addHelper } from "../../services/userService";
import { formatDate } from "../../utils/helpers";

const AdminHelpers = () => {
  const [helpers, setHelpers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchHelpers = () => {
    getAllHelpers()
      .then((res) => setHelpers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHelpers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await addHelper({ name, email });
      setName(""); setEmail("");
      fetchHelpers();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add helper.");
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage Helpers</h1>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 max-w-md">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add New Helper</h2>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleAdd} className="space-y-3">
          <input type="text" placeholder="Helper Name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="email" placeholder="Helper Email"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
            Add Helper
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Added On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={3} className="text-center text-gray-400 py-8">Loading...</td></tr>
            ) : helpers.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-gray-400 py-8">No helpers added yet.</td></tr>
            ) : (
              helpers.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{h.name}</td>
                  <td className="px-4 py-3 text-gray-500">{h.email}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(h.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminHelpers;
