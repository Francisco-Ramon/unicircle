import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { RegistrationWizard, StudentProfileData } from "@/components/campus-connect/RegistrationWizard";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  useEffect(() => {
    if (session?.user) {
      navigate({ to: "/app" });
    }
  }, [session, navigate]);

  const handleRegistrationComplete = (profile: StudentProfileData) => {
    toast.success(`Welcome to UniCircle, ${profile.firstName}!`);
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen py-10 px-4 relative bg-[#070A10] text-white flex flex-col items-center justify-center">
      {/* Ambient background glow */}
      <div className="fixed inset-0 bg-gradient-to-tr from-indigo-950/40 via-purple-950/20 to-pink-950/40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        <RegistrationWizard
          onComplete={handleRegistrationComplete}
        />
      </div>

      <div className="relative z-10 mt-6 text-center text-xs text-slate-500">
        <Link to="/" className="text-slate-400 hover:text-white transition">
          ← Back to Landing Page
        </Link>
      </div>
    </div>
  );
}
