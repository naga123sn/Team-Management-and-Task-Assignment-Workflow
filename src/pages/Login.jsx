import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, registerUser } from "../services/authService";

const Login = () => {
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

const handleLogin = async (e) => {
  e.preventDefault();
  setError(""); setSuccess("");
  try {
    const res = await loginUser(email, password);
    const { user, access_token } = res.data;
    login(user, access_token);
    if (user.role === "admin") navigate("/admin/dashboard");
    else navigate("/user/dashboard");
  } catch (err) {
    const detail = err.response?.data?.detail;
    const status = err.response?.status;
    if (status === 429) {
      setError("🔒 " + detail); // blocked message
    } else {
      setError(detail || "Invalid email or password.");
    }
  }
};

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await registerUser(name, email, password);
      setSuccess("Account created! You can now log in.");
      setTab("login");
      setName(""); setPassword("");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-red-100 selection:text-red-900">
      
      {/* SECTION 1: HERO & AUTH SPLIT */}
      <section className="relative flex flex-col md:flex-row min-h-screen border-b border-slate-100">
        
        {/* Left Side: Dark Red Brand Engagement */}
        <div className="md:w-7/12 bg-[#450a0a] (dark-red) p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border-[40px] border-white"></div>
            <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-red-500 blur-3xl"></div>
          </div>

          <div className="z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl">🎫</span>
              </div>
              <span className="text-white font-bold text-2xl tracking-tighter italic">QUERY.IO</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] mb-8">
              Resolve <span className="text-red-400">Faster.</span> <br />
              Grow <span className="text-red-200">Better.</span>
            </h1>
            <p className="text-red-100/80 text-lg md:text-xl max-w-xl leading-relaxed mb-10">
              The premium enterprise ticket management suite designed for high-performing support teams. Secure, scalable, and stunningly simple.
            </p>

            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#450a0a] bg-slate-200 flex items-center justify-center text-[10px] font-bold">U{i}</div>
                ))}
              </div>
              <p className="text-red-200 text-sm font-medium italic">Join 2,000+ support heroes today</p>
            </div>
          </div>

          <div className="z-10 mt-12 pt-8 border-t border-red-900/50 flex gap-10">
            <div>
                <p className="text-white text-3xl font-black italic">12ms</p>
                <p className="text-red-300 text-xs uppercase tracking-widest font-bold">Latency</p>
            </div>
            <div>
                <p className="text-white text-3xl font-black italic">99%</p>
                <p className="text-red-300 text-xs uppercase tracking-widest font-bold">Satisfaction</p>
            </div>
          </div>
        </div>

        {/* Right Side: Blanc White Auth Card */}
        <div className="md:w-5/12 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            
            <div className="mb-10 text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome to Query.io</h2>
                <p className="text-slate-500 mt-2 font-medium">Please sign in to your workspace.</p>
            </div>

            {/* Unique Pill Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-8 border border-slate-200">
              <button
                onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 ${
                  tab === "login" ? "bg-white text-[#450a0a] shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                LOGIN
              </button>
              <button
                onClick={() => { setTab("register"); setError(""); setSuccess(""); }}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 ${
                  tab === "register" ? "bg-white text-[#450a0a] shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                REGISTER
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-700 text-red-900 text-sm font-semibold flex items-center gap-3 animate-in fade-in zoom-in">
                <span>✕</span> {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border-r-4 border-emerald-700 text-emerald-900 text-sm font-semibold flex items-center gap-3">
                <span>✓</span> {success}
              </div>
            )}

            <form onSubmit={tab === "login" ? handleLogin : handleRegister} className="space-y-6">
              {tab === "register" && (
                <div className="group">
                  <label className="block text-[10px] font-black text-[#450a0a] uppercase tracking-[0.2em] mb-2 transition-colors group-focus-within:text-red-600">Full Identity</label>
                  <input type="text"
                    className="w-full bg-slate-50 border-b-2 border-slate-200 px-0 py-3 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#450a0a] focus:bg-white transition-all"
                    placeholder="Enter your name"
                    value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              
              <div className="group">
                <label className="block text-[10px] font-black text-[#450a0a] uppercase tracking-[0.2em] mb-2 transition-colors group-focus-within:text-red-600">Email Workspace</label>
                <input type="email"
                  className="w-full bg-slate-50 border-b-2 border-slate-200 px-0 py-3 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#450a0a] focus:bg-white transition-all"
                  placeholder="name@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="group">
                <label className="block text-[10px] font-black text-[#450a0a] uppercase tracking-[0.2em] mb-2 transition-colors group-focus-within:text-red-600">Access Password</label>
                <input type="password"
                  className="w-full bg-slate-50 border-b-2 border-slate-200 px-0 py-3 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#450a0a] focus:bg-white transition-all"
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <button type="submit"
                className="w-full bg-[#450a0a] text-white py-5 rounded-xl text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-red-900/20 hover:bg-red-900 hover:-translate-y-1 active:scale-95 transition-all duration-300">
                {tab === "login" ? "Initialize Session" : "Create Workspace"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* SECTION 2: FEATURES GRID */}
      <section className="py-24 px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[10px] font-black text-red-700 tracking-[0.5em] uppercase mb-4">Core Ecosystem</h2>
            <p className="text-4xl font-black text-[#450a0a]">Why Industry Leaders Choose Us</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { t: "AI Query Routing", d: "Automatic ticket classification based on intent and sentiment.", i: "⚡" },
              { t: "Zero-Trust Security", d: "Enterprise-grade encryption for every customer interaction.", i: "🛡️" },
              { t: "Live Engagement", d: "Real-time sync between agents and users for instant resolution.", i: "💬" }
            ].map((f, i) => (
              <div key={i} className="bg-white p-10 rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all group">
                <div className="text-4xl mb-6 group-hover:scale-125 transition-transform inline-block">{f.i}</div>
                <h3 className="text-xl font-bold mb-3 text-[#450a0a]">{f.t}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: QUOTE/TESTIMONIAL */}
      <section className="py-20 px-8 bg-[#450a0a] text-white overflow-hidden relative">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-6xl text-red-500 opacity-50 font-serif leading-none block mb-4">“</span>
          <p className="text-2xl md:text-3xl font-medium leading-snug mb-8">
            Query.io has transformed our support response time by <span className="text-red-400 font-black">40%</span>. It’s not just a tool; it’s our backbone for customer happiness.
          </p>
          <div className="flex flex-col items-center">
             <div className="w-12 h-12 rounded-full bg-slate-300 mb-4 border-2 border-red-500"></div>
             <p className="font-bold tracking-widest uppercase text-xs">Sarah Jenkins</p>
             <p className="text-red-400 text-[10px] font-bold mt-1">Head of Ops, TechCorp</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-900 rounded-full blur-[120px] -mr-32 -mt-32 opacity-50"></div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-100 bg-white px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎫</span>
            <span className="font-black text-sm tracking-tighter">QUERY.IO</span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            © 2024 Secure Query Management Platform. All Rights Reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-slate-400 hover:text-red-800 cursor-pointer text-xs font-bold uppercase">Status</span>
            <span className="text-slate-400 hover:text-red-800 cursor-pointer text-xs font-bold uppercase">Privacy</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Login;