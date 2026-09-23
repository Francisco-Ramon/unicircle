import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    let isAuthenticated = !!session?.user;
    if (!isAuthenticated && typeof window !== "undefined") {
      const stored = localStorage.getItem("unicircle_user_profile");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email && !parsed.email.includes("student@unicircle.app")) {
            isAuthenticated = true;
          }
        } catch (e) {}
      }
    }

    if (!isAuthenticated) {
      navigate({ to: "/auth" });
    } else {
      setChecking(false);
    }
  }, [session, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-[#070A10] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <img src="/unicircle-icon.png" alt="UniCircle" className="w-12 h-12 animate-pulse" />
          <p className="text-xs text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export { Outlet };


