import { Outlet, Link, createRootRoute, HeadContent, Scripts, redirect } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist in Mr. Cisco.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-lg gradient-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-glow">
            Back to dashboard
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
      { title: "Mr. Cisco — Executive Agent Platform" },
      { name: "description", content: "Your AI executive assistant for inbox, calendar, tasks, and reading insights." },
      { name: "theme-color", content: "#1a0d2e" },
      { property: "og:title", content: "Mr. Cisco — Executive Agent" },
      { property: "og:description", content: "A personal operating system for productivity, finance, and planning." },
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
