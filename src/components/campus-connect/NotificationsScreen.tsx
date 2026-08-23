import React, { useState, useEffect } from "react";
import {
  Bell, UserPlus, Heart, MessageSquare, Calendar, BookOpen, Users, Check, X,
  RefreshCw, AlertTriangle, Sparkles, Filter
} from "lucide-react";
import {
  AppNotification as Notification,
  getStoredNotifications,
  saveStoredNotifications,
} from "@/lib/notificationService";

interface Props {
  userProfile?: any;
  onNavigate?: (state: any) => void;
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "friend_request": return <UserPlus className="w-4 h-4 text-indigo-400" />;
    case "connection_accepted":
    case "direct_message": return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    case "relationship_interest": return <Heart className="w-4 h-4 text-pink-400" />;
    case "study_invite": return <BookOpen className="w-4 h-4 text-blue-400" />;
    case "community_post": return <Users className="w-4 h-4 text-purple-400" />;
    case "event_reminder": return <Calendar className="w-4 h-4 text-amber-400" />;
    default: return <Bell className="w-4 h-4 text-indigo-400" />;
  }
}

export const NotificationsScreen: React.FC<Props> = ({ userProfile, onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "requests">("all");

  const loadNotifications = () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = getStoredNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError("Unable to load notifications. Please try refreshing.");
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      try {
        const data = getStoredNotifications();
        setNotifications(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn("Failed updating notification state", e);
      }
    };

    window.addEventListener("unicircle-notifications-updated", handleUpdate);
    return () => window.removeEventListener("unicircle-notifications-updated", handleUpdate);
  }, []);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((n) => n && !n.read).length;

  const filteredNotifications = safeNotifications.filter((n) => {
    if (!n) return false;
    if (filter === "unread") return !n.read;
    if (filter === "requests") return n.type === "friend_request" || n.type === "study_invite" || n.type === "relationship_interest";
    return true;
  });

  const markAllRead = () => {
    const updated = safeNotifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleAccept = (id: string) => {
    const updated = safeNotifications.map((n) =>
      n.id === id
        ? {
            ...n,
            read: true,
            message: (n.message || "")
              .replace("sent you a friend request", "is now your friend!")
              .replace("invited you to study together", "is now your study partner!")
              .replace("expressed relationship interest in you", "— you've matched!"),
          }
        : n
    );
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleDecline = (id: string) => {
    const updated = safeNotifications.filter((n) => n && n.id !== id);
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-400" />
            Alerts & Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : "Stay updated on connections and campus events"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition"
            >
              Mark all as read
            </button>
          )}

          <button
            onClick={loadNotifications}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-white/10 hover:bg-white/5 transition"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Alerts", count: safeNotifications.length },
          { id: "unread", label: "Unread", count: unreadCount },
          { id: "requests", label: "Requests & Invites", count: safeNotifications.filter((n) => n?.type === "friend_request" || n?.type === "study_invite" || n?.type === "relationship_interest").length },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filter === item.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/5"
            }`}
          >
            {item.label}
            {item.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === item.id ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error state fallback */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{error}</p>
          </div>
          <button onClick={loadNotifications} className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 font-bold transition text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800/60 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Notification List */
        <div className="space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-white/5 p-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">No new alerts</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filter === "unread"
                  ? "You have read all your notifications!"
                  : "When other verified students connect, send requests, or interact with your posts, you'll see alerts here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isActionable = notif.type === "friend_request" || notif.type === "study_invite" || notif.type === "relationship_interest";
              const isUnacted = !notif.read && isActionable;

              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl transition ${
                    notif.read
                      ? "bg-slate-900/40"
                      : "bg-slate-900/90 border border-indigo-500/30 shadow-lg shadow-indigo-950/20"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={notif.fromAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                      alt={notif.fromName || "User"}
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-slate-950 flex items-center justify-center border border-white/10">
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-snug">
                      <span className="font-bold text-white">{notif.fromName}</span>{" "}
                      {notif.message}
                    </p>
                    {notif.fromUniversity && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{notif.fromUniversity}</p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-0.5">{notif.timeAgo || "Recently"}</p>

                    {/* Action buttons for requests */}
                    {isUnacted && (
                      <div className="flex items-center gap-2 mt-2.5">
                        <button
                          onClick={() => handleAccept(notif.id)}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(notif.id)}
                          className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold transition"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5 shadow-sm shadow-indigo-500" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
