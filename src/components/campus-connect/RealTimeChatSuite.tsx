import React, { useState } from "react";
import { Send, Mic, Image, Smile, ShieldCheck, CheckCheck, Trash2, MoreVertical, Search, Lock, Phone, Video, Play, Pause, Paperclip, ArrowLeft } from "lucide-react";
import { StudentProfile } from "./DiscoverDeck";
import {
  dispatchAppNotification,
  fetchNotificationPreferences,
} from "@/lib/notificationService";

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

import { AppNavState } from "@/lib/navigationHistory";

interface Props {
  activeMatch: StudentProfile | null;
  matches: StudentProfile[];
  onSelectMatch: (match: StudentProfile) => void;
  navState?: AppNavState;
  onNavigate?: (state: AppNavState) => void;
}

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  "sp-1": [
    { id: "m1", senderId: "sp-1", text: "Hey! Saw we matched on UniCircle! Loved your bio about CS and neural networks! 🚀", timestamp: "10:14 AM", isRead: true, type: "text" },
    { id: "m2", senderId: "me", text: "Hey Amani! Thanks! Are you in the med school library today?", timestamp: "10:16 AM", isRead: true, type: "text" },
    { id: "m3", senderId: "sp-1", text: "Yes! Preparing for anatomy midterms. Are you going to the campus hackathon this Saturday?", timestamp: "10:18 AM", isRead: true, type: "text" },
  ],
  "sp-2": [
    { id: "m20", senderId: "sp-2", text: "Hi Alex! Ready for the finance study session?", timestamp: "Yesterday", isRead: true, type: "text" },
  ],
  "sp-3": [
    { id: "m30", senderId: "sp-3", text: "Yo Alex! Let's team up for the East Africa AI challenge!", timestamp: "2 days ago", isRead: true, type: "text" },
  ],
};

