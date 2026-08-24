/**
 * Safe Storage Utility:
 * Prevents DOMException: QuotaExceededError from ever crashing the application.
 * If localStorage quota is exceeded, automatically purges non-essential cached items.
 */

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[SafeStorage] Storage setItem failed for key "${key}":`, err?.message || err);

    // If quota exceeded, clean up non-essential caches
    try {
      const keysToPurge = [
        "unicircle_cloud_posts_cache",
        "unicircle_cloud_events_cache",
        "unicircle_cloud_profiles_cache",
        "unicircle_community_posts",
        "unicircle_community_events",
        "unicircle_campus_events",
        "unicircle_posts_repo_v2",
        "unicircle_feed_items_v2",
        "unicircle_chat_messages",
      ];

      for (const k of keysToPurge) {
        if (k !== key) {
          localStorage.removeItem(k);
        }
      }

      // Retry once after clearing heavy caches
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`[SafeStorage] Retry after purge failed for key "${key}". Skipping localStorage write.`);
      return false;
    }
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (err) {}
}
