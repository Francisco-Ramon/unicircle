import { safeSetItem } from "../safeStorage";
import { Follow, Block, UserProfile } from "./types";
import { supabase } from "@/integrations/supabase/client";

// Authoritative in-memory / localStorage cache + Supabase sync
const followsStore: Map<string, Set<string>> = new Map(); // followerId -> Set of followingIds
const followersStore: Map<string, Set<string>> = new Map(); // followingId -> Set of followerIds
const blocksStore: Map<string, Set<string>> = new Map(); // blockerId -> Set of blockedIds

const STORAGE_KEY_FOLLOWS = "unicircle_graph_follows";
const STORAGE_KEY_BLOCKS = "unicircle_graph_blocks";

function hydrateLocalGraph() {
  if (typeof window === "undefined") return;
  try {
    const savedFollows = localStorage.getItem(STORAGE_KEY_FOLLOWS);
    if (savedFollows) {
      const parsed: Follow[] = JSON.parse(savedFollows);
      parsed.forEach((f) => {
        if (!followsStore.has(f.followerId)) followsStore.set(f.followerId, new Set());
        followsStore.get(f.followerId)!.add(f.followingId);

        if (!followersStore.has(f.followingId)) followersStore.set(f.followingId, new Set());
        followersStore.get(f.followingId)!.add(f.followerId);
      });
    }

    const savedBlocks = localStorage.getItem(STORAGE_KEY_BLOCKS);
    if (savedBlocks) {
      const parsed: Block[] = JSON.parse(savedBlocks);
      parsed.forEach((b) => {
        if (!blocksStore.has(b.blockerId)) blocksStore.set(b.blockerId, new Set());
        blocksStore.get(b.blockerId)!.add(b.blockedId);
      });
    }
  } catch (e) {
    console.warn("Could not hydrate social graph from storage:", e);
  }
}

function persistLocalGraph() {
  if (typeof window === "undefined") return;
  try {
    const allFollows: Follow[] = [];
    followsStore.forEach((followings, followerId) => {
      followings.forEach((followingId) => {
        allFollows.push({ followerId, followingId, createdAt: new Date().toISOString() });
      });
    });
    safeSetItem(STORAGE_KEY_FOLLOWS, JSON.stringify(allFollows));

    const allBlocks: Block[] = [];
    blocksStore.forEach((blockedSet, blockerId) => {
      blockedSet.forEach((blockedId) => {
        allBlocks.push({ blockerId, blockedId, createdAt: new Date().toISOString() });
      });
    });
    safeSetItem(STORAGE_KEY_BLOCKS, JSON.stringify(allBlocks));
  } catch (e) {}
}

hydrateLocalGraph();

export class SocialGraphService {
  /**
   * Follow a user
   */
  static async followUser(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) return false;
    
    // Cannot follow if blocked
    if (this.isBlocked(followerId, followingId) || this.isBlocked(followingId, followerId)) {
      return false;
    }

    if (!followsStore.has(followerId)) followsStore.set(followerId, new Set());
    followsStore.get(followerId)!.add(followingId);

    if (!followersStore.has(followingId)) followersStore.set(followingId, new Set());
    followersStore.get(followingId)!.add(followerId);

    persistLocalGraph();

    // Sync to Supabase swipes / follows table in background
    supabase.from("swipes" as any).upsert({
      swiper_id: followerId,
      target_id: followingId,
      action: "like",
      created_at: new Date().toISOString()
    }, { onConflict: "swiper_id,target_id" }).then(() => {}).catch(() => {});

    return true;
  }

  /**
   * Unfollow a user
   */
  static async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    if (followsStore.has(followerId)) {
      followsStore.get(followerId)!.delete(followingId);
    }
    if (followersStore.has(followingId)) {
      followersStore.get(followingId)!.delete(followerId);
    }
    persistLocalGraph();

    supabase.from("swipes" as any)
      .delete()
      .match({ swiper_id: followerId, target_id: followingId })
      .then(() => {}).catch(() => {});

    return true;
  }

  /**
   * Check if User A follows User B
   */
  static isFollowing(followerId: string, followingId: string): boolean {
    return followsStore.get(followerId)?.has(followingId) ?? false;
  }

  /**
   * Get all follower IDs of a user
   */
  static getFollowers(userId: string): string[] {
    return Array.from(followersStore.get(userId) || []);
  }

  /**
   * Get all user IDs that this user is following
   */
  static getFollowing(userId: string): string[] {
    return Array.from(followsStore.get(userId) || []);
  }

  /**
   * Get follower count
   */
  static getFollowerCount(userId: string): number {
    return followersStore.get(userId)?.size || 0;
  }

  /**
   * Block a user
   */
  static async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    if (blockerId === blockedId) return false;

    // Remove any existing follow relationships in both directions
    await this.unfollowUser(blockerId, blockedId);
    await this.unfollowUser(blockedId, blockerId);

    if (!blocksStore.has(blockerId)) blocksStore.set(blockerId, new Set());
    blocksStore.get(blockerId)!.add(blockedId);

    persistLocalGraph();
    return true;
  }

  /**
   * Unblock a user
   */
  static async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    if (blocksStore.has(blockerId)) {
      blocksStore.get(blockerId)!.delete(blockedId);
      persistLocalGraph();
    }
    return true;
  }

  /**
   * Check if blocker has blocked target
   */
  static isBlocked(blockerId: string, blockedId: string): boolean {
    return blocksStore.get(blockerId)?.has(blockedId) ?? false;
  }

  /**
   * Check if two users have an active mutual block in either direction
   */
  static hasBlockRelationship(userA: string, userB: string): boolean {
    return this.isBlocked(userA, userB) || this.isBlocked(userB, userA);
  }
}
