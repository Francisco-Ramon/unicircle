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
): Promise<string | null> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Failed to upload image to Supabase storage:", err);
    return null;
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

export async function upsertLiveProfile(profile: Partial<LiveProfile> & { id: string }): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from("profiles" as any)
      .upsert(profile, { onConflict: "id" }) as any);

    if (error) {
      console.error("Error upserting profile:", error);
      return false;
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
export async function fetchLivePosts(campus?: string): Promise<LivePost[]> {
  try {
    let query = (supabase
      .from("posts" as any)
      .select(`
        *,
        profiles:author_id (id, first_name, last_name, campus, course, year_of_study, photos, verified)
      `)
      .order("created_at", { ascending: false })) as any;

    if (campus) {
      query = query.ilike("campus", `%${campus}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Could not fetch live posts:", error.message);
      return [];
    }
    return (data || []) as LivePost[];
  } catch (err) {
    console.error("Error in fetchLivePosts:", err);
    return [];
  }
}

export async function createLivePost(params: {
  authorId: string;
  content: string;
  campus: string;
  imageUrl?: string;
}): Promise<LivePost | null> {
  try {
    const { data, error } = await (supabase
      .from("posts" as any)
      .insert({
        author_id: params.authorId,
        campus: params.campus,
        content: params.content,
        image_url: params.imageUrl || null,
      })
      .select(`
        *,
        profiles:author_id (id, first_name, last_name, campus, course, year_of_study, photos, verified)
      `)
      .single() as any);

    if (error) {
      console.error("Create post error:", error);
      return null;
    }
    return data as LivePost;
  } catch (err) {
    console.error("Failed to create post:", err);
    return null;
  }
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
      .select(`
        *,
        profiles:author_id (id, first_name, last_name, course, year_of_study, photos, verified)
      `)
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
    let query = (supabase.from("events" as any).select("*").order("created_at", { ascending: false })) as any;
    if (campus) {
      query = query.ilike("campus", `%${campus}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("Could not fetch live events:", error.message);
      return [];
    }
    return (data || []) as LiveEvent[];
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
    const { data, error } = await (supabase
      .from("events" as any)
      .insert({
        creator_id: eventData.creatorId,
        campus: eventData.campus,
        title: eventData.title,
        category: eventData.category,
        date: eventData.date,
        time: eventData.time,
        location: eventData.location,
        image: eventData.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80",
        description: eventData.description,
        redirect_url: eventData.redirectUrl || null,
        rsvp_count: 1,
      })
      .select()
      .single() as any);

    if (error) {
      console.error("Create event error:", error);
      return null;
    }
    return data as LiveEvent;
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
