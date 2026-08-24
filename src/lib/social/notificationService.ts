import { safeSetItem } from "../safeStorage";
import { SocialNotification, UserProfile } from "./types";
import { RealtimeDistributionService } from "./realtimeService";

const notificationsStore: SocialNotification[] = [];
const STORAGE_KEY_NOTIFICATIONS = "unicircle_social_notifications";

function hydrateNotifications() {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (saved) {
      const parsed: SocialNotification[] = JSON.parse(saved);
      parsed.forEach((n) => notificationsStore.push(n));
    }
  } catch (e) {}
}

function persistNotifications() {
  if (typeof window === "undefined") return;
  try {
    safeSetItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notificationsStore.slice(0, 100)));
  } catch (e) {}
}

hydrateNotifications();

export class SocialNotificationService {
  /**
   * Create and deliver a notification
   */
  static async createNotification(params: {
    userId: string;
    actor: UserProfile | { id: string; name: string; avatar?: string };
    type: "follow" | "like" | "comment" | "mention" | "post";
    entityId?: string;
    message: string;
  }): Promise<SocialNotification> {
    const actorName = "firstName" in params.actor 
      ? `${params.actor.firstName} ${params.actor.lastName || ""}`.trim()
      : params.actor.name;
    const actorAvatar = "photos" in params.actor && params.actor.photos?.[0]
      ? params.actor.photos[0]
      : ("avatar" in params.actor && params.actor.avatar ? params.actor.avatar : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100");

    const notif: SocialNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: params.userId,
      actorId: params.actor.id,
      actorName,
      actorAvatar,
      type: params.type,
      entityId: params.entityId,
      message: params.message,
      read: false,
      createdAt: new Date().toISOString(),
    };

    notificationsStore.unshift(notif);
    persistNotifications();

    // Deliver via real-time stream
    RealtimeDistributionService.deliverNotificationToUser(params.userId, notif);

    return notif;
  }

  static getNotificationsForUser(userId: string): SocialNotification[] {
    return notificationsStore.filter((n) => n.userId === userId);
  }

  static markAllAsRead(userId: string) {
    notificationsStore.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
    persistNotifications();
  }
}
