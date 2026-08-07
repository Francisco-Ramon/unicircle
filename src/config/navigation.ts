import { Flame, MessageSquare, Calendar, Users, User } from "lucide-react";

export const UNICIRCLE_NAV = [
  { to: "/app", label: "Discover", icon: Flame, description: "Swipe & Meet Students" },
  { to: "/app?tab=chat", label: "Chat", icon: MessageSquare, description: "Messages & Matches" },
  { to: "/app?tab=events", label: "Events", icon: Calendar, description: "Campus Activities" },
  { to: "/app?tab=community", label: "Community", icon: Users, description: "Campus Network" },
  { to: "/app?tab=profile", label: "Profile", icon: User, description: "Your Account" },
] as const;
