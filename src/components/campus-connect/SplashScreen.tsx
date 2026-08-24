import React, { useState, useEffect } from "react";

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Only show splash screen on the very first visit in this session; do not re-trigger on page refresh
  const [phase, setPhase] = useState<"init" | "visible" | "fading" | "hidden">(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("unicircle_splash_shown")) {
      return "hidden";
    }
    return "init";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("unicircle_splash_shown")) {
        setPhase("hidden");
        if (onFinish) onFinish();
        return;
      }
      sessionStorage.setItem("unicircle_splash_shown", "true");
    }

    // Check if reduced motion is preferred
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Fast-track if reduced motion
    const fadeDelay = prefersReducedMotion ? 600 : 2000;
    const hideDelay = prefersReducedMotion ? 900 : 2400;

    const t1 = setTimeout(() => {
      setPhase("visible");
    }, 30);

    const t2 = setTimeout(() => {
      setPhase("fading");
    }, fadeDelay);

    const t3 = setTimeout(() => {
      setPhase("hidden");
      if (onFinish) onFinish();
    }, hideDelay);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  if (phase === "hidden") return null;

  const isVisible = phase === "visible";
  const isFading = phase === "fading";

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] bg-[#000000] flex items-center justify-center pointer-events-none select-none w-screen h-screen transition-opacity duration-450 ease-in-out ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        willChange: "opacity",
      }}
    >
      {/* Centered Logo Asset with X-Style Scale & Fade Entrance */}
      <div
        className="flex items-center justify-center p-4"
        style={{
          opacity: isVisible || isFading ? 1 : 0,
          transform: isVisible || isFading ? "scale(1)" : "scale(0.8)",
          transition: "transform 350ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease-out",
          willChange: "transform, opacity",
        }}
      >
        <img
          src="/unicircle-splash-logo.png"
          alt="UniCircle"
          className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain"
        />
      </div>
    </div>
  );
};