export const RealTimeChatSuite: React.FC<Props> = ({ activeMatch, matches, onSelectMatch, navState, onNavigate }) => {
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const currentMatch = (navState?.tab === "chat" && navState.matchId)
    ? (matches.find((m) => m.id === navState.matchId) || activeMatch)
    : activeMatch;

  const mobileView = (navState?.tab === "chat" && (navState.chatView === "chat" || navState.matchId)) ? "chat" : "list";

  const handleSelectMatchInternal = (m: StudentProfile) => {
    onSelectMatch(m);
    if (onNavigate) {
      onNavigate({ tab: "chat", matchId: m.id, chatView: "chat" });
    }
  };

  const handleMobileBack = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !currentMatch) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "me",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
      type: "text",
    };

    const updated = { ...messagesMap, [currentMatch.id]: [...activeMessages, newMsg] };
    setMessagesMap(updated);
    setInputText("");

    // Simulate response after 1.5s
    setTimeout(async () => {
      const autoReplies = [
        "That sounds awesome! Let me check my lecture schedule! 😊",
        "Haha totally agree! See you on campus!",
        "Definitely! Let's grab coffee at the student union! ☕",
      ];
      const replyText = autoReplies[Math.floor(Math.random() * autoReplies.length)];
      const replyMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        senderId: currentMatch.id,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isRead: true,
        type: "text",
      };
      setMessagesMap((prev) => ({
        ...prev,
        [currentMatch.id]: [...(prev[currentMatch.id] || []), replyMsg],
      }));

      // Dispatch direct message notification if preference is ON
      const prefs = await fetchNotificationPreferences();
      dispatchAppNotification({
        type: "direct_message",
        fromName: currentMatch.name,
        fromAvatar: currentMatch.photos[0],
        fromUniversity: currentMatch.campus,
        message: `sent you a message: "${replyText.substring(0, 35)}..."`,
      }, prefs);
    }, 1500);
  };

  const handleSendVoiceNote = () => {
    if (!currentMatch) return;
    const voiceMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      senderId: "me",
      text: "Voice message",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
      type: "voice",
      durationSec: recordingSeconds || 5,
    };
    setMessagesMap((prev) => ({
      ...prev,
      [currentMatch.id]: [...(prev[currentMatch.id] || []), voiceMsg],
    }));
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!currentMatch) return;
    setMessagesMap((prev) => ({
      ...prev,
      [currentMatch.id]: (prev[currentMatch.id] || []).filter((m) => m.id !== msgId),
    }));
  };

  const filteredMatches = matches.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.campus.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto h-[82vh] md:h-[78vh] bg-slate-900 border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row backdrop-blur-2xl">
      {/* 1. Conversations List Sidebar (Hidden on mobile if chat view active) */}
      <div className={`w-full md:w-80 bg-slate-950 border-r border-white/10 flex flex-col h-full shrink-0 ${
        mobileView === "chat" ? "hidden md:flex" : "flex"
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white tracking-tight">Verified Messages</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold">
              {matches.length} Active
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Match Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredMatches.map((m) => {
            const isSelected = currentMatch?.id === m.id;
            const msgs = messagesMap[m.id] || [];
            const lastMsg = msgs[msgs.length - 1];
            return (
              <div
                key={m.id}
                onClick={() => handleSelectMatchInternal(m)}
                className={`p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 ${
                  isSelected
                    ? "bg-indigo-600/20 border border-indigo-500/40 shadow-lg shadow-indigo-600/10"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="relative w-11 h-11 shrink-0">
                  <img src={m.photos[0]} alt={m.name} className="w-full h-full object-cover rounded-full" />
                  {m.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-bold text-white truncate">{m.name}</h4>
                    <span className="text-[10px] text-slate-400">{lastMsg?.timestamp || "New"}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {lastMsg ? lastMsg.text : `Matched! Say hi to ${m.name}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Main Chat Thread Window (Hidden on mobile if list view active) */}
      <div className={`flex-1 flex flex-col h-full bg-slate-900/60 ${
        mobileView === "list" ? "hidden md:flex" : "flex"
      }`}>
        {currentMatch ? (
          <>
            {/* Chat Header with Mobile Back Button */}
            <div className="p-3 md:p-4 border-b border-white/10 bg-slate-950/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                {/* Back Arrow for Mobile Screen */}
                <button
                  onClick={handleMobileBack}
                  className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
                  title="Back to messages"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative w-9 h-9 md:w-10 md:h-10 shrink-0">
                  <img src={currentMatch.photos[0]} alt={currentMatch.name} className="w-full h-full object-cover rounded-full" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs md:text-sm font-bold text-white truncate">{currentMatch.name}</h3>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] md:text-[10px] font-bold shrink-0">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  </div>
                  <p className="text-[10px] md:text-[11px] text-slate-400 truncate">{currentMatch.campus} • {currentMatch.course}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px]">
                  <Lock className="w-3 h-3" /> E2EE Secured
                </span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeMessages.map((msg) => {
                const isMe = msg.senderId === "me";
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}>
                    <div className="flex items-center gap-2 max-w-[85%] sm:max-w-[75%]">
                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition p-1 text-slate-500 hover:text-red-400"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed relative ${
                          isMe
                            ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-br-none shadow-md shadow-indigo-600/20"
                            : "bg-slate-950 border border-white/10 text-slate-200 rounded-bl-none"
                        }`}
                      >
                        {msg.type === "voice" ? (
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <button
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
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-white/10 bg-slate-950 shrink-0">
              {isRecording ? (
                <div className="flex items-center justify-between px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-300 truncate pr-2">
                    <Mic className="w-4 h-4 text-red-400 animate-spin shrink-0" /> Recording Voice Note ({recordingSeconds}s)...
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setIsRecording(false)} className="px-3 py-1 text-xs text-slate-400 hover:text-white">
                      Cancel
                    </button>
                    <button onClick={handleSendVoiceNote} className="px-3 py-1 rounded-xl bg-red-500 text-white text-xs font-bold">
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecording(true);
                      setRecordingSeconds(4);
                    }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition shrink-0"
                    title="Voice Note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    placeholder={`Send message to ${currentMatch.name}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 min-w-0"
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-lg shadow-indigo-600/30 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            Select a verified student match to begin chatting.
          </div>
        )}
      </div>
    </div>
  );
};
