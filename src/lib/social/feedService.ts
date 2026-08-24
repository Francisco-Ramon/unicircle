import { Post, FeedItem, FeedCursor, PaginatedFeedResponse, PostVisibility } from "./types";
import { SocialGraphService } from "./socialGraphService";
import { FeedRankingService } from "./rankingService";
import { RealtimeDistributionService } from "./realtimeService";
import { supabase } from "@/integrations/supabase/client";

// In-Memory & Local Feed Cache Store
const postRepository: Map<string, Post> = new Map(); // postId -> Post
const feedTimelineStore: Map<string, FeedItem[]> = new Map(); // userId -> FeedItem[]

// Configurable Fan-Out Threshold
export const NORMAL_FOLLOWER_THRESHOLD = 5000;

const STORAGE_KEY_FEED_ITEMS = "unicircle_user_feed_items";
const STORAGE_KEY_POSTS_REPO = "unicircle_posts_repository";

function hydrateFeedStore() {
  if (typeof window === "undefined") return;
  try {
    const savedPosts = localStorage.getItem(STORAGE_KEY_POSTS_REPO);
    if (savedPosts) {
      const parsed: Post[] = JSON.parse(savedPosts);
      parsed.forEach((p) => postRepository.set(p.id, p));
    }

    const savedFeed = localStorage.getItem(STORAGE_KEY_FEED_ITEMS);
    if (savedFeed) {
      const parsed: FeedItem[] = JSON.parse(savedFeed);
      parsed.forEach((item) => {
        if (!feedTimelineStore.has(item.userId)) feedTimelineStore.set(item.userId, []);
        feedTimelineStore.get(item.userId)!.push(item);
      });
    }
  } catch (e) {}
}

function persistFeedStore() {
  if (typeof window === "undefined") return;
  try {
    const allPosts = Array.from(postRepository.values()).slice(0, 200);
    localStorage.setItem(STORAGE_KEY_POSTS_REPO, JSON.stringify(allPosts));

    const allFeedItems: FeedItem[] = [];
    feedTimelineStore.forEach((items) => {
      allFeedItems.push(...items.slice(0, 100));
    });
    localStorage.setItem(STORAGE_KEY_FEED_ITEMS, JSON.stringify(allFeedItems));
  } catch (e) {}
}

hydrateFeedStore();

export class FeedService {
  /**
   * Save a post to the authoritative repository
   */
  static savePost(post: Post) {
    postRepository.set(post.id, post);
    persistFeedStore();
  }

  /**
   * Get a post by ID
   */
  static getPostById(postId: string): Post | undefined {
    return postRepository.get(postId);
  }

  /**
   * Hybrid Fan-out on Write:
   * 1. If author follower count < NORMAL_FOLLOWER_THRESHOLD:
   *    - Insert FeedItem references into each follower's feed cache.
   *    - Deliver real-time WebSocket event to online followers.
   * 2. If author follower count >= NORMAL_FOLLOWER_THRESHOLD:
   *    - Skip fan-out on write (handled on read).
   */
  static async fanOutPost(post: Post): Promise<{ fanOutCount: number; isCelebrity: boolean }> {
    this.savePost(post);

    const followers = SocialGraphService.getFollowers(post.authorId);
    const followerCount = followers.length;
    const isCelebrity = followerCount >= NORMAL_FOLLOWER_THRESHOLD;

    // Always deliver to the author themselves
    this.addFeedItemToUser(post.authorId, post);

    if (!isCelebrity) {
      // Fan out on write to all followers
      followers.forEach((followerId) => {
        // Enforce privacy: Skip if author blocked follower or follower blocked author
        if (SocialGraphService.hasBlockRelationship(post.authorId, followerId)) {
          return;
        }

        this.addFeedItemToUser(followerId, post);

        // Real-time delivery
        RealtimeDistributionService.deliverPostToUser(followerId, post);
      });
    }

    // Broadcast on campus channel for campus feed
    RealtimeDistributionService.broadcastPost(post);

    return { fanOutCount: isCelebrity ? 0 : followers.length, isCelebrity };
  }

