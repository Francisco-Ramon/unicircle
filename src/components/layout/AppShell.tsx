import { Outlet, Link, useLocation } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { UNICIRCLE_NAV } from "@/config/navigation";

export function AppShell({ children }: { children?: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#070A10] text-white relative selection:bg-indigo-500 selection:text-white">
      {/* Mobile Header Bar */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-[#0B0F19]/90 border-b border-white/10 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img src="/unicircle-logo.png" alt="UniCircle Logo" className="w-8 h-8 object-contain" />
          <div>
            <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1">
              Uni<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Circle</span>
            </div>
            <div className="text-[9px] tracking-wider uppercase text-slate-400 font-semibold">Verified Student Network</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Navigation Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 w-72 bg-[#0B0F19] border-r border-white/10 z-50 flex flex-col transform transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/unicircle-logo.png" alt="UniCircle Logo" className="w-9 h-9 object-contain" />
            <div>
              <div className="font-extrabold tracking-tight text-white flex items-center gap-1">
                Uni<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Circle</span>
              </div>
              <div className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold">Verified Student Network</div>
            </div>
          </div>
          <button 
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1.5 overflow-y-auto">
          {UNICIRCLE_NAV.map((item) => {
            const active = location.pathname === item.to || (item.to !== "/app" && location.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-white"
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

      {/* Main Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <main className="flex-1 min-w-0 relative z-[1] p-4 md:p-6">
        {children || <Outlet />}
      </main>
    </div>
  );
}

