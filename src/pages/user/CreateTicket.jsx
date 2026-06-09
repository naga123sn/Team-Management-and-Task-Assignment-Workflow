import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../../components/user/UserLayout";
import { createTicket, getMyTickets } from "../../services/ticketService";

const CATEGORIES = [
  { value: "Technical",        label: "⚙️ Technical",        desc: "System issues, bugs, errors"          },
  { value: "Billing",          label: "💳 Billing",          desc: "Payment and invoice queries"           },
  { value: "General",          label: "💬 General",          desc: "General inquiries and questions"       },
  { value: "Bug Report",       label: "🐛 Bug Report",       desc: "Report a software defect"              },
  { value: "Feature Request",  label: "✨ Feature Request",  desc: "Suggest a new feature or improvement"  },
];

const PRIORITY_INFO = {
  low:    { label: "🟢 Low — Routine",    desc: "Assigned to Junior agent",  color: "bg-green-50 text-green-700 border-green-200"  },
  medium: { label: "🟡 Medium — Standard", desc: "Assigned to Mid-level agent", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  high:   { label: "🔴 High — Urgent",    desc: "Assigned to Senior agent",  color: "bg-red-50 text-red-700 border-red-200"       },
};

const CreateTicket = () => {
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]     = useState("low");
  const [category, setCategory]     = useState("General");
  const [error, setError]           = useState("");
  const [duplicateTicket, setDuplicateTicket] = useState(null);
  const [titleWarning, setTitleWarning]       = useState("");
  const [myTickets, setMyTickets]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMyTickets()
      .then((res) => setMyTickets(res.data))
      .catch(() => {});
  }, []);

  // Real-time duplicate check
  useEffect(() => {
    if (!title.trim()) {
      setTitleWarning(""); setDuplicateTicket(null); return;
    }
    const match = myTickets.find(
      (t) => t.title.toLowerCase().trim() === title.toLowerCase().trim()
    );
    if (match) {
      setTitleWarning(`Duplicate — Ticket #${match.id} already exists with this title.`);
      setDuplicateTicket(match);
    } else {
      setTitleWarning(""); setDuplicateTicket(null);
    }
  }, [title, myTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (duplicateTicket) {
      setError(`Duplicate ticket detected. Ticket #${duplicateTicket.id} already exists.`);
      return;
    }
    setSubmitting(true);
    try {
      await createTicket({ title: title.trim(), description, priority, category });
      navigate("/user/tickets");
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response?.data?.detail || "Duplicate ticket detected.");
      } else {
        setError("Failed to create ticket. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const priorityInfo = PRIORITY_INFO[priority];

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto py-10 px-6">

        {/* Header */}
        <div className="mb-10">
          <nav className="flex items-center gap-2 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            <span>Platform</span><span>/</span>
            <span>Tickets</span><span>/</span>
            <span className="text-red-900 font-black">New Submission</span>
          </nav>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tighter">
            Create Support Ticket
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Our system automatically assigns your ticket to the right agent based on priority.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="h-1.5 w-full bg-[#450a0a]"></div>

          <div className="p-8 md:p-12">

            {/* Error */}
            {error && (
              <div className="mb-8 p-4 bg-red-50 border-l-2 border-red-900 text-red-900 text-xs font-bold uppercase tracking-widest flex items-start gap-3">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p>{error}</p>
                  {duplicateTicket && (
                    <button
                      onClick={() => navigate(`/user/tickets/${duplicateTicket.id}`)}
                      className="mt-1 text-[10px] underline hover:no-underline font-black"
                    >
                      → View Existing Ticket #{duplicateTicket.id}
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Title + Priority */}
              <div className="grid md:grid-cols-3 gap-8">

                {/* Title */}
                <div className="md:col-span-2 group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-red-900 transition-colors">
                    Incident Title
                  </label>
                  <input
                    type="text"
                    placeholder="Brief summary of the issue"
                    className={`w-full bg-slate-50 border rounded-md px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:bg-white transition-all placeholder:text-slate-300 ${
                      duplicateTicket
                        ? "border-orange-400 focus:ring-orange-400 bg-orange-50"
                        : "border-slate-200 focus:ring-red-900"
                    }`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  {titleWarning && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <span className="text-orange-500 text-sm shrink-0">⚠️</span>
                      <div>
                        <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider">Duplicate Detected</p>
                        <p className="text-[10px] text-orange-600 mt-0.5">{titleWarning}</p>
                        <button type="button"
                          onClick={() => navigate(`/user/tickets/${duplicateTicket.id}`)}
                          className="mt-1 text-[10px] font-black text-orange-700 underline uppercase tracking-wider">
                          → View Ticket #{duplicateTicket.id}
                        </button>
                      </div>
                    </div>
                  )}
                  {title.trim() && !duplicateTicket && (
                    <p className="mt-1.5 text-[10px] font-bold text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      Title is available
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-red-900 transition-colors">
                    Priority Level
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-900 appearance-none transition-all cursor-pointer"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="low">Low - Routine</option>
                      <option value="medium">Medium - Standard</option>
                      <option value="high">High - Urgent</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Auto-assign info */}
                  <div className={`mt-2 px-3 py-2 rounded-md border text-[10px] font-bold ${priorityInfo.color}`}>
                    <p>{priorityInfo.label}</p>
                    <p className="font-medium opacity-80 mt-0.5">🤖 {priorityInfo.desc}</p>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  Ticket Category
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        category === cat.value
                          ? "bg-[#450a0a] text-white border-[#450a0a] shadow-lg shadow-red-900/20"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-red-900 hover:bg-red-50"
                      }`}
                    >
                      <p className="text-sm font-bold">{cat.label}</p>
                      <p className={`text-[9px] mt-1 leading-tight ${
                        category === cat.value ? "text-red-200" : "text-slate-400"
                      }`}>
                        {cat.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-red-900 transition-colors">
                  Technical Description
                </label>
                <textarea
                  rows={6}
                  placeholder="Describe the steps to reproduce or the nature of the query..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-4 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-900 focus:bg-white transition-all resize-none placeholder:text-slate-300"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <p className="mt-1 text-[10px] text-slate-400 text-right font-medium">
                  {description.length} characters
                </p>
              </div>

              {/* Auto-assign info banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-blue-500 text-lg shrink-0">🤖</span>
                <div>
                  <p className="text-xs font-black text-blue-700 uppercase tracking-wider">
                    Auto-Assignment System Active
                  </p>
                  <p className="text-[10px] text-blue-600 mt-1 leading-relaxed">
                    Your ticket will be automatically assigned to the most suitable agent based on priority:
                    <span className="font-bold"> High → Senior</span>,
                    <span className="font-bold"> Medium → Mid-level</span>,
                    <span className="font-bold"> Low → Junior</span>.
                    You'll receive an email and notification once assigned.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100">
                <div className="flex items-center gap-3 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Estimated response: &lt; 2 Hours
                  </span>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate("/user/tickets")}
                    className="flex-1 md:flex-none px-8 py-3 bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-[0.2em] rounded hover:bg-slate-50 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={!!duplicateTicket || submitting}
                    className={`flex-1 md:flex-none px-10 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      duplicateTicket
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                        : "bg-[#450a0a] text-white hover:bg-red-900 shadow-red-900/20"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : duplicateTicket ? "⚠️ Duplicate Title" : "Submit Entry"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-400 text-[9px] font-bold uppercase tracking-[0.3em]">
          Secure Transmission Enabled • Auto-Assignment Powered by Rule Engine
        </p>
      </div>
    </UserLayout>
  );
};

export default CreateTicket;