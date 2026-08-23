export type TabType = "home" | "discover" | "communities" | "events" | "chat" | "notifications" | "profile" | "settings";

export interface AppNavState {
  tab: TabType;
  category?: string;       // e.g. "Past Events", "Party", "All"
  eventId?: string;        // e.g. "e1"
  eventView?: "details" | "chart" | "comments";
  profileId?: string;      // e.g. "p1"
  profileView?: "details" | "photos";
  matchId?: string;        // e.g. "m1"
  chatView?: "list" | "chat" | "profile";
  communityId?: string;    // e.g. "c1"
  postId?: string;         // e.g. "post1"
  modal?: "filter" | "host-event" | "report" | "block" | "lightbox" | "edit-profile";
  scrollPos?: number;
}

export const DEFAULT_NAV_STATE: AppNavState = {
  tab: "home",
};

const VALID_TABS: TabType[] = ["home", "discover", "communities", "events", "chat", "notifications", "profile", "settings"];

/**
 * Encodes an AppNavState object into a URL hash string.
 * Example: #events?category=Past+Events&eventId=e1&eventView=chart
 */
export function encodeNavState(state: AppNavState): string {
  const params = new URLSearchParams();

  if (state.category) params.set("category", state.category);
  if (state.eventId) params.set("eventId", state.eventId);
  if (state.eventView) params.set("eventView", state.eventView);
  if (state.profileId) params.set("profileId", state.profileId);
  if (state.profileView) params.set("profileView", state.profileView);
  if (state.matchId) params.set("matchId", state.matchId);
  if (state.chatView) params.set("chatView", state.chatView);
  if (state.communityId) params.set("communityId", state.communityId);
  if (state.postId) params.set("postId", state.postId);
  if (state.modal) params.set("modal", state.modal);
  if (state.scrollPos) params.set("scrollPos", String(state.scrollPos));

  const paramStr = params.toString();
  return `#${state.tab}${paramStr ? `?${paramStr}` : ""}`;
}

/**
 * Decodes the current URL hash into a structured AppNavState object.
 */
export function decodeNavState(hash: string): AppNavState {
  if (!hash || hash === "#") return DEFAULT_NAV_STATE;

  const rawHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const [tabPart, queryPart] = rawHash.split("?");

  const tab = (VALID_TABS.includes(tabPart as TabType) ? tabPart : "home") as TabType;
  const state: AppNavState = { tab };

  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    if (params.has("category")) state.category = params.get("category")!;
    if (params.has("eventId")) state.eventId = params.get("eventId")!;
    if (params.has("eventView")) state.eventView = params.get("eventView") as any;
    if (params.has("profileId")) state.profileId = params.get("profileId")!;
    if (params.has("profileView")) state.profileView = params.get("profileView") as any;
    if (params.has("matchId")) state.matchId = params.get("matchId")!;
    if (params.has("chatView")) state.chatView = params.get("chatView") as any;
    if (params.has("communityId")) state.communityId = params.get("communityId")!;
    if (params.has("postId")) state.postId = params.get("postId")!;
    if (params.has("modal")) state.modal = params.get("modal") as any;
    if (params.has("scrollPos")) state.scrollPos = Number(params.get("scrollPos"));
  }

  return state;
}

/**
 * Pushes a new navigation state onto browser history without triggering full page reloads.
 */
export function pushNavState(nextState: AppNavState) {
  if (typeof window === "undefined") return;
  const newHash = encodeNavState(nextState);
  if (window.location.hash !== newHash) {
    window.history.pushState({ unicircleNav: nextState }, "", newHash);
  }
}

/**
 * Replaces current navigation state in browser history without adding a new entry.
 */
export function replaceNavState(nextState: AppNavState) {
  if (typeof window === "undefined") return;
  const newHash = encodeNavState(nextState);
  window.history.replaceState({ unicircleNav: nextState }, "", newHash);
}
