import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Inbox, Calendar, CheckSquare, BookOpen, Sparkles, Settings, LogOut, MessageCircle } from "lucide-react";
import logo from "@/assets/mr-cisco-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 z-10">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <img src={logo} alt="Mr. Cisco" className="w-10 h-10 rounded-xl shadow-glow" />
        <div>
          <div className="font-semibold tracking-tight text-sidebar-foreground">Mr. Cisco</div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Executive Agent</div>
        </div>
      </div>

      <nav className="flex-1 px-3 mt-4 space-y-1">
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
  );
}
