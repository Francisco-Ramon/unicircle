import { Outlet, Link, createRootRoute, HeadContent, Scripts, redirect } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070A10] px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-slate-400">This page doesn't exist on Campus Connect.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-bold shadow-lg shadow-indigo-600/30">
            Back to Campus Connect
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Campus Connect — Verified Student Social & Dating Ecosystem" },
      { name: "description", content: "The world-class campus social networking and dating platform for verified university students." },
      { name: "theme-color", content: "#070A10" },
      { property: "og:title", content: "Campus Connect — Verified Student Platform" },
      { property: "og:description", content: "Meet genuine verified university students, make friends, date, and connect in a secure campus environment." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster theme="dark" position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}
