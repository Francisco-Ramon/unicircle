import { Link, useLocation } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UNICIRCLE_NAV } from "@/config/navigation";

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#0B0F19] border-r border-white/10 h-screen sticky top-0 z-20 text-white">
      {/* Brand Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <img
          src="/unicircle-logo.png"
          alt="UniCircle Logo"
          className="w-10 h-10 object-contain filter drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]"
        />
        <div>
          <div className="font-extrabold tracking-tight text-white flex items-center gap-1">
            Uni<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Circle</span>
          </div>
          <div className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold">Verified Student Network</div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 mt-4 space-y-1.5">
        {UNICIRCLE_NAV.map((item) => {
          const active = location.pathname === item.to || (item.to !== "/app" && location.pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-indigo-400" : "text-slate-400"}`} />
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-pink-400 shadow-glow" />}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/10 bg-slate-950/40">
        <div className="px-2 py-1.5 text-xs text-slate-400 truncate font-medium">{user?.email || "Student Account"}</div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}

