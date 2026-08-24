import { Post } from "./types";
import { SocialGraphService } from "./socialGraphService";

export class FeedRankingService {
  /**
   * Deterministic Compound Score:
   * score = recencyScore + engagementScore + relationshipScore + campusAffinityScore
   */
  static calculatePostScore(post: Post, viewerId?: string, viewerCampus?: string): number {
    const now = Date.now();
    const postTime = new Date(post.createdAt).getTime();
    const ageHours = Math.max(0, (now - postTime) / (1000 * 60 * 60));

    // 1. Recency Score (Exponential decay with 24h half-life)
    const recencyScore = Math.max(0, 1000 * Math.exp(-ageHours / 24));

    // 2. Engagement Score (Weighted likes & comments)
    const engagementScore = (post.likesCount * 15) + (post.commentsCount * 30) + (post.sharesCount * 45);

    // 3. Relationship Score (Bonus if viewer follows author or author is in viewer network)
    let relationshipScore = 0;
    if (viewerId) {
      if (viewerId === post.authorId) {
        relationshipScore = 100;
      } else if (SocialGraphService.isFollowing(viewerId, post.authorId)) {
        relationshipScore = 300; // Strong priority for followed accounts
      }
    }

    // 4. Campus Affinity Score (Bonus if from the same university)
    let campusScore = 0;
    if (viewerCampus && post.campus && viewerCampus.toLowerCase() === post.campus.toLowerCase()) {
      campusScore = 150;
    }

    return Math.round(recencyScore + engagementScore + relationshipScore + campusScore);
  }

  /**
   * Sort posts deterministically using compound score and stable timestamp tiebreaker
   */
  static rankPosts(posts: Post[], viewerId?: string, viewerCampus?: string): Post[] {
    return [...posts].sort((a, b) => {
      const scoreA = this.calculatePostScore(a, viewerId, viewerCampus);
      const scoreB = this.calculatePostScore(b, viewerId, viewerCampus);

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      // Tiebreaker: Strict creation timestamp
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
}
