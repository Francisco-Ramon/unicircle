import { Outlet, Link, useLocation } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard, Inbox, Calendar, CheckSquare, BookOpen, Sparkles, Settings, MessageCircle } from "lucide-react";
import logo from "@/assets/mr-cisco-logo.png";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/reading", label: "Reading Room", icon: BookOpen },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background relative">
      {/* Mobile Header Bar */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border sticky top-0 z-30 backdrop-blur-md bg-sidebar/95">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Mr. Cisco" className="w-8 h-8 rounded-lg shadow-glow" />
          <div>
            <div className="font-semibold text-sm tracking-tight text-sidebar-foreground">Mr. Cisco</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Executive Agent</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent transition"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Navigation Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col transform transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-sidebar-border/30">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Mr. Cisco" className="w-10 h-10 rounded-xl shadow-glow" />
            <div>
              <div className="font-semibold tracking-tight text-sidebar-foreground">Mr. Cisco</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Executive Agent</div>
            </div>
          </div>
          <button 
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <main className="flex-1 min-w-0 relative z-[1] p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
