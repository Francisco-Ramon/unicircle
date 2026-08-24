import { Post, SocialNotification } from "./types";
import { supabase } from "@/integrations/supabase/client";

type RealtimeListener = (data: any) => void;

export class RealtimeDistributionService {
  private static userChannels: Map<string, Set<RealtimeListener>> = new Map();
  private static globalFeedListeners: Set<(post: Post) => void> = new Set();

  /**
   * Register a user's client session to their personal real-time notification/feed stream
   */
  static subscribeUser(userId: string, listener: RealtimeListener): () => void {
    if (!this.userChannels.has(userId)) {
      this.userChannels.set(userId, new Set());
    }
    this.userChannels.get(userId)!.add(listener);

    return () => {
      this.userChannels.get(userId)?.delete(listener);
    };
  }

  /**
   * Register a global feed listener (for broadcast feeds)
   */
  static subscribeGlobalFeed(listener: (post: Post) => void): () => void {
    this.globalFeedListeners.add(listener);
    return () => {
      this.globalFeedListeners.delete(listener);
    };
  }

  /**
   * Deliver a new post event to a specific online user
   */
  static deliverPostToUser(userId: string, post: Post) {
    const listeners = this.userChannels.get(userId);
    if (listeners && listeners.size > 0) {
      listeners.forEach((fn) => {
        try {
          fn({ event: "NEW_POST", post });
        } catch (e) {}
      });
    }
  }

  /**
   * Broadcast post across the cluster / campus
   */
  static broadcastPost(post: Post) {
    this.globalFeedListeners.forEach((fn) => {
      try {
        fn(post);
      } catch (e) {}
    });
  }

  /**
   * Deliver a notification to a specific online user
   */
  static deliverNotificationToUser(userId: string, notif: SocialNotification) {
    const listeners = this.userChannels.get(userId);
    if (listeners && listeners.size > 0) {
      listeners.forEach((fn) => {
        try {
          fn({ event: "NEW_NOTIFICATION", notification: notif });
        } catch (e) {}
      });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("unicircle-notification-received", { detail: notif })
      );
    }
  }
}
