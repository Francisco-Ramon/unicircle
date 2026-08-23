import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070A10] px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-slate-400">This page doesn't exist on UniCircle.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/app"
            hash="home"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 text-sm font-bold shadow-lg shadow-indigo-600/30 hover:opacity-90 transition-opacity"
          >
            Back to UniCircle Home
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
      { title: "UniCircle — Find Your Circle" },
      { name: "description", content: "Meet verified university students. Build friendships, discover opportunities, and create meaningful relationships in a trusted community." },
      { name: "theme-color", content: "#070A10" },
      { property: "og:title", content: "UniCircle — Verified University Social Network" },
      { property: "og:description", content: "Connect with verified students from every participating university. Meet friends, find study partners, and network securely." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/unicircle-logo.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/unicircle-logo.png" }
    ],
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

