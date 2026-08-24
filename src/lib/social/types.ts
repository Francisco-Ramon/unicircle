export type PostVisibility = "PUBLIC" | "FOLLOWERS_ONLY" | "CAMPUS_ONLY" | "PRIVATE";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  campus: string;
  course: string;
  yearOfStudy: string;
  bio: string;
  photos: string[];
  interests: string[];
  gender: string;
  verified: boolean;
  isOnline: boolean;
  lastSeen?: string;
  followerCount?: number;
  followingCount?: number;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  campus: string;
  imageUrl?: string | null;
  visibility: PostVisibility;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  author?: UserProfile;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Block {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface FeedItem {
  id: string;
  userId: string;
  postId: string;
  sourceUserId: string;
  score: number;
  readAt?: string | null;
  createdAt: string;
  post?: Post;
}

export interface FeedCursor {
  createdAt: string;
  id: string;
  score?: number;
}

export interface PaginatedFeedResponse {
  items: Post[];
  nextCursor?: string | null;
  hasMore: boolean;
  total?: number;
}

export type SocialEventType =
  | "POST_CREATED"
  | "POST_UPDATED"
  | "POST_DELETED"
  | "USER_FOLLOWED"
  | "USER_UNFOLLOWED"
  | "USER_BLOCKED"
  | "USER_UNBLOCKED"
  | "POST_LIKED"
  | "POST_UNLIKED"
  | "COMMENT_CREATED"
  | "COMMENT_DELETED";

export interface SocialEvent<T = any> {
  id: string;
  type: SocialEventType;
  actorId: string;
  timestamp: string;
  idempotencyKey: string;
  payload: T;
}

export interface SocialNotification {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  type: "follow" | "like" | "comment" | "mention" | "post";
  entityId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}