  /**
   * Add a post reference to a user's feed timeline (Idempotent)
   */
  private static addFeedItemToUser(userId: string, post: Post) {
    if (!feedTimelineStore.has(userId)) {
      feedTimelineStore.set(userId, []);
    }
    const timeline = feedTimelineStore.get(userId)!;

    // Idempotency: Prevent duplicate insertion
    if (timeline.some((item) => item.postId === post.id)) {
      return;
    }

    const item: FeedItem = {
      id: `feed_${userId}_${post.id}`,
      userId,
      postId: post.id,
      sourceUserId: post.authorId,
      score: FeedRankingService.calculatePostScore(post, userId),
      createdAt: post.createdAt,
      post,
    };

    timeline.unshift(item);
    persistFeedStore();
  }

  /**
   * Authoritative Feed Query with Cursor-Based Pagination & Privacy Enforcement
   */
  static async getFeed(params: {
    viewerId: string;
    feedType?: "following" | "campus" | "explore";
    campus?: string;
    cursor?: string | null;
    limit?: number;
  }): Promise<PaginatedFeedResponse> {
    const { viewerId, feedType = "following", campus, cursor, limit = 20 } = params;

    let candidatePosts: Post[] = [];

    if (feedType === "following") {
      // 1. Fetch fan-out on write items for viewer
      const userFeedItems = feedTimelineStore.get(viewerId) || [];
      const fanOutPosts: Post[] = userFeedItems
        .map((item) => postRepository.get(item.postId) || item.post)
        .filter((p): p is Post => !!p && !p.isDeleted);

      // 2. Fetch fan-out on read items from followed high-volume accounts
      const followings = SocialGraphService.getFollowing(viewerId);
      const highVolumePosts: Post[] = [];
      followings.forEach((followingId) => {
        if (SocialGraphService.getFollowerCount(followingId) >= NORMAL_FOLLOWER_THRESHOLD) {
          Array.from(postRepository.values()).forEach((p) => {
            if (p.authorId === followingId && !p.isDeleted) {
              highVolumePosts.push(p);
            }
          });
        }
      });

      // Merge and deduplicate
      const seen = new Set<string>();
      [...fanOutPosts, ...highVolumePosts].forEach((p) => {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          candidatePosts.push(p);
        }
      });
    } else {
      // Campus / Explore Feed: All active posts in repository
      candidatePosts = Array.from(postRepository.values()).filter((p) => !p.isDeleted);
      if (campus && feedType === "campus") {
        candidatePosts = candidatePosts.filter((p) => 
          !p.campus || p.campus.toLowerCase() === campus.toLowerCase()
        );
      }
    }

    // 3. Enforce Privacy & Social Graph Authorization Rules
    const authorizedPosts = candidatePosts.filter((post) => {
      // Rule 1: Exclude if viewer has blocked author or author blocked viewer
      if (SocialGraphService.hasBlockRelationship(viewerId, post.authorId)) {
        return false;
      }

      // Rule 2: If post is PRIVATE, only author can view
      if (post.visibility === "PRIVATE" && post.authorId !== viewerId) {
        return false;
      }

      // Rule 3: If post is FOLLOWERS_ONLY, viewer must follow author (or be author)
      if (post.visibility === "FOLLOWERS_ONLY" && post.authorId !== viewerId) {
        if (!SocialGraphService.isFollowing(viewerId, post.authorId)) {
          return false;
        }
      }

      return true;
    });

    // 4. Rank Posts using Deterministic Compound Scoring
    const rankedPosts = FeedRankingService.rankPosts(authorizedPosts, viewerId, campus);

    // 5. Cursor-Based Pagination (createdAt + id)
    let startIndex = 0;
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, "base64").toString("utf8");
        const [cursorTime, cursorId] = decoded.split(":");
        const foundIdx = rankedPosts.findIndex((p) => p.id === cursorId);
        if (foundIdx !== -1) {
          startIndex = foundIdx + 1;
        }
      } catch (e) {
        startIndex = 0;
      }
    }

    const pagedItems = rankedPosts.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < rankedPosts.length;

    let nextCursor: string | null = null;
    if (hasMore && pagedItems.length > 0) {
      const lastItem = pagedItems[pagedItems.length - 1];
      nextCursor = Buffer.from(`${lastItem.createdAt}:${lastItem.id}`).toString("base64");
    }

    return {
      items: pagedItems,
      nextCursor,
      hasMore,
      total: authorizedPosts.length,
    };
  }
}
