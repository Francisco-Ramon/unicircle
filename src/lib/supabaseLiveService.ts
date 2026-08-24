import { supabase } from "@/integrations/supabase/client";

export interface LiveProfile {
  id: string;
  email?: string;
  phone?: string;
  first_name: string;
  last_name: string;
  gender: string;
  interested_in: string;
  campus: string;
  country: string;
  course: string;
  year_of_study: string;
  bio: string;
  photos: string[];
  interests: string[];
  verified: boolean;
  is_online?: boolean;
}

export interface LivePost {
  id: string;
  author_id: string;
  campus: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: LiveProfile;
  userLiked?: boolean;
}

export interface LiveComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: LiveProfile;
}

export interface LiveEvent {
  id: string;
  creator_id: string;
  campus: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  image: string;
  description: string;
  redirect_url?: string;
  rsvp_count: number;
  created_at: string;
  userRsvpd?: boolean;
}

// --------------------------------------------------------------------------
// 1. STORAGE: Upload Media (Avatars, Post Images, Event Flyers)
// --------------------------------------------------------------------------
export async function uploadToStorage(
  file: File,
  bucket: "avatars" | "post_images" | "event_posters" | "chat_media" = "avatars"
): Promise<string> {
  // Convert to Base64 helper for guaranteed persistence fallback
  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(f);
    });

  try {
    const fileExt = file.name.split(".").pop() || "jpg";
    const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (error) {
      console.warn("Storage bucket upload notice (using permanent Base64):", error.message);
      return await fileToBase64(file);
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    if (publicUrlData?.publicUrl) {
      return publicUrlData.publicUrl;
    }
    return await fileToBase64(file);
  } catch (err) {
    console.warn("Using permanent Base64 fallback for uploaded photo:", err);
    return await fileToBase64(file);
  }
}

// --------------------------------------------------------------------------
// 2. PROFILES: Fetch & Update
// --------------------------------------------------------------------------
export async function getLiveProfile(userId: string): Promise<LiveProfile | null> {
  try {
    const { data, error } = await (supabase
      .from("profiles" as any)
      .select("*")
      .eq("id", userId)
      .single() as any);

    if (error) {
      console.warn("Profile fetch warning:", error.message);
      return null;
    }
    return data as LiveProfile;
  } catch (err) {
    console.error("Error fetching live profile:", err);
    return null;
  }
}

export async function upsertLiveProfile(profile: any): Promise<boolean> {
  try {
    const payload: any = {
      id: profile.id,
      first_name: profile.first_name || profile.firstName || "Student",
      last_name: profile.last_name || profile.lastName || "",
      university_name: profile.university_name || profile.campus || "University of Nairobi",
      campus: profile.campus || profile.university_name || "University of Nairobi",
      course: profile.course || "Undergraduate",
      year_of_study: profile.year_of_study || profile.yearOfStudy || "3rd Year",
      photos: profile.photos || [],
      is_verified: profile.is_verified ?? profile.verified ?? true,
      verified: profile.verified ?? profile.is_verified ?? true,
      gender: profile.gender || "Female",
      bio: profile.bio || "UniCircle student",
      interests: profile.interests || ["Campus Events", "Networking"],
      is_online: true,
      last_active: new Date().toISOString(),
    };

    const { error } = await (supabase.from("profiles" as any).upsert(payload, { onConflict: "id" }) as any);

    if (error) {
      // Retry with minimal standard columns
      const minimalPayload = {
        id: profile.id,
        first_name: payload.first_name,
        last_name: payload.last_name,
        university_name: payload.university_name,
        year_of_study: payload.year_of_study,
        photos: payload.photos,
        is_verified: true,
      };
      await (supabase.from("profiles" as any).upsert(minimalPayload, { onConflict: "id" }) as any);
    }
    return true;
  } catch (err) {
    console.error("Failed to save profile:", err);
    return false;
  }
}

