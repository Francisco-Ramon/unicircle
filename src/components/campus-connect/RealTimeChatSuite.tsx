import { safeSetItem } from "@/lib/safeStorage";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Send, Mic, Image, Smile, ShieldCheck, CheckCheck, Trash2,
  MoreVertical, Search, Lock, Phone, Video, Play, Pause, Paperclip,
  ArrowLeft, MessageSquare, Menu, Plus, Users, BellOff, Star,
  Sparkles, Check, X, Camera, Heart, UserPlus, Hash, CheckSquare, Square
} from "lucide-react";
import { StudentProfile } from "./DiscoverDeck";
import {
  dispatchAppNotification,
  fetchNotificationPreferences,
} from "@/lib/notificationService";
import {
  sendLiveChatMessage,
  fetchConversationMessages,
  subscribeToLiveMessages,
  uploadToStorage,
  getOrCreateConversation,
} from "@/lib/supabaseLiveService";
import { supabase } from "@/integrations/supabase/client";
import { AppNavState } from "@/lib/navigationHistory";

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  type: "text" | "voice" | "image";
  mediaUrl?: string;
  durationSec?: number;
}

export interface ConversationItem {
  id: string;
  name: string;
  isGroup: boolean;
  avatar?: string;
  online?: boolean;
  isMuted?: boolean;
  isFavorite?: boolean;
  unreadCount?: number;
  lastMessage: string;
  lastMessageSender?: string;
  timestamp: string;
  studentProfile?: StudentProfile;
  memberIds?: string[];
}

export interface StoryItem {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  hasUnseenStory: boolean;
  storyImage?: string;
  storyText?: string;
}

interface Props {
  activeMatch: StudentProfile | null;
  matches: StudentProfile[];
  onSelectMatch: (match: StudentProfile) => void;
  navState?: AppNavState;
  onNavigate?: (state: AppNavState) => void;
  onNavigateToDiscover?: () => void;
  currentUser?: any;
}

