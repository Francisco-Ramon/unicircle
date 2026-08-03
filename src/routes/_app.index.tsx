import { createFileRoute } from "@tanstack/react-router";
import { CampusConnectApp } from "@/components/campus-connect/CampusConnectApp";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  return <CampusConnectApp />;
}