// --------------------------------------------------------------------------
// 3. CAMPUS POSTS: Fetch, Create, Like, Comment
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// 3. CAMPUS POSTS: Fetch, Create, Like, Comment
// --------------------------------------------------------------------------
export async function fetchLivePosts(campus?: string): Promise<LivePost[]> {
  try {
    // 1. Try fetching from community_posts
    let rawPosts: any[] = [];
    const { data: commPosts, error: commErr } = await (supabase
      .from("community_posts" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) as any);

    if (!commErr && commPosts && commPosts.length > 0) {
      rawPosts = commPosts;
    } else {
      // Fallback to posts table
      const { data: simplePosts } = await (supabase
        .from("posts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50) as any);
      if (simplePosts) rawPosts = simplePosts;
    }

    if (rawPosts.length === 0) return [];

    // 2. Fetch author profiles in bulk
    const authorIds = Array.from(new Set(rawPosts.map((p) => p.author_id).filter(Boolean)));
    let authorMap: Record<string, LiveProfile> = {};
    if (authorIds.length > 0) {
      const { data: profs } = await (supabase
        .from("profiles" as any)
        .select("*")
        .in("id", authorIds) as any);
      if (profs) {
        profs.forEach((pr: LiveProfile) => {
          authorMap[pr.id] = pr;
        });
      }
    }

    // 3. Map to unified LivePost
    return rawPosts.map((p) => {
      const author = authorMap[p.author_id];
      return {
        id: p.id,
        author_id: p.author_id,
        campus: p.university_name || p.campus || "University",
        content: p.content || p.title || "",
        image_url: p.image_url || p.cover_photo || null,
        likes_count: p.likes_count || 0,
        comments_count: p.comments_count || 0,
        created_at: p.created_at,
        profiles: author ? {
          id: author.id,
          first_name: author.first_name,
          last_name: author.last_name,
          campus: author.campus || author.university_name || "",
          course: author.course || "Student",
          year_of_study: author.year_of_study || "3rd Year",
          photos: author.photos || [],
          verified: author.verified ?? true,
        } : undefined,
      };
    });
  } catch (err) {
    console.error("Error in fetchLivePosts:", err);
    return [];
  }
}

export async function createLivePost(params: {
  authorId?: string;
  content: string;
  campus: string;
  imageUrl?: string;
}): Promise<LivePost | null> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const effectiveAuthorId = authData?.user?.id || params.authorId;
    const titleSnippet = params.content.substring(0, 50);

    // 1. Try inserting to community_posts
    if (effectiveAuthorId) {
      const { data: commData, error: commErr } = await (supabase
        .from("community_posts" as any)
        .insert({
          author_id: effectiveAuthorId,
          university_name: params.campus,
          title: titleSnippet,
          content: params.content,
          category: "General",
          image_url: params.imageUrl || null,
        })
        .select()
        .single() as any);

      if (!commErr && commData) {
        return {
          id: commData.id,
          author_id: commData.author_id,
          campus: commData.university_name,
          content: commData.content,
          image_url: commData.image_url,
          likes_count: commData.likes_count || 0,
          comments_count: 0,
          created_at: commData.created_at,
        };
      }
    }

    // 2. Fallback to posts table
    if (effectiveAuthorId) {
      const { data: postData, error: postErr } = await (supabase
        .from("posts" as any)
        .insert({
          author_id: effectiveAuthorId,
          campus: params.campus,
          content: params.content,
          image_url: params.imageUrl || null,
        })
        .select()
        .single() as any);

      if (!postErr && postData) {
        return postData as LivePost;
      }
    }

    return null;
  } catch (err) {
    console.error("Failed to create post in Supabase:", err);
    return null;
  }
}

