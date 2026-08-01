import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import logo from "@/assets/mr-cisco-logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  async function handleGoogleAuth() {
    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e.message || "Google Authentication failed");
      setGoogleBusy(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
      setMode("signin");
    } catch (e: any) {
      toast.error(e.message || "Failed to send reset link");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "forgot") return handleForgotPassword(e);

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("rate limit")) {
            toast.error("Email rate limit reached! Use 'Continue with Google' to sign up instantly with 1 click.");
            return;
          }
          throw error;
        }
        if (!data.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) {
            toast.info("Account created! Sign in below or use Google.");
            setMode("signin");
          } else {
            toast.success("Welcome aboard! Setting up your workspace…");
          }
        } else {
          toast.success("Welcome aboard! Setting up your workspace…");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-black/90">
      <div className="w-full max-w-md glass rounded-2xl shadow-elegant p-8 relative z-[1] border border-white/10">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Mr. Cisco" className="w-16 h-16 rounded-2xl shadow-glow mb-3" />
          <h1 className="text-2xl font-semibold text-gradient">Mr. Cisco</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Executive Agent Platform</p>
        </div>

        {/* 1-Click Google Auth Button */}
        {mode !== "forgot" && (
          <div className="mb-5 space-y-3">
            <button
              onClick={handleGoogleAuth}
              disabled={googleBusy}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white text-sm font-semibold flex items-center justify-center gap-3 transition shadow-lg active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {googleBusy ? "Connecting to Google..." : mode === "signup" ? "Sign Up with Google (1-Click)" : "Sign In with Google"}
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">or email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full bg-input/40 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-white"
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-input/40 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-white"
              placeholder="you@company.com"
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground">Password</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-[11px] text-primary/80 hover:text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-input/40 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-white"
                placeholder="••••••••"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full gradient-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium shadow-glow disabled:opacity-50 hover:opacity-95 transition"
          >
            {busy
              ? "Please wait…"
              : mode === "forgot"
              ? "Send Reset Link"
              : mode === "signup"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "forgot" ? (
            <button onClick={() => setMode("signin")} className="text-primary hover:underline">
              ← Back to Sign In
            </button>
          ) : mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-primary hover:underline">
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button onClick={() => setMode("signup")} className="text-primary hover:underline">
                Create one
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

