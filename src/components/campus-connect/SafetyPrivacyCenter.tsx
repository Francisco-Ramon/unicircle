import React, { useState } from "react";
import { ShieldAlert, EyeOff, MapPin, AlertTriangle, Lock, UserX, Bell, CheckCircle2, ChevronRight, PhoneCall } from "lucide-react";

export const SafetyPrivacyCenter: React.FC = () => {
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [obfuscateDistance, setObfuscateDistance] = useState(true);
  const [screenshotGuard, setScreenshotGuard] = useState(true);
  const [blockedUsersCount, setBlockedUsersCount] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSuccess(true);
    setTimeout(() => {
      setShowReportModal(false);
      setReportSuccess(false);
      setReportReason("");
    }, 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 bg-slate-900 border border-white/15 rounded-3xl backdrop-blur-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" /> Student Safety Shield
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Privacy & Safety Control Center</h2>
          <p className="text-xs text-slate-400 mt-1">Manage your location visibility, incognito mode, and instant security settings.</p>
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center gap-2 self-start sm:self-auto"
        >
          <AlertTriangle className="w-4 h-4 text-red-400" /> Emergency Report Profile
        </button>
      </div>

      {/* Safety Toggles List */}
      <div className="p-6 bg-slate-900 border border-white/15 rounded-3xl backdrop-blur-2xl shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white mb-2">Privacy Controls</h3>

        {/* Incognito mode */}
        <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-white/5 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">Incognito Mode (Ghost Mode)</span>
              <span className="text-xs text-slate-400">Only profiles you like first will be able to see your profile</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={incognitoMode}
            onChange={(e) => setIncognitoMode(e.target.checked)}
            className="w-5 h-5 accent-indigo-500 rounded"
          />
        </label>

        {/* Location Obfuscation */}
        <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-white/5 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">Obfuscate Precise GPS Distance</span>
              <span className="text-xs text-slate-400">Display university campus name only rather than exact meter distance</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={obfuscateDistance}
            onChange={(e) => setObfuscateDistance(e.target.checked)}
            className="w-5 h-5 accent-indigo-500 rounded"
          />
        </label>

        {/* Screenshot Protection */}
        <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-white/5 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">Screenshot Guard & Watermarking</span>
              <span className="text-xs text-slate-400">Automatically block screenshots and flag attempt alerts in chats</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={screenshotGuard}
            onChange={(e) => setScreenshotGuard(e.target.checked)}
            className="w-5 h-5 accent-emerald-500 rounded"
          />
        </label>
      </div>

      {/* Blocked Users */}
      <div className="p-6 bg-slate-900 border border-white/15 rounded-3xl backdrop-blur-2xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Blocked Student Profiles</h4>
            <p className="text-xs text-slate-400">{blockedUsersCount} profiles currently blocked</p>
          </div>
        </div>

        <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition">
          Manage Blocklist
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Emergency Report
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 text-xs">Close</button>
            </div>

            {reportSuccess ? (
              <div className="p-6 text-center text-emerald-400 space-y-2">
                <CheckCircle2 className="w-12 h-12 mx-auto" />
                <h4 className="text-lg font-bold text-white">Report Submitted</h4>
                <p className="text-xs text-slate-300">Our campus safety team and AI moderation desk have received your report.</p>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-4">
                <p className="text-xs text-slate-300">Please select the reason for reporting this student profile or activity:</p>
                <select
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-2xl text-xs text-white"
                >
                  <option value="">Select reason...</option>
                  <option value="fake">Fake Profile / Catfish</option>
                  <option value="harassment">Harassment or Inappropriate Messages</option>
                  <option value="underage">Non-Student or Invalid Campus Identity</option>
                  <option value="spam">Spam / Advertising</option>
                </select>

                <button
                  type="submit"
                  disabled={!reportReason}
                  className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs transition shadow-lg shadow-red-600/30"
                >
                  Submit Confidential Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