// Built-in default chat conversations perfectly matching the user's screenshot layout
const DEFAULT_CONVERSATIONS: ConversationItem[] = [
  {
    id: "conv-emma-smith",
    name: "Emma Smith",
    isGroup: false,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
    online: true,
    isFavorite: true,
    unreadCount: 2,
    lastMessage: "Hey! Are we still on for tonight?",
    timestamp: "09:41 AM",
    studentProfile: {
      id: "conv-emma-smith",
      name: "Emma Smith",
      age: 21,
      gender: "Female",
      campus: "University of Nairobi",
      course: "Design & Fine Art",
      yearOfStudy: "3rd Year",
      distanceKm: 0.8,
      compatibilityScore: 96,
      verified: true,
      online: true,
      intentMode: "Friendship",
      photos: [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80"
      ],
      bio: "UI/UX enthusiast, coffee lover, and graphic illustrator. Let's create cool stuff!",
      interests: ["UI/UX", "Art", "Coffee", "Photography"],
      prompts: [{ question: "A typical Sunday looks like", answer: "Sketching at an outdoor cafe with matcha latte" }],
      height: "168 cm",
      lifestyle: { smoking: "Non-smoker", drinking: "Social drinker" }
    }
  },
  {
    id: "conv-james-anderson",
    name: "James Anderson",
    isGroup: false,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
    online: true,
    isFavorite: true,
    unreadCount: 1,
    lastMessage: "That was so much fun! 😄",
    timestamp: "09:30 AM",
    studentProfile: {
      id: "conv-james-anderson",
      name: "James Anderson",
      age: 22,
      gender: "Male",
      campus: "Kenyatta University",
      course: "Software Engineering",
      yearOfStudy: "4th Year",
      distanceKm: 2.1,
      compatibilityScore: 94,
      verified: true,
      online: true,
      intentMode: "Networking",
      photos: [
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80"
      ],
      bio: "Full-stack developer & hackathon organizer. Always down for tech talks and hack sprints.",
      interests: ["React", "AI", "Hackathons", "Cycling"],
      prompts: [{ question: "My favorite tech stack", answer: "TypeScript, Next.js, and Supabase" }],
      height: "182 cm",
      lifestyle: { smoking: "Non-smoker", drinking: "Social drinker" }
    }
  },
  {
    id: "group-design-squad",
    name: "Design Squad",
    isGroup: true,
    avatar: "",
    isMuted: true,
    isFavorite: true,
    unreadCount: 5,
    lastMessage: "Here is the latest update",
    lastMessageSender: "Olivia",
    timestamp: "08:15 AM",
  },
  {
    id: "conv-olivia-brown",
    name: "Olivia Brown",
    isGroup: false,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    online: false,
    isFavorite: false,
    unreadCount: 1,
    lastMessage: "Can you send me the file?",
    timestamp: "Yesterday",
    studentProfile: {
      id: "conv-olivia-brown",
      name: "Olivia Brown",
      age: 20,
      gender: "Female",
      campus: "Strathmore University",
      course: "Business Information Tech",
      yearOfStudy: "2nd Year",
      distanceKm: 3.4,
      compatibilityScore: 91,
      verified: true,
      online: false,
      intentMode: "Study Partner",
      photos: [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"
      ],
      bio: "FinTech researcher & product designer. Looking for group study buddies.",
      interests: ["FinTech", "Product Design", "Economics", "Podcasts"],
      prompts: [{ question: "Currently reading", answer: "The Lean Startup by Eric Ries" }],
      height: "170 cm",
      lifestyle: { smoking: "Non-smoker", drinking: "Non-drinker" }
    }
  },
  {
    id: "conv-daniel-lewis",
    name: "Daniel Lewis",
    isGroup: false,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    online: false,
    isFavorite: false,
    unreadCount: 0,
    lastMessage: "Thanks! See you tomorrow.",
    timestamp: "Yesterday",
    studentProfile: {
      id: "conv-daniel-lewis",
      name: "Daniel Lewis",
      age: 23,
      gender: "Male",
      campus: "JKUAT",
      course: "Mechanical Engineering",
      yearOfStudy: "4th Year",
      distanceKm: 5.2,
      compatibilityScore: 89,
      verified: true,
      online: false,
      intentMode: "Friendship",
      photos: [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80"
      ],
      bio: "Robotics builder and drone racer. Passionate about 3D printing and CAD.",
      interests: ["Robotics", "CAD", "Drones", "Rock Climbing"],
      prompts: [{ question: "Best weekend project", answer: "Building custom autonomous quadcopters" }],
      height: "179 cm",
      lifestyle: { smoking: "Non-smoker", drinking: "Social drinker" }
    }
  },
  {
    id: "group-family-group",
    name: "Family Group",
    isGroup: true,
    avatar: "",
    isMuted: false,
    isFavorite: false,
    unreadCount: 3,
    lastMessage: "Don't forget dinner 😊",
    lastMessageSender: "Mom",
    timestamp: "Mon",
  },
  {
    id: "group-campus-tech-circle",
    name: "Campus Tech Circle",
    isGroup: true,
    avatar: "",
    isMuted: false,
    isFavorite: false,
    unreadCount: 0,
    lastMessage: "Hackathon registrations close this Friday at midnight!",
    lastMessageSender: "Admin",
    timestamp: "Sun",
  }
];

