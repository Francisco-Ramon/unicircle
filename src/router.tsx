import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-400">
          An unexpected error occurred. Please try again.
        </p>
        {error?.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-slate-900 border border-white/10 p-3 text-left font-mono text-xs text-red-400">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("unicircle_community_posts");
                localStorage.removeItem("unicircle_community_events");
                window.location.href = "/app#home";
              }
            }}
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5 cursor-pointer"
          >
            Reset Feed & Reload
          </button>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
};
