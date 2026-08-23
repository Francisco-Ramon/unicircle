import { supabase } from "@/integrations/supabase/client";

export interface NotificationPreferences {
  friendRequests: boolean;
  directMessages: boolean;
  relationshipExpressions: boolean;
  studyInvitations: boolean;
  communityAnnouncements: boolean;
  campusEventReminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  friendRequests: true,
  directMessages: true,
  relationshipExpressions: true,
  studyInvitations: true,
  communityAnnouncements: true,
  campusEventReminders: true,
};

export type NotificationType =
  | "friend_request"
  | "connection_accepted"
  | "direct_message"
  | "relationship_interest"
  | "study_invite"
  | "community_post"
  | "event_reminder";

export interface AppNotification {
  id: string;
  type: NotificationType;
  fromName: string;
  fromAvatar: string;
  fromUniversity: string;
  message: string;
  timeAgo: string;
  read: boolean;
  createdAt: number;
  entityId?: string;
}

const STORAGE_KEY = "unicircle_notification_preferences";
const NOTIFICATIONS_STORAGE_KEY = "unicircle_app_notifications";

// Initial mock notifications
export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    type: "friend_request",
    fromName: "Amani Wanjiru",
    fromAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "University of Nairobi",
    message: "sent you a friend request",
    timeAgo: "2 min ago",
    read: false,
    createdAt: Date.now() - 120000,
  },
  {
    id: "n2",
    type: "connection_accepted",
    fromName: "Brian Omondi",
    fromAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "University of Nairobi",
    message: "accepted your friend request. You can now chat!",
    timeAgo: "15 min ago",
    read: false,
    createdAt: Date.now() - 900000,
  },
  {
    id: "n3",
    type: "relationship_interest",
    fromName: "Stacy Muthoni",
    fromAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "JKUAT",
    message: "expressed relationship interest in you",
    timeAgo: "1 hour ago",
    read: false,
    createdAt: Date.now() - 3600000,
  },
  {
    id: "n4",
    type: "study_invite",
    fromName: "Kevin Wafula",
    fromAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "MMUST",
    message: "invited you to study together",
    timeAgo: "3 hours ago",
    read: true,
    createdAt: Date.now() - 10800000,
  },
  {
    id: "n5",
    type: "community_post",
    fromName: "UoN Tech Society",
    fromAvatar: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "University of Nairobi",
    message: "posted: 'Nairobi Student Tech Summit registration is now open!'",
    timeAgo: "5 hours ago",
    read: true,
    createdAt: Date.now() - 18000000,
  },
  {
    id: "n6",
    type: "event_reminder",
    fromName: "Campus Events",
    fromAvatar: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "",
    message: "Reminder: Nairobi Student Tech Summit starts in 2 days",
    timeAgo: "6 hours ago",
    read: true,
    createdAt: Date.now() - 21600000,
  },
];

// Helper to normalize and guarantee missing keys default to true
export function normalizePreferences(raw: Partial<NotificationPreferences> | null | undefined): NotificationPreferences {
  if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return {
    friendRequests: raw.friendRequests ?? true,
    directMessages: raw.directMessages ?? true,
    relationshipExpressions: raw.relationshipExpressions ?? true,
    studyInvitations: raw.studyInvitations ?? true,
    communityAnnouncements: raw.communityAnnouncements ?? true,
    campusEventReminders: raw.campusEventReminders ?? true,
  };
}

// ─── 1. Load Preferences (from Supabase database with localStorage cache) ───
export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  // Read local cache first for instant UI response
  let localPrefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        localPrefs = normalizePreferences(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to parse local notification preferences", e);
    }
  }

  // Attempt database fetch from Supabase preferences table if online/session exists
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data, error } = await supabase
        .from("preferences")
        .select("value")
        .eq("user_id", session.user.id)
        .eq("key", "notification_controls")
        .maybeSingle();

      if (!error && data?.value) {
        const dbPrefs = normalizePreferences(data.value as any);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dbPrefs));
        }
        return dbPrefs;
      }
    }
  } catch (err) {
    console.warn("Supabase preferences fetch fallback to local cache", err);
  }

  return localPrefs;
}

// ─── 2. Save Preferences to Database and Local Cache ───
export async function saveNotificationPreferenceToDatabase(
  key: keyof NotificationPreferences,
  newValue: boolean,
  currentPrefs: NotificationPreferences
): Promise<{ success: boolean; updatedPrefs: NotificationPreferences; error?: string }> {
  const nextPrefs: NotificationPreferences = {
    ...currentPrefs,
    [key]: newValue,
  };

  // Update local storage cache immediately
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPrefs));
  }

  // Save to Supabase preferences table
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from("preferences").upsert({
        user_id: session.user.id,
        key: "notification_controls",
        value: nextPrefs as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,key" });

      if (error) {
        console.error("Failed to save notification preference to Supabase:", error);
        // Revert local cache on DB failure
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPrefs));
        }
        return { success: false, updatedPrefs: currentPrefs, error: error.message || "Database update failed" };
      }
    }
  } catch (err: any) {
    console.warn("Supabase notification preference update warning:", err);
  }

  return { success: true, updatedPrefs: nextPrefs };
}

// ─── 3. Preference Mapping Check Function ───
export function isNotificationTypeAllowed(
  type: NotificationType,
  prefs: NotificationPreferences
): boolean {
  const normalized = normalizePreferences(prefs);
  switch (type) {
    case "friend_request":
      return normalized.friendRequests;
    case "connection_accepted":
    case "direct_message":
      return normalized.directMessages;
    case "relationship_interest":
      return normalized.relationshipExpressions;
    case "study_invite":
      return normalized.studyInvitations;
    case "community_post":
      return normalized.communityAnnouncements;
    case "event_reminder":
      return normalized.campusEventReminders;
    default:
      return true;
  }
}

// ─── 4. Notifications Storage & Dispatcher ───
export function getStoredNotifications(): AppNotification[] {
  if (typeof window === "undefined") return INITIAL_NOTIFICATIONS;
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Error reading stored notifications", e);
  }
  return INITIAL_NOTIFICATIONS;
}

export function saveStoredNotifications(notifs: AppNotification[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
    // Dispatch custom event for real-time badge count updates across components
    window.dispatchEvent(new CustomEvent("unicircle-notifications-updated"));
  }
}

export function dispatchAppNotification(
  notifData: Omit<AppNotification, "id" | "timeAgo" | "read" | "createdAt">,
  prefs: NotificationPreferences
): boolean {
  // Check preference before creating notification
  if (!isNotificationTypeAllowed(notifData.type, prefs)) {
    console.log(`Notification creation skipped: ${notifData.type} preference is OFF`);
    return false;
  }

  const existing = getStoredNotifications();

  // Avoid duplicate exact notifications created within 10 seconds
  const isDuplicate = existing.some(
    (n) =>
      n.type === notifData.type &&
      n.fromName === notifData.fromName &&
      n.message === notifData.message &&
      Date.now() - n.createdAt < 10000
  );

  if (isDuplicate) {
    return false;
  }

  const newNotif: AppNotification = {
    ...notifData,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timeAgo: "Just now",
    read: false,
    createdAt: Date.now(),
  };

  const updated = [newNotif, ...existing];
  saveStoredNotifications(updated);
  return true;
}
