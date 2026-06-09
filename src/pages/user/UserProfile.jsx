import React, { useState } from "react";
import UserLayout from "../../components/user/UserLayout";
import { useAuth } from "../../context/AuthContext";
import { updateProfile, changePassword } from "../../services/userService";

const UserProfile = () => {
  const { user, login, token } = useAuth();

  // Profile state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Active tab
  const [tab, setTab] = useState("profile"); // "profile" | "password"

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess(""); setProfileError("");
    try {
      const res = await updateProfile(user.id, { name, email });
      login(res.data, token);
      setProfileSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError(err.response?.data?.detail || "Failed to update profile.");
    }
  };
const handleChangePassword = async (e) => {
  e.preventDefault();
  setPasswordSuccess(""); setPasswordError("");

  if (newPassword !== confirmPassword) {
    setPasswordError("New passwords do not match.");
    return;
  }
  if (newPassword.length < 6) {
    setPasswordError("New password must be at least 6 characters.");
    return;
  }

  setPasswordLoading(true);
  try {
    await changePassword(oldPassword, newPassword); // ← no user.id
    setPasswordSuccess("Password changed successfully. Use your new password next time you login.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  } catch (err) {
    setPasswordError(err.response?.data?.detail || "Failed to change password.");
  } finally {
    setPasswordLoading(false);
  }
};
 
  const EyeIcon = ({ show, toggle }) => (
    <button type="button" onClick={toggle}
      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
      {show ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );

  // Password strength checker
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    if (pwd.length < 6) return { label: "Too Short", color: "bg-red-500", width: "20%" };
    if (pwd.length < 8) return { label: "Weak", color: "bg-orange-500", width: "40%" };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: "Fair", color: "bg-yellow-500", width: "60%" };
    if (!/[^A-Za-z0-9]/.test(pwd)) return { label: "Good", color: "bg-blue-500", width: "80%" };
    return { label: "Strong", color: "bg-green-500", width: "100%" };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto py-10 px-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          <span>Platform</span>
          <span>/</span>
          <span>Settings</span>
          <span>/</span>
          <span className="text-red-900 font-black">Identity Profile</span>
        </nav>

        {/* Header */}
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
          <div className="w-20 h-20 rounded-2xl bg-[#450a0a] flex items-center justify-center text-white text-2xl font-light tracking-tighter shadow-xl shadow-red-900/20">
            {name.split(" ").map(n => n[0]).join("").toUpperCase()}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tighter">
              Profile Settings
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium italic">
              Manage your identity and account security.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("profile")}
            className={`px-6 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === "profile"
                ? "bg-white text-[#450a0a] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setTab("password")}
            className={`px-6 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === "password"
                ? "bg-white text-[#450a0a] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            🔒 Change Password
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-12">

          {/* Side Info */}
          <div className="space-y-6">
            <div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">
                Account Status
              </h4>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Verified Account
                </span>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
              {tab === "profile" ? (
                <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                  Changes to your email workspace may require re-validation of your active support sessions.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Password Rules</p>
                  <ul className="space-y-1.5">
                    {[
                      "Minimum 6 characters",
                      "Must differ from current",
                      "Use uppercase + numbers for strength",
                      "Special characters recommended",
                    ].map((rule, i) => (
                      <li key={i} className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <div className="w-1 h-1 rounded-full bg-slate-400 shrink-0"></div>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Form Column */}
          <div className="md:col-span-2">

            {/* ── Profile Tab ── */}
            {tab === "profile" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                {profileSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 border-r-4 border-emerald-600 text-emerald-800 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    {profileSuccess}
                  </div>
                )}
                {profileError && (
                  <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-900 text-red-900 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {profileError}
                  </div>
                )}
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-focus-within:text-red-900 transition-colors">
                      Full Legal Name
                    </label>
                    <input type="text"
                      className="w-full bg-slate-50 border-b-2 border-slate-100 px-0 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-900 focus:bg-white transition-all placeholder:text-slate-300 font-medium"
                      value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-focus-within:text-red-900 transition-colors">
                      Primary Workspace Email
                    </label>
                    <input type="email"
                      className="w-full bg-slate-50 border-b-2 border-slate-100 px-0 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-900 focus:bg-white transition-all placeholder:text-slate-300 font-medium"
                      value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="group opacity-70">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                      System Authority Level
                    </label>
                    <div className="relative">
                      <input type="text"
                        className="w-full bg-slate-50 border-b-2 border-slate-100 px-0 py-3 text-sm text-slate-400 font-bold uppercase tracking-widest cursor-not-allowed"
                        value="Standard User" readOnly />
                      <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button type="submit"
                      className="w-full md:w-auto px-10 py-4 bg-[#450a0a] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded hover:bg-red-900 shadow-xl shadow-red-900/10 transition-all active:scale-95">
                      Save Synchronization
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Password Tab ── */}
            {tab === "password" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                {passwordSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 border-r-4 border-emerald-600 text-emerald-800 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-900 text-red-900 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-6">

                  {/* Current Password */}
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-focus-within:text-red-900 transition-colors">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showOld ? "text" : "password"}
                        placeholder="Enter your current password"
                        className="w-full bg-slate-50 border-b-2 border-slate-100 px-0 py-3 pr-6 text-sm text-slate-900 focus:outline-none focus:border-red-900 focus:bg-white transition-all placeholder:text-slate-300 font-medium"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                      />
                      <EyeIcon show={showOld} toggle={() => setShowOld(!showOld)} />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-focus-within:text-red-900 transition-colors">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        placeholder="Enter your new password"
                        className="w-full bg-slate-50 border-b-2 border-slate-100 px-0 py-3 pr-6 text-sm text-slate-900 focus:outline-none focus:border-red-900 focus:bg-white transition-all placeholder:text-slate-300 font-medium"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <EyeIcon show={showNew} toggle={() => setShowNew(!showNew)} />
                    </div>

                    {/* Password Strength Bar */}
                    {newPassword && strength && (
                      <div className="mt-2">
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${strength.color}`}
                            style={{ width: strength.width }}
                          ></div>
                        </div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                          strength.label === "Strong" ? "text-green-600" :
                          strength.label === "Good" ? "text-blue-600" :
                          strength.label === "Fair" ? "text-yellow-600" :
                          "text-red-500"
                        }`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-focus-within:text-red-900 transition-colors">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        className={`w-full bg-slate-50 border-b-2 px-0 py-3 pr-6 text-sm text-slate-900 focus:outline-none focus:bg-white transition-all placeholder:text-slate-300 font-medium ${
                          confirmPassword && confirmPassword !== newPassword
                            ? "border-red-400"
                            : confirmPassword && confirmPassword === newPassword
                            ? "border-green-400"
                            : "border-slate-100 focus:border-red-900"
                        }`}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <EyeIcon show={showConfirm} toggle={() => setShowConfirm(!showConfirm)} />
                    </div>
                    {/* Match indicator */}
                    {confirmPassword && (
                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                        confirmPassword === newPassword ? "text-green-600" : "text-red-500"
                      }`}>
                        {confirmPassword === newPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full md:w-auto px-10 py-4 bg-[#450a0a] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded hover:bg-red-900 shadow-xl shadow-red-900/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                      {passwordLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Updating...
                        </>
                      ) : (
                        "🔒 Update Password"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <p className="mt-8 text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] text-center md:text-left">
              Secure Identity Vault • AES-256 Protected
            </p>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserProfile;