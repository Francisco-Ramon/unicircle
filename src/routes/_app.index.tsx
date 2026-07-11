import { createFileRoute } from "@tanstack/react-router";
import { ChatPanel } from "@/components/chat/ChatPanel";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="h-[calc(100vh-3rem)]">
      <ChatPanel />
    </div>
  );
}
