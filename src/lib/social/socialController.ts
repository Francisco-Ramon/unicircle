import { Post, UserProfile, PostVisibility, SocialEvent } from "./types";
import { SocialGraphService } from "./socialGraphService";
import { EventBus } from "./eventBus";
import { FeedService } from "./feedService";
import { SocialNotificationService } from "./notificationService";
import { supabase } from "@/integrations/supabase/client";

// Wire Event Handlers into EventBus
EventBus.subscribe("POST_CREATED", async (event: SocialEvent<Post>) => {
  const post = event.payload;
  await FeedService.fanOutPost(post);
});

EventBus.subscribe("USER_FOLLOWED", async (event: SocialEvent<{ follower: UserProfile; followingId: string }>) => {
  const { follower, followingId } = event.payload;
  await SocialNotificationService.createNotification({
    userId: followingId,
    actor: follower,
    type: "follow",
    message: "started following your campus profile.",
  });
});

EventBus.subscribe("POST_LIKED", async (event: SocialEvent<{ liker: UserProfile; post: Post }>) => {
  const { liker, post } = event.payload;
  if (post.authorId !== liker.id) {
    await SocialNotificationService.createNotification({
      userId: post.authorId,
      actor: liker,
      type: "like",
      entityId: post.id,
      message: "liked your post.",
    });
  }
});

export class SocialController {
  /**
   * Authoritative Post Creation Pipeline:
   * Validate -> Store Post in DB -> Publish POST_CREATED Event -> Hybrid Fan-out -> Return
   */
  static async createPost(params: {
    author: UserProfile;
    content: string;
    campus: string;
    imageUrl?: string | null;
    visibility?: PostVisibility;
  }): Promise<Post> {
    // 1. Validation
    if (!params.content || !params.content.trim()) {
      throw new Error("Post content cannot be empty.");
    }

    const postId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const post: Post = {
      id: postId,
      authorId: params.author.id,
      content: params.content.trim(),
      campus: params.campus,
      imageUrl: params.imageUrl || null,
      visibility: params.visibility || "PUBLIC",
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      author: params.author,
    };

    // 2. Persist to PostgreSQL (Supabase) in background
    supabase.from("posts" as any).insert({
      id: post.id,
      author_id: post.authorId,
      campus: post.campus,
      content: post.content,
      image_url: post.imageUrl,
      likes_count: 0,
      comments_count: 0,
      created_at: post.createdAt,
    }).then(() => {}).catch(() => {});

    // 3. Publish POST_CREATED Event through EventBus
    await EventBus.publish<Post>({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "POST_CREATED",
      actorId: params.author.id,
      timestamp: new Date().toISOString(),
      idempotencyKey: `post_create_${post.id}`,
      payload: post,
    });

    return post;
  }

  /**
   * Follow User Flow
   */
  static async followUser(follower: UserProfile, followingId: string): Promise<boolean> {
    const success = await SocialGraphService.followUser(follower.id, followingId);
    if (success) {
      await EventBus.publish({
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "USER_FOLLOWED",
        actorId: follower.id,
        timestamp: new Date().toISOString(),
        idempotencyKey: `follow_${follower.id}_${followingId}`,
        payload: { follower, followingId },
      });
    }
    return success;
  }

  /**
   * Block User Flow
   */
  static async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const success = await SocialGraphService.blockUser(blockerId, blockedId);
    if (success) {
      await EventBus.publish({
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "USER_BLOCKED",
        actorId: blockerId,
        timestamp: new Date().toISOString(),
        idempotencyKey: `block_${blockerId}_${blockedId}`,
        payload: { blockerId, blockedId },
      });
    }
    return success;
  }

  /**
   * Fetch User Feed
   */
  static async getFeed(params: {
    viewerId: string;
    feedType?: "following" | "campus" | "explore";
    campus?: string;
    cursor?: string | null;
    limit?: number;
  }) {
    return FeedService.getFeed(params);
  }
}