const DEFAULT_INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  "conv-emma-smith": [
    { id: "m-e-1", senderId: "conv-emma-smith", text: "Hey! How was your presentation today?", timestamp: "09:38 AM", isRead: true, type: "text" },
    { id: "m-e-2", senderId: "me", text: "It went super well! The lecturers loved the prototype.", timestamp: "09:40 AM", isRead: true, type: "text" },
    { id: "m-e-3", senderId: "conv-emma-smith", text: "Hey! Are we still on for tonight?", timestamp: "09:41 AM", isRead: false, type: "text" }
  ],
  "conv-james-anderson": [
    { id: "m-j-1", senderId: "me", text: "Loved the hackathon pitch you gave yesterday!", timestamp: "09:25 AM", isRead: true, type: "text" },
    { id: "m-j-2", senderId: "conv-james-anderson", text: "That was so much fun! 😄", timestamp: "09:30 AM", isRead: false, type: "text" }
  ],
  "group-design-squad": [
    { id: "m-d-1", senderId: "Kevin", text: "Did everyone check the new Figma components?", timestamp: "08:10 AM", isRead: true, type: "text" },
    { id: "m-d-2", senderId: "Olivia", text: "Here is the latest update", timestamp: "08:15 AM", isRead: false, type: "text" }
  ],
  "conv-olivia-brown": [
    { id: "m-o-1", senderId: "conv-olivia-brown", text: "Can you send me the file?", timestamp: "Yesterday", isRead: false, type: "text" }
  ],
  "conv-daniel-lewis": [
    { id: "m-dl-1", senderId: "me", text: "I'll bring the Arduino sensor kits to the lab.", timestamp: "Yesterday", isRead: true, type: "text" },
    { id: "m-dl-2", senderId: "conv-daniel-lewis", text: "Thanks! See you tomorrow.", timestamp: "Yesterday", isRead: true, type: "text" }
  ],
  "group-family-group": [
    { id: "m-f-1", senderId: "Mom", text: "Don't forget dinner 😊", timestamp: "Mon", isRead: false, type: "text" }
  ]
};

const DEFAULT_STORIES: StoryItem[] = [
  {
    id: "story-emma",
    userId: "conv-emma-smith",
    name: "Emma",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    hasUnseenStory: true,
    storyText: "Working on new UI illustrations in the campus library 🎨☕"
  },
  {
    id: "story-james",
    userId: "conv-james-anderson",
    name: "James",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    hasUnseenStory: true,
    storyText: "Hackathon kickoff in 2 hours! Let's win this 🚀💻"
  },
  {
    id: "story-olivia",
    userId: "conv-olivia-brown",
    name: "Olivia",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    hasUnseenStory: true,
    storyText: "Sunrise on campus grounds ✨🌿"
  },
  {
    id: "story-daniel",
    userId: "conv-daniel-lewis",
    name: "Daniel",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    hasUnseenStory: true,
    storyText: "Drone testing session at the main field 🛸💨"
  }
];

type FilterTab = "all" | "groups" | "unread" | "favorites";