export function subscribeToLiveCommunity(callbacks: {
  onNewPost?: (post: LivePost) => void;
  onNewEvent?: (event: LiveEvent) => void;
}) {
  const channel = supabase
    .channel("unicircle-live-feed-channel")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "community_posts" },
      (payload) => {
        const p: any = payload.new;
        if (callbacks.onNewPost) {
          callbacks.onNewPost({
            id: p.id,
            author_id: p.author_id,
            campus: p.university_name || "University",
            content: p.content || p.title || "",
            image_url: p.image_url || null,
            likes_count: p.likes_count || 0,
            comments_count: p.comments_count || 0,
            created_at: p.created_at,
          });
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      (payload) => {
        const p: any = payload.new;
        if (callbacks.onNewPost) {
          callbacks.onNewPost({
            id: p.id,
            author_id: p.author_id,
            campus: p.campus || "University",
            content: p.content || "",
            image_url: p.image_url || null,
            likes_count: p.likes_count || 0,
            comments_count: 0,
            created_at: p.created_at,
          });
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "events" },
      (payload) => {
        const ev: any = payload.new;
        if (callbacks.onNewEvent) {
          callbacks.onNewEvent({
            id: ev.id,
            creator_id: ev.creator_id || ev.organizer_id || "",
            campus: ev.campus || ev.university_name || "Campus",
            title: ev.title,
            category: ev.category || "Party",
            date: ev.date || ev.event_date || "Upcoming",
            time: ev.time || ev.event_time || "TBA",
            location: ev.location || ev.venue || "Campus",
            image: ev.image || ev.cover_photo || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80",
            description: ev.description || "",
            redirect_url: ev.redirect_url || ev.registration_link || null,
            rsvp_count: ev.rsvp_count || 1,
            created_at: ev.created_at,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function toggleLiveLike(postId: string, userId: string, isCurrentlyLiked: boolean): Promise<boolean> {
  try {
    if (isCurrentlyLiked) {
      await (supabase.from("post_likes" as any).delete().match({ post_id: postId, user_id: userId }) as any);
    } else {
      await (supabase.from("post_likes" as any).insert({ post_id: postId, user_id: userId }) as any);
    }
    return true;
  } catch (err) {
    console.error("Error toggling like:", err);
    return false;
  }
}

export async function addLivePostComment(params: {
  postId: string;
  authorId: string;
  content: string;
}): Promise<LiveComment | null> {
  try {
    const { data, error } = await (supabase
      .from("post_comments" as any)
      .insert({
        post_id: params.postId,
        author_id: params.authorId,
        content: params.content,
      })
      .select()
      .single() as any);

    if (error) {
      console.error("Add comment error:", error);
      return null;
    }
    return data as LiveComment;
  } catch (err) {
    console.error("Failed to add comment:", err);
    return null;
  }
}

// --------------------------------------------------------------------------
// 4. CAMPUS EVENTS: Fetch & Create
// --------------------------------------------------------------------------
export async function fetchLiveEvents(campus?: string): Promise<LiveEvent[]> {
  try {
    const { data, error } = await (supabase
      .from("events" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) as any);

    if (error) {
      console.warn("Could not fetch live events:", error.message);
      return [];
    }

    return ((data || []) as any[]).map((ev) => ({
      id: ev.id,
      creator_id: ev.creator_id || ev.organizer_id || "",
      campus: ev.campus || ev.university_name || "Campus",
      title: ev.title,
      category: ev.category || "Party",
      date: ev.date || ev.event_date || "Upcoming",
      time: ev.time || ev.event_time || "TBA",
      location: ev.location || ev.venue || "Campus Venue",
      image: ev.image || ev.cover_photo || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80",
      description: ev.description || "",
      redirect_url: ev.redirect_url || ev.registration_link || null,
      rsvp_count: ev.rsvp_count || 1,
      created_at: ev.created_at,
    }));
  } catch (err) {
    console.error("Error in fetchLiveEvents:", err);
    return [];
  }
}

export async function createLiveEvent(eventData: {
  creatorId: string;
  campus: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  image?: string;
  description: string;
  redirectUrl?: string;
}): Promise<LiveEvent | null> {
  try {
    const defaultCover = eventData.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80";

    // Try creating event with schema-compatible payload
    const { data, error } = await (supabase
      .from("events" as any)
      .insert({
        organizer_id: eventData.creatorId,
        creator_id: eventData.creatorId,
        university_name: eventData.campus,
        campus: eventData.campus,
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        cover_photo: defaultCover,
        image: defaultCover,
        event_date: eventData.date || new Date().toISOString().split("T")[0],
        date: eventData.date || "Upcoming",
        event_time: eventData.time || "TBA",
        time: eventData.time || "TBA",
        venue: eventData.location,
        location: eventData.location,
        registration_link: eventData.redirectUrl || null,
        redirect_url: eventData.redirectUrl || null,
        rsvp_count: 1,
      })
      .select()
      .single() as any);

    if (error) {
      // Retry with minimal columns if specific constraints failed
      const { data: retryData, error: retryErr } = await (supabase
        .from("events" as any)
        .insert({
          title: eventData.title,
          description: eventData.description,
          category: eventData.category,
          university_name: eventData.campus,
          organizer_id: eventData.creatorId,
          cover_photo: defaultCover,
          event_date: new Date().toISOString().split("T")[0],
          event_time: eventData.time || "TBA",
          venue: eventData.location,
        })
        .select()
        .single() as any);

      if (!retryErr && retryData) {
        return {
          id: retryData.id,
          creator_id: eventData.creatorId,
          campus: eventData.campus,
          title: retryData.title,
          category: retryData.category,
          date: eventData.date,
          time: eventData.time,
          location: eventData.location,
          image: defaultCover,
          description: retryData.description,
          rsvp_count: 1,
          created_at: retryData.created_at,
        };
      }
      console.warn("Create event retry error:", retryErr?.message || error.message);
      return null;
    }

    return {
      id: data.id,
      creator_id: eventData.creatorId,
      campus: eventData.campus,
      title: data.title,
      category: data.category,
      date: eventData.date,
      time: eventData.time,
      location: eventData.location,
      image: defaultCover,
      description: data.description,
      rsvp_count: 1,
      created_at: data.created_at,
    };
  } catch (err) {
    console.error("Failed to create event:", err);
    return null;
  }
}

// --------------------------------------------------------------------------
// 5. DISCOVER: Fetch Real Students for Swiping
// --------------------------------------------------------------------------
export async function fetchLiveDiscoverProfiles(currentUserId?: string, campus?: string): Promise<LiveProfile[]> {
  try {
    let query = (supabase.from("profiles" as any).select("*").limit(50)) as any;
    if (currentUserId) {
      query = query.neq("id", currentUserId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("Error fetching discover profiles:", error.message);
      return [];
    }
    return (data || []) as LiveProfile[];
  } catch (err) {
    console.error("Error in fetchLiveDiscoverProfiles:", err);
    return [];
  }
}

export async function recordLiveSwipe(params: {
  swiperId: string;
  targetId: string;
  action: "like" | "pass" | "superlike";
}): Promise<{ isMatch: boolean }> {
  try {
    const { data: mutual } = await (supabase
      .from("swipes" as any)
      .select("id")
      .eq("swiper_id", params.targetId)
      .eq("target_id", params.swiperId)
      .in("action", ["like", "superlike"])
      .maybeSingle() as any);

    const isMatch = !!mutual && (params.action === "like" || params.action === "superlike");

    await (supabase
      .from("swipes" as any)
      .upsert({
        swiper_id: params.swiperId,
        target_id: params.targetId,
        action: params.action,
        is_match: isMatch,
      }) as any);

    if (isMatch) {
      await (supabase
        .from("conversations" as any)
        .insert({
          user1_id: params.swiperId,
          user2_id: params.targetId,
          last_message: "You matched on UniCircle! Say hello 👋",
        }) as any);
    }

    return { isMatch };
  } catch (err) {
    console.error("Failed to record swipe:", err);
    return { isMatch: false };
  }
}

// --------------------------------------------------------------------------
// 6. LIVE REAL-TIME CHAT & CONVERSATIONS
// --------------------------------------------------------------------------
export interface LiveConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string;
  last_message_time: string;
  otherUser?: LiveProfile;
}

export interface LiveMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchUserConversations(userId: string): Promise<LiveConversation[]> {
  try {
    const { data, error } = await (supabase
      .from("conversations" as any)
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("last_message_time", { ascending: false })) as any;

    if (error) {
      console.warn("Error fetching conversations:", error.message);
      return [];
    }

    const conversations = (data || []) as LiveConversation[];
    
    // Enrich with other user's profile
    const enriched = await Promise.all(
      conversations.map(async (c) => {
        const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
        const otherProf = await getLiveProfile(otherId);
        return {
          ...c,
          otherUser: otherProf || undefined,
        };
      })
    );

    return enriched;
  } catch (err) {
    console.error("Error in fetchUserConversations:", err);
    return [];
  }
}

export async function getOrCreateConversation(user1Id: string, user2Id: string): Promise<string | null> {
  try {
    // Check existing
    const { data: existing } = await (supabase
      .from("conversations" as any)
      .select("id")
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .maybeSingle() as any);

    if (existing) return existing.id;

    // Create new
    const { data: created, error } = await (supabase
      .from("conversations" as any)
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        last_message: "Started a new conversation 👋",
        last_message_time: new Date().toISOString(),
      })
      .select("id")
      .single() as any);

    if (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
    return created.id;
  } catch (err) {
    console.error("Error in getOrCreateConversation:", err);
    return null;
  }
}

export async function fetchConversationMessages(conversationId: string): Promise<LiveMessage[]> {
  try {
    const { data, error } = await (supabase
      .from("messages" as any)
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })) as any;

    if (error) {
      console.warn("Error fetching messages:", error.message);
      return [];
    }
    return (data || []) as LiveMessage[];
  } catch (err) {
    console.error("Error in fetchConversationMessages:", err);
    return [];
  }
}

export async function sendLiveChatMessage(params: {
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string;
}): Promise<LiveMessage | null> {
  try {
    const { data, error } = await (supabase
      .from("messages" as any)
      .insert({
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        content: params.content,
        media_url: params.mediaUrl || null,
        is_read: false,
      })
      .select()
      .single() as any);

    if (error) {
      console.error("Failed to send message:", error);
      return null;
    }

    // Update conversation last_message
    await (supabase
      .from("conversations" as any)
      .update({
        last_message: params.content,
        last_message_time: new Date().toISOString(),
      })
      .eq("id", params.conversationId) as any);

    return data as LiveMessage;
  } catch (err) {
    console.error("Error in sendLiveChatMessage:", err);
    return null;
  }
}

export function subscribeToLiveMessages(
  conversationId: string,
  onNewMessage: (msg: LiveMessage) => void
) {
  const channel = supabase
    .channel(`chat_${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewMessage(payload.new as LiveMessage);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
