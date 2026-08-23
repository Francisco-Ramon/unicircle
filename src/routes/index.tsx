import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { SplashScreen } from "@/components/campus-connect/SplashScreen";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { session } = useAuth();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#070A10] text-white selection:bg-indigo-500 selection:text-white">
      {/* UniCircle X-Style Launch Splash Screen */}
      <SplashScreen />

      {/* Background Campus Lifestyle Image with Dual Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2000&q=85"
          alt="University students on campus"
          className="w-full h-full object-cover object-center scale-105 filter brightness-75 transition-transform duration-1000"
        />
        {/* Dark Vignette + Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A10] via-[#070A10]/70 to-[#070A10]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A10]/90 via-transparent to-[#070A10]/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-[#070A10]" />
      </div>

      {/* Top Header / Navigation Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/unicircle-icon.png"
            alt="UniCircle Logo"
            className="w-10 h-10 md:w-12 md:h-12 object-contain hover:scale-105 transition-transform duration-300"
          />
          <span className="text-xl md:text-2xl font-black tracking-tight text-white">
            Uni<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-pink-500">Circle</span>
          </span>
        </div>
      </header>

      {/* Main One-Screen Hero Content */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-6 py-8 my-auto text-center flex flex-col items-center justify-center">
        {/* Verification Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-md mb-8 animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300 tracking-wide uppercase">
            Exclusive to Verified University Students
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[1.05] text-white mb-6">
          Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Circle.</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-lg sm:text-xl md:text-2xl font-normal text-slate-300/90 leading-relaxed mb-10">
          Meet verified university students. Build friendships, discover opportunities, and create meaningful relationships in a trusted community.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            to="/app"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-base md:text-lg shadow-xl shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-[1.03] transition-all flex items-center justify-center gap-2"
          >
            Explore UniCircle Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>


      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 text-xs text-slate-400">
        <div>
          © {new Date().getFullYear()} UniCircle. All rights reserved.
        </div>
        <div className="flex items-center gap-6 font-medium">
          <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
          <a href="#safety" className="hover:text-white transition-colors">Safety</a>
          <a href="#guidelines" className="hover:text-white transition-colors">Community Guidelines</a>
          <a href="#terms" className="hover:text-white transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
}
