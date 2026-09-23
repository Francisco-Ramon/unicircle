import React, { useState, useEffect, useMemo } from "react";
import {
  X, ShieldCheck, Heart, UserPlus, MessageSquare, Check,
  Sparkles, MapPin, GraduationCap, Building2, Calendar,
  Share2, ThumbsUp, Flame, Lock
} from "lucide-react";
import { SocialGraphService } from "@/lib/social/socialGraphService";
import { dispatchAppNotification } from "@/lib/notificationService";
import { getLocalUserId } from "@/lib/supabaseLiveService";
import { AppNavState } from "@/lib/navigationHistory";

export interface AuthorProfileData {
  id: string;
  name: string;
  avatar: string;
  campus?: string;
  course?: string;
  yearOfStudy?: string;
  bio?: string;
  verified?: boolean;
  online?: boolean;
  compatibilityScore?: number;
  interests?: string[];
  photos?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: AuthorProfileData | null;
  userProfile: any;
  allPosts?: any[];
  onNavigate?: (state: AppNavState) => void;
  onRequestFriendship?: (student: AuthorProfileData) => void;
  onStartChat?: (student: AuthorProfileData) => void;
}

export const StudentProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  student,
  userProfile,
  allPosts = [],
  onNavigate,
  onRequestFriendship,
  onStartChat,
}) => {
  const currentUserId = userProfile?.id || getLocalUserId();
  const [isFriendRequested, setIsFriendRequested] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (student) {
      const following = SocialGraphService.isFollowing(currentUserId, student.id);
      setIsFollowing(following);

      // Check if friend request previously sent
      try {
        const savedRequests = localStorage.getItem("unicircle_friend_requests");
        if (savedRequests) {
          const reqSet = new Set(JSON.parse(savedRequests));
          setIsFriendRequested(reqSet.has(student.id));
        }
      } catch (e) {}
    }
  }, [student, currentUserId]);

  if (!isOpen || !student) return null;

  const isOwnProfile = Boolean(
    student.id === currentUserId ||
    (userProfile?.firstName && student.name?.toLowerCase().includes(userProfile.firstName.toLowerCase()))
  );

  // Filter posts authored by this student
  const studentPosts = allPosts.filter((p) => {
    if (p.authorId && p.authorId === student.id) return true;
    if (p.authorName && student.name && p.authorName.toLowerCase() === student.name.toLowerCase()) return true;
    return false;
  });

  // Handle Friend Request (Just like Discover swipe like)
  const handleRequestFriendship = () => {
    if (isFriendRequested) return;

    setIsFriendRequested(true);
    try {
      const savedRequests = localStorage.getItem("unicircle_friend_requests");
      const reqList: string[] = savedRequests ? JSON.parse(savedRequests) : [];
      if (!reqList.includes(student.id)) {
        reqList.push(student.id);
        localStorage.setItem("unicircle_friend_requests", JSON.stringify(reqList));
      }
    } catch (e) {}

    // Dispatch app notification
    dispatchAppNotification({
      type: "friend_request",
      fromName: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim() : "Verified Student",
      fromAvatar: userProfile?.photos?.[0] || "",
      fromUniversity: userProfile?.campus || "University of Nairobi",
      message: `sent you a friendship request.`,
      entityId: student.id,
    });

    if (onRequestFriendship) {
      onRequestFriendship(student);
    }
  };

  // Handle Follow Toggle
  const handleToggleFollow = () => {
    if (isFollowing) {
      SocialGraphService.unfollowUser(currentUserId, student.id);
      setIsFollowing(false);
    } else {
      SocialGraphService.followUser(currentUserId, student.id);
      setIsFollowing(true);
    }
  };

  // Handle Direct Message
  const handleMessageClick = () => {
    onClose();
    if (onStartChat) {
      onStartChat(student);
    } else if (onNavigate) {
      onNavigate({ tab: "chat", matchId: student.id, chatView: "chat" });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0D121F] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover & Profile Header */}
        <div className="relative bg-gradient-to-r from-purple-900/50 via-indigo-900/50 to-slate-900 p-6 pb-4 border-b border-white/5 shrink-0">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/70 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Avatar with online dot and verified ring */}
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-xl shrink-0">
              <img
                src={student.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"}
                alt={student.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0D121F]" />
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white truncate">
                  {student.name}
                </h3>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" /> Verified Student
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mt-1 text-xs text-slate-300">
                <span className="flex items-center gap-1 text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  {student.campus || "University of Nairobi"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                  {student.course || "Computer Science"} ({student.yearOfStudy || "3rd Year"})
                </span>
              </div>

              {/* Bio snippet */}
              <p className="text-xs text-slate-300 mt-2 leading-relaxed italic line-clamp-2">
                "{student.bio || "Student on UniCircle connecting across university campuses."}"
              </p>
            </div>
          </div>

          {/* Action Buttons Row */}
          {!isOwnProfile && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 flex-wrap">
              {/* Request Friendship Button */}
              <button
                type="button"
                onClick={handleRequestFriendship}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                  isFriendRequested
                    ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-300"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 active:scale-95"
                }`}
              >
                {isFriendRequested ? (
                  <>
                    <Check className="w-4 h-4" /> Request Sent
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Request Friendship
                  </>
                )}
              </button>

              {/* Direct Message Button */}
              <button
                type="button"
                onClick={handleMessageClick}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-indigo-400" /> Message
              </button>

              {/* Follow Button */}
              <button
                type="button"
                onClick={handleToggleFollow}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isFollowing
                    ? "bg-transparent border-white/20 text-slate-300 hover:border-red-500/40 hover:text-red-300"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-200"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Body: Interests & Posts Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Interests Tags */}
          {student.interests && student.interests.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Interests & Activities
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {student.interests.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[11px] font-semibold text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Posts by Student Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Posts by {student.name.split(" ")[0]}
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-bold">
                {studentPosts.length} {studentPosts.length === 1 ? "Post" : "Posts"}
              </span>
            </div>

            {studentPosts.length > 0 ? (
              studentPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2.5 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {post.timeAgo || "Recently"}
                    </span>
                    {post.campus && (
                      <span className="text-[10px] text-indigo-400 font-semibold">
                        {post.campus}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {post.image && (
                    <div className="rounded-xl overflow-hidden max-h-48 border border-white/10">
                      <img src={post.image} alt="Post attachment" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-white/[0.04]">
                    <span className="flex items-center gap-1 text-pink-400">
                      <Heart className="w-3.5 h-3.5 fill-pink-500/20" /> {post.likes || 0} Likes
                    </span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> {post.commentsCount || post.comments || 0} Comments
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-300">No public posts yet</p>
                <p className="text-[11px] text-slate-500">
                  When {student.name.split(" ")[0]} shares campus updates, they will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