const RealTimeChatSuiteContent: React.FC<Props> = ({
  activeMatch,
  matches,
  onSelectMatch,
  navState,
  onNavigate,
  onNavigateToDiscover,
  currentUser,
}) => {
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter Pill State
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Custom User Groups (Persisted across sessions)
  const [customGroups, setCustomGroups] = useState<ConversationItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("unicircle_chat_custom_groups");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // Group Creation Modal State
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTopic, setNewGroupTopic] = useState("");
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState<Set<string>>(new Set());
  const [friendSearchQuery, setFriendSearchQuery] = useState("");

  // Selected Active Conversation
  const [selectedConvId, setSelectedConvId] = useState<string | null>(() => {
    if (navState?.tab === "chat" && navState.matchId) {
      return navState.matchId;
    }
    return null;
  });

  // Stories modal / Creator State
  const [activeStoryModal, setActiveStoryModal] = useState<StoryItem | null>(null);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [newStoryText, setNewStoryText] = useState("");
  const [userStory, setUserStory] = useState<{ text: string; time: string } | null>(null);

  // Message Map State (Cached & Syncable)
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("unicircle_chat_messages_v2");
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.warn("Failed to load chat messages from localStorage:", err);
      }
    }
    return DEFAULT_INITIAL_MESSAGES;
  });

  const updateMessagesMap = (updater: (prev: Record<string, ChatMessage[]>) => Record<string, ChatMessage[]>) => {
    setMessagesMap((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        try {
          safeSetItem("unicircle_chat_messages_v2", JSON.stringify(next));
        } catch (e) {
          console.warn("Failed to save chat messages to localStorage:", e);
        }
      }
      return next;
    });
  };

  // Chat inputs & states
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Available Friends Pool (For group additions)
  const availableFriends = useMemo(() => {
    const list: { id: string; name: string; avatar: string; campus?: string; course?: string; online?: boolean }[] = [];
    const seen = new Set<string>();

    // 1. Add Default Contacts
    DEFAULT_CONVERSATIONS.filter((c) => !c.isGroup).forEach((c) => {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        list.push({
          id: c.id,
          name: c.name,
          avatar: c.avatar || "",
          campus: c.studentProfile?.campus || "University of Nairobi",
          course: c.studentProfile?.course || "Student",
          online: c.online ?? true,
        });
      }
    });

    // 2. Add Live Matches
    matches.forEach((m) => {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        list.push({
          id: m.id,
          name: m.name,
          avatar: m.photos[0] || "",
          campus: m.campus || "University of Nairobi",
          course: m.course || "Student",
          online: m.online ?? true,
        });
      }
    });

    return list;
  }, [matches]);

  // Merge Custom Groups + Default Conversations + Live Matches
  const allConversations: ConversationItem[] = useMemo(() => {
    const list: ConversationItem[] = [...customGroups, ...DEFAULT_CONVERSATIONS];
    const existingIds = new Set(list.map((c) => c.id));

    // Append dynamic matches from Discover / Swiping
    matches.forEach((m) => {
      if (!existingIds.has(m.id)) {
        list.push({
          id: m.id,
          name: m.name,
          isGroup: false,
          avatar: m.photos[0] || "",
          online: m.online ?? true,
          isFavorite: false,
          unreadCount: 0,
          lastMessage: `Matched! Say hi to ${m.name}`,
          timestamp: "Just now",
          studentProfile: m,
        });
      }
    });

    return list;
  }, [customGroups, matches]);

  // Active Conversation Object
  const currentConversation = useMemo(() => {
    const targetId = (navState?.tab === "chat" && navState.matchId) ? navState.matchId : selectedConvId;
    if (!targetId) return null;
    return allConversations.find((c) => c.id === targetId) || null;
  }, [selectedConvId, navState?.matchId, allConversations]);

  // Handle Redirect to Discover Tab
  const handleRedirectToDiscover = () => {
    if (onNavigateToDiscover) {
      onNavigateToDiscover();
    } else if (onNavigate) {
      onNavigate({ tab: "discover" });
    }
  };

  // Select a conversation item
  const handleSelectConversation = (conv: ConversationItem) => {
    setSelectedConvId(conv.id);
    if (conv.studentProfile) {
      onSelectMatch(conv.studentProfile);
    }
    if (onNavigate) {
      onNavigate({ tab: "chat", matchId: conv.id, chatView: "chat" });
    }
    // Mark as read in local view
    if (conv.unreadCount && conv.unreadCount > 0) {
      conv.unreadCount = 0;
    }
  };

  // Back to list on mobile
  const handleBackToList = () => {
    setSelectedConvId(null);
    if (onNavigate) {
      onNavigate({ tab: "chat", chatView: "list" });
    }
  };

  // Create Group Handler
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    const groupId = `group-${Date.now()}`;
    const selectedIds = Array.from(selectedFriendsForGroup);
    const memberNames = selectedIds.map((id) => {
      const f = availableFriends.find((x) => x.id === id);
      return f ? f.name : "Student";
    });

    const newGroup: ConversationItem = {
      id: groupId,
      name: newGroupName.trim(),
      isGroup: true,
      avatar: "",
      unreadCount: 0,
      lastMessage: newGroupTopic ? `Topic: ${newGroupTopic}` : "Group created by you",
      lastMessageSender: "You",
      timestamp: "Just now",
      memberIds: selectedIds,
    };

    const updated = [newGroup, ...customGroups];
    setCustomGroups(updated);
    try {
      localStorage.setItem("unicircle_chat_custom_groups", JSON.stringify(updated));
    } catch (e) {}

    // Add initial welcome message in group
    updateMessagesMap((prev) => ({
      ...prev,
      [groupId]: [
        {
          id: `sys-${Date.now()}`,
          senderId: "system",
          text: `🎉 Welcome to ${newGroupName.trim()}! Created by ${currentUser?.firstName || "You"}${memberNames.length > 0 ? ` with ${memberNames.join(", ")}` : ""}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isRead: true,
          type: "text",
        }
      ]
    }));

    // Reset Modal
    setShowCreateGroupModal(false);
    setNewGroupName("");
    setNewGroupTopic("");
    setSelectedFriendsForGroup(new Set());
    setFriendSearchQuery("");

    // Open newly created group immediately
    handleSelectConversation(newGroup);
  };

  // Toggle friend selection for group
  const handleToggleFriendSelection = (id: string) => {
    setSelectedFriendsForGroup((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return allConversations.filter((conv) => {
      // 1. Filter Tab
      if (activeTab === "groups" && !conv.isGroup) return false;
      if (activeTab === "unread" && (!conv.unreadCount || conv.unreadCount <= 0)) return false;
      if (activeTab === "favorites" && !conv.isFavorite) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = conv.name.toLowerCase().includes(q);
        const matchesMsg = conv.lastMessage.toLowerCase().includes(q);
        const matchesSender = conv.lastMessageSender?.toLowerCase().includes(q);
        if (!matchesName && !matchesMsg && !matchesSender) return false;
      }

      return true;
    });
  }, [allConversations, activeTab, searchQuery]);

  const activeMessages = currentConversation ? (messagesMap[currentConversation.id] || []) : [];
  const isChatViewActive = Boolean(currentConversation && (navState?.chatView === "chat" || selectedConvId));

  // Send Message Handler
  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentConversation) return;
    const textToSend = inputText.trim();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "me",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
      type: "text",
    };

    updateMessagesMap((prev) => ({
      ...prev,
      [currentConversation.id]: [...(prev[currentConversation.id] || []), newMsg],
    }));
    setInputText("");

    // Push to Supabase if 1-on-1 live user
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user && activeConversationId && !currentConversation.isGroup) {
        await sendLiveChatMessage({
          conversationId: activeConversationId,
          senderId: authData.user.id,
          content: textToSend,
        });
      }
    } catch (e) {
      console.warn("Could not push message:", e);
    }
  };

  // Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && currentConversation) {
      const file = files[0];
      const publicUrl = await uploadToStorage(file, "chat_media");
      const fileUrl = publicUrl || URL.createObjectURL(file);

      const imgMsg: ChatMessage = {
        id: `img-${Date.now()}`,
        senderId: "me",
        text: "Shared a photo",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isRead: true,
        type: "image",
        mediaUrl: fileUrl,
      };

      updateMessagesMap((prev) => ({
        ...prev,
        [currentConversation.id]: [...(prev[currentConversation.id] || []), imgMsg],
      }));
    }
  };

  // Voice Note Send
  const handleSendVoiceNote = () => {
    if (!currentConversation) return;
    const voiceMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      senderId: "me",
      text: "Voice message",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
      type: "voice",
      durationSec: recordingSeconds || 5,
    };
    updateMessagesMap((prev) => ({
      ...prev,
      [currentConversation.id]: [...(prev[currentConversation.id] || []), voiceMsg],
    }));
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-[86vh] md:h-[82vh] bg-[#0A0E17] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
      
      {/* ─── 1. CONVERSATIONS LIST SCREEN (Matches Screenshot) ─── */}
      <div className={`w-full md:w-[380px] lg:w-[400px] bg-[#080C14] border-r border-white/5 flex flex-col h-full shrink-0 ${
        isChatViewActive ? "hidden md:flex" : "flex"
      }`}>
        
        {/* Top Header Bar */}
        <div className="p-4 md:p-5 border-b border-white/5 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            {/* Left Menu & Title */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                title="Create Group"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Chats
              </h1>
            </div>

            {/* Right Action Icons: Create Group, Search & Discover Plus Button */}
            <div className="flex items-center gap-1.5">
              {/* Create Group Quick Button */}
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                title="Create Group"
              >
                <Users className="w-4 h-4 text-indigo-400" />
              </button>

              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-2 rounded-full transition cursor-pointer ${
                  isSearchOpen ? "bg-purple-600/20 text-purple-400" : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
                title="Search Chats"
              >
                <Search className="w-5 h-5 stroke-[2.2]" />
              </button>

              {/* PLUS ICON: Redirects to Discover where user sees people */}
              <button
                type="button"
                onClick={handleRedirectToDiscover}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-transform cursor-pointer ml-0.5"
                title="Discover New People"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Collapsible Search Input */}
          {isSearchOpen && (
            <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search messages, people, groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-900/90 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stories / Online Friends Row (Horizontal Scroll) */}
        <div className="px-4 py-3.5 border-b border-white/5 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-3.5 min-w-max">
            {/* 1. "Your Story" Item */}
            <div
              onClick={() => setShowStoryCreator(true)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                  {currentUser?.photos?.[0] ? (
                    <img src={currentUser.photos[0]} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-purple-300" />
                  )}
                </div>
                {/* Purple Plus Badge */}
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md border-2 border-[#080C14]">
                  <Plus className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white truncate max-w-[60px]">
                {userStory ? "Shared" : "Your Story"}
              </span>
            </div>

            {/* 2. Active Contacts Stories */}
            {DEFAULT_STORIES.map((story) => (
              <div
                key={story.id}
                onClick={() => setActiveStoryModal(story)}
                className="flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#080C14]">
                    <img
                      src={story.avatar}
                      alt={story.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white truncate max-w-[60px]">
                  {story.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Tabs / Pills Row: All, Groups, Unread, Favorites */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: "All" },
              { id: "groups", label: "Groups" },
              { id: "unread", label: "Unread" },
              { id: "favorites", label: "Favorites" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as FilterTab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105"
                      : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Quick Create Group Trigger when on Groups tab or anytime */}
          {activeTab === "groups" && (
            <button
              type="button"
              onClick={() => setShowCreateGroupModal(true)}
              className="px-3 py-1 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Group
            </button>
          )}
        </div>

        {/* Conversations List Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-white/[0.03]">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = selectedConvId === conv.id;
              const msgs = messagesMap[conv.id] || [];
              const latestMsg = msgs[msgs.length - 1];
              const displayMsg = latestMsg ? latestMsg.text : conv.lastMessage;
              const displayTime = latestMsg ? latestMsg.timestamp : conv.timestamp;

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all duration-150 flex items-center gap-3.5 group ${
                    isSelected
                      ? "bg-purple-600/15 border border-purple-500/30 shadow-lg"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {/* Left Avatar / Group Icon */}
                  {conv.isGroup ? (
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                      <Users className="w-6 h-6 stroke-[2]" />
                    </div>
                  ) : (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10">
                      <img
                        src={conv.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"}
                        alt={conv.name}
                        className="w-full h-full object-cover"
                      />
                      {conv.online && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#080C14]" />
                      )}
                    </div>
                  )}

                  {/* Middle: Title & Message Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                        {conv.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 shrink-0 font-medium ml-2">
                        {displayTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-400 truncate leading-relaxed">
                        {conv.lastMessageSender && (
                          <span className="text-slate-300 font-semibold mr-1">
                            {conv.lastMessageSender}:
                          </span>
                        )}
                        {displayMsg}
                      </p>

                      {/* Right Badges: Muted Icon & Unread Pill */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {conv.isMuted && (
                          <BellOff className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        {conv.unreadCount !== undefined && conv.unreadCount > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-md shadow-purple-600/30">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400">
                {activeTab === "groups" ? "No group chats created yet." : "No conversations found in this category."}
              </p>
              {activeTab === "groups" ? (
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Create Your First Group
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRedirectToDiscover}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Discover Campus Students
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. ACTIVE CHAT THREAD VIEW (Responsive on Mobile & Desktop) ─── */}
      <div className={`flex-1 flex flex-col h-full bg-[#090D16]/90 backdrop-blur-xl ${
        !isChatViewActive ? "hidden md:flex" : "flex"
      }`}>
        {currentConversation ? (
          <>
            {/* Chat Thread Header */}
            <div className="p-3.5 md:p-4 border-b border-white/5 bg-[#080C14]/95 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back Button to List (Mobile & Tablet) */}
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
                  title="Back to chats list"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                </button>

                {/* Avatar */}
                {currentConversation.isGroup ? (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Users className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
                    <img
                      src={currentConversation.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"}
                      alt={currentConversation.name}
                      className="w-full h-full object-cover"
                    />
                    {currentConversation.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#080C14]" />
                    )}
                  </div>
                )}

                {/* Name & Status */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-white truncate">
                      {currentConversation.name}
                    </h2>
                    {!currentConversation.isGroup && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold shrink-0">
                        <ShieldCheck className="w-2.5 h-2.5" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {currentConversation.isGroup
                      ? `${currentConversation.memberIds ? currentConversation.memberIds.length + 1 : 12} Members • Group Chat`
                      : currentConversation.online
                      ? "Online now"
                      : "Active recently"}
                  </p>
                </div>
              </div>

              {/* Security & Action Badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium">
                  <Lock className="w-2.5 h-2.5" /> E2EE
                </span>
                <button
                  type="button"
                  onClick={handleRedirectToDiscover}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
                  title="Find more peers"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Scroll Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeMessages.map((msg) => {
                const isMe = msg.senderId === "me";
                const isSystem = msg.senderId === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] text-slate-400 text-center max-w-sm">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}>
                    <div className="flex items-center gap-2 max-w-[85%] sm:max-w-[75%]">
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed relative shadow-md ${
                          isMe
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none shadow-purple-600/20"
                            : "bg-slate-900 border border-white/10 text-slate-200 rounded-bl-none"
                        }`}
                      >
                        {msg.type === "image" && msg.mediaUrl ? (
                          <div className="space-y-1">
                            <img
                              src={msg.mediaUrl}
                              alt="Shared photo"
                              className="rounded-xl max-h-56 w-full object-cover border border-white/10"
                            />
                            {msg.text && msg.text !== "Shared a photo" && <p className="pt-1">{msg.text}</p>}
                          </div>
                        ) : msg.type === "voice" ? (
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <button
                              type="button"
                              onClick={() => setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)}
                              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
                            >
                              {playingVoiceId === msg.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                            <div className="flex-1 h-3 flex items-center gap-1">
                              {[40, 70, 30, 90, 50, 80, 60, 40, 70, 30].map((h, i) => (
                                <div
                                  key={i}
                                  className={`w-1 rounded-full ${playingVoiceId === msg.id ? "bg-white animate-pulse" : "bg-white/40"}`}
                                  style={{ height: `${h}%` }}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-mono text-white/80">{msg.durationSec || 6}s</span>
                          </div>
                        ) : (
                          <p>{msg.text}</p>
                        )}

                        <div className="flex items-center justify-end gap-1 text-[10px] text-white/60 mt-1">
                          <span>{msg.timestamp}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-white/5 bg-[#080C14] shrink-0">
              <input
                type="file"
                ref={chatFileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {isRecording ? (
                <div className="flex items-center justify-between px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-300 truncate pr-2">
                    <Mic className="w-4 h-4 text-red-400 animate-spin shrink-0" /> Recording Voice Note ({recordingSeconds}s)...
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsRecording(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendVoiceNote}
                      className="px-3 py-1 rounded-xl bg-red-500 text-white text-xs font-bold"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition shrink-0"
                    title="Attach Photo"
                  >
                    <Image className="w-4 h-4 text-purple-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRecording(true);
                      setRecordingSeconds(4);
                    }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition shrink-0"
                    title="Voice Note"
                  >
                    <Mic className="w-4 h-4 text-indigo-400" />
                  </button>

                  <input
                    type="text"
                    placeholder={`Message ${currentConversation.name}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 min-w-0"
                  />

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition shadow-lg shadow-purple-600/30 shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty placeholder if no chat selected on desktop */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-purple-600/10 text-purple-400 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 stroke-[1.75]" />
            </div>
            <div className="max-w-xs space-y-1">
              <h3 className="text-base font-bold text-white">Select a conversation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose a direct student chat or campus group to start messaging in real-time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Users className="w-4 h-4 text-indigo-400" /> Create Group
              </button>
              <button
                type="button"
                onClick={handleRedirectToDiscover}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-600/20 hover:scale-105 transition cursor-pointer"
              >
                Find Friends on Discover
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── CREATE GROUP CHAT MODAL ─── */}
      {showCreateGroupModal && (
        <div
          className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowCreateGroupModal(false)}
        >
          <div
            className="bg-[#0D121F] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Campus Group</h3>
                  <p className="text-[10px] text-slate-400">Add friends and study partners to a group chat</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-3 shrink-0">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science Study Group, Design Team..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Topic / Purpose (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Lab assignments, hackathon project, weekend hike"
                  value={newGroupTopic}
                  onChange={(e) => setNewGroupTopic(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Friend Selection List */}
            <div className="flex-1 min-h-[160px] overflow-hidden flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">
                  Select Friends ({selectedFriendsForGroup.size} selected)
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold">
                  {availableFriends.length} Available
                </span>
              </div>

              {/* Search Friends Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search friends by name or campus..."
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900/80 border border-white/10 rounded-xl text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Scrollable Friends Items */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/[0.03]">
                {availableFriends
                  .filter((f) =>
                    !friendSearchQuery ||
                    f.name.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                    (f.campus && f.campus.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                  )
                  .map((friend) => {
                    const isSelected = selectedFriendsForGroup.has(friend.id);
                    return (
                      <div
                        key={friend.id}
                        onClick={() => handleToggleFriendSelection(friend.id)}
                        className={`p-2 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-purple-600/20 border border-purple-500/40"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                            <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                            {friend.online && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#0D121F]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{friend.name}</h4>
                            <p className="text-[10px] text-slate-400 truncate">{friend.campus} • {friend.course}</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer"
              >
                Create Group {selectedFriendsForGroup.size > 0 ? `(${selectedFriendsForGroup.size + 1})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Story Viewer Modal ─── */}
      {activeStoryModal && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveStoryModal(null)}
        >
          <div
            className="bg-[#0D121F] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500">
                  <img src={activeStoryModal.avatar} alt={activeStoryModal.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{activeStoryModal.name}</h4>
                  <span className="text-[10px] text-purple-400 font-medium">Campus Story • Today</span>
                </div>
              </div>
              <button
                onClick={() => setActiveStoryModal(null)}
                className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/20 min-h-[140px] flex items-center justify-center text-center">
              <p className="text-sm font-medium text-purple-100 leading-relaxed">
                "{activeStoryModal.storyText || "Having a wonderful time on campus!"}"
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const targetConv = allConversations.find((c) => c.id === activeStoryModal.userId);
                setActiveStoryModal(null);
                if (targetConv) handleSelectConversation(targetConv);
              }}
              className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" /> Send Direct Reply
            </button>
          </div>
        </div>
      )}

      {/* ─── Story Creator Modal ─── */}
      {showStoryCreator && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowStoryCreator(false)}
        >
          <div
            className="bg-[#0D121F] border border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> Share Your Campus Story
              </h3>
              <button
                onClick={() => setShowStoryCreator(false)}
                className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={3}
              placeholder="What are you up to on campus? (Study session, club event, food, etc.)..."
              value={newStoryText}
              onChange={(e) => setNewStoryText(e.target.value)}
              className="w-full p-3.5 bg-slate-900 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowStoryCreator(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newStoryText.trim()) {
                    setUserStory({ text: newStoryText.trim(), time: "Just now" });
                    setShowStoryCreator(false);
                    setNewStoryText("");
                  }
                }}
                disabled={!newStoryText.trim()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
              >
                Publish Story
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
}

class ChatSuiteErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("RealTimeChatSuite error caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl bg-slate-900 border border-white/10 text-center space-y-4 my-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">UniCircle Direct Messaging</h2>
          <p className="text-xs text-slate-400 font-medium">Chat messages are loading. Tap below to reload.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
          >
            Reload Direct Messages
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const RealTimeChatSuite: React.FC<Props> = (props) => {
  return (
    <ChatSuiteErrorBoundary>
      <RealTimeChatSuiteContent {...props} />
    </ChatSuiteErrorBoundary>
  );
};
