import React, { useState, useEffect } from "react";

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Phase state: 'init' | 'visible' | 'fading' | 'hidden'
  const [phase, setPhase] = useState<"init" | "visible" | "fading" | "hidden">("init");

  useEffect(() => {
    // Check if reduced motion is preferred
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Timeline steps (in ms)
    // 0ms: init -> visible (trigger scale 0.8 -> 1.0 & opacity 0 -> 1)
    const t1 = setTimeout(() => {
      setPhase("visible");
    }, 50);

    // 1000ms: visible -> fading (fade out splash overlay 1 -> 0)
    const t2 = setTimeout(() => {
      setPhase("fading");
    }, 1050);

    // 1500ms: fading -> hidden (unmount from DOM)
    const t3 = setTimeout(() => {
      setPhase("hidden");
      if (onFinish) onFinish();
    }, 1500);

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
