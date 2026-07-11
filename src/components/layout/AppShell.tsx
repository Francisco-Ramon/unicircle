import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 min-w-0 relative z-[1] p-6">
        <Outlet />
      </main>
    </div>
  );
}
