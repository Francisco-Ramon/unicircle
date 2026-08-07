import React from "react";
import { Bell, UserPlus, Heart, MessageSquare, Calendar, BookOpen, Users, Check, X } from "lucide-react";
import { TWENTY_STUDENT_PROFILES } from "./StudentProfilesDataset";

interface Notification {
  id: string;
  type: "friend_request" | "connection_accepted" | "community_post" | "event_reminder" | "study_invite" | "relationship_interest";
  fromName: string;
  fromAvatar: string;
  fromUniversity: string;
  message: string;
  timeAgo: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "friend_request",
    fromName: "Amani Wanjiru",
    fromAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "University of Nairobi",
    message: "sent you a friend request",
    timeAgo: "2 min ago",
    read: false,
  },
  {
    id: "n2",
    type: "connection_accepted",
    fromName: "Brian Omondi",
    fromAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "University of Nairobi",
    message: "accepted your friend request. You can now chat!",
    timeAgo: "15 min ago",
    read: false,
  },
  {
    id: "n3",
    type: "relationship_interest",
    fromName: "Stacy Muthoni",
    fromAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "JKUAT",
    message: "expressed relationship interest in you",
    timeAgo: "1 hour ago",
    read: false,
  },
  {
    id: "n4",
    type: "study_invite",
    fromName: "Kevin Wafula",
    fromAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "MMUST",
    message: "invited you to study together",
    timeAgo: "3 hours ago",
    read: true,
  },
  {
    id: "n5",
    type: "community_post",
    fromName: "UoN Tech Society",
    fromAvatar: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "University of Nairobi",
    message: "posted: 'Nairobi Student Tech Summit registration is now open!'",
    timeAgo: "5 hours ago",
    read: true,
  },
  {
    id: "n6",
    type: "event_reminder",
    fromName: "Campus Events",
    fromAvatar: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&auto=format&fit=crop&q=80",
    fromUniversity: "",
    message: "Reminder: Nairobi Student Tech Summit starts in 2 days",
    timeAgo: "6 hours ago",
    read: true,
  },
];

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "friend_request": return <UserPlus className="w-4 h-4 text-indigo-400" />;
    case "connection_accepted": return <Check className="w-4 h-4 text-emerald-400" />;
    case "relationship_interest": return <Heart className="w-4 h-4 text-pink-400" />;
    case "study_invite": return <BookOpen className="w-4 h-4 text-blue-400" />;
    case "community_post": return <Users className="w-4 h-4 text-purple-400" />;
    case "event_reminder": return <Calendar className="w-4 h-4 text-amber-400" />;
  }
}

export const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = React.useState(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleAccept = (id: string) => {
    setNotifications(notifications.map((n) =>
      n.id === id ? { ...n, read: true, message: n.message.replace("sent you a friend request", "is now your friend!").replace("invited you to study together", "is now your study partner!").replace("expressed relationship interest in you", "— you've matched!") } : n
    ));
  };

  const handleDecline = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-400" />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-xs text-slate-400 mt-1">{unreadCount} unread</p>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-400 hover:bg-indigo-600/10 transition"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-400">No notifications yet</h3>
            <p className="text-xs text-slate-500 mt-1">When students connect with you, you'll see it here.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isActionable = notif.type === "friend_request" || notif.type === "study_invite" || notif.type === "relationship_interest";
            const isUnacted = !notif.read && isActionable;

            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3.5 p-4 rounded-2xl transition ${
                  notif.read
                    ? "bg-slate-900/40"
                    : "bg-slate-900/90 border border-white/10"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={notif.fromAvatar}
                    alt={notif.fromName}
                    className="w-11 h-11 rounded-xl object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-slate-950 flex items-center justify-center">
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
                  <p className="text-[11px] text-slate-500 mt-0.5">{notif.timeAgo}</p>

                  {/* Action buttons for requests */}
                  {isUnacted && (
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        onClick={() => handleAccept(notif.id)}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
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

                {/* Unread dot */}
                {!notif.read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
