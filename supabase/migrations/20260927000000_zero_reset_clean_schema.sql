-- ==============================================================================
-- UNICIRCLE PLATFORM: ZERO-RESET & MASTER FRESH SCHEMA (100% IDEMPOTENT)
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yztsnjnogiiblezrxqox/sql/new
-- ==============================================================================

-- 1. DROP ALL EXISTING TABLES & OBJECTS (CASCADE RESET TO ZERO)
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.event_rsvps CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.swipes CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.discovery_preferences CASCADE;
DROP TABLE IF EXISTS public.post_reactions CASCADE;
DROP TABLE IF EXISTS public.community_posts CASCADE;
DROP TABLE IF EXISTS public.universities CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.books CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. CREATE PROFILES TABLE (Verified Students)
-- ------------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  phone TEXT,
  first_name TEXT NOT NULL DEFAULT 'Student',
  last_name TEXT DEFAULT '',
  dob DATE,
  gender TEXT DEFAULT 'Male',
  orientation TEXT DEFAULT 'Straight',
  interested_in TEXT DEFAULT 'Everyone',
  relationship_goal TEXT DEFAULT 'Friendship',
  country TEXT DEFAULT 'Kenya',
  campus TEXT NOT NULL DEFAULT 'University of Nairobi',
  institution_id TEXT,
  faculty TEXT DEFAULT 'General Studies',
  course TEXT DEFAULT 'Undergraduate',
  year_of_study TEXT DEFAULT '1st Year (Freshman)',
  height TEXT DEFAULT '170 cm',
  bio TEXT DEFAULT 'Verified university student on UniCircle.',
  lifestyle JSONB DEFAULT '{}'::jsonb,
  interests TEXT[] DEFAULT ARRAY['Campus Life', 'Tech', 'Music'],
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  verified BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Profiles Read Access" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Insert Access" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Update Access" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Delete Access" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access to verified student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

CREATE POLICY "Public Profiles Read Access" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Profiles Insert Access" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Profiles Update Access" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Public Profiles Delete Access" ON public.profiles FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 3. CREATE CAMPUS POSTS TABLE (Home Feed & Community Hub)
-- ------------------------------------------------------------------------------
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  campus TEXT NOT NULL DEFAULT 'University of Nairobi',
  content TEXT NOT NULL,
  image_url TEXT,
  visibility TEXT DEFAULT 'campus',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Posts Read Access" ON public.posts;
DROP POLICY IF EXISTS "Public Posts Insert Access" ON public.posts;
DROP POLICY IF EXISTS "Public Posts Update Access" ON public.posts;
DROP POLICY IF EXISTS "Public Posts Delete Access" ON public.posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Allow public read access to posts" ON public.posts;
DROP POLICY IF EXISTS "Allow authenticated users to create posts" ON public.posts;

CREATE POLICY "Public Posts Read Access" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Public Posts Insert Access" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Posts Update Access" ON public.posts FOR UPDATE USING (true);
CREATE POLICY "Public Posts Delete Access" ON public.posts FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 4. CREATE POST LIKES & POST COMMENTS TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Likes Read Access" ON public.post_likes;
DROP POLICY IF EXISTS "Public Likes Insert Access" ON public.post_likes;
DROP POLICY IF EXISTS "Public Likes Delete Access" ON public.post_likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;

CREATE POLICY "Public Likes Read Access" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Public Likes Insert Access" ON public.post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Likes Delete Access" ON public.post_likes FOR DELETE USING (true);

CREATE TABLE public.post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Comments Read Access" ON public.post_comments;
DROP POLICY IF EXISTS "Public Comments Insert Access" ON public.post_comments;
DROP POLICY IF EXISTS "Public Comments Delete Access" ON public.post_comments;
DROP POLICY IF EXISTS "Users can comment on posts" ON public.post_comments;

CREATE POLICY "Public Comments Read Access" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Public Comments Insert Access" ON public.post_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Comments Delete Access" ON public.post_comments FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 5. CREATE CONVERSATIONS & LIVE MESSAGES TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Conversations Read Access" ON public.conversations;
DROP POLICY IF EXISTS "Public Conversations Insert Access" ON public.conversations;
DROP POLICY IF EXISTS "Public Conversations Update Access" ON public.conversations;

CREATE POLICY "Public Conversations Read Access" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Public Conversations Insert Access" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Conversations Update Access" ON public.conversations FOR UPDATE USING (true);

CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT,
  match_id UUID,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Messages Read Access" ON public.messages;
DROP POLICY IF EXISTS "Public Messages Insert Access" ON public.messages;
DROP POLICY IF EXISTS "Public Messages Update Access" ON public.messages;
DROP POLICY IF EXISTS "Allow users to read their own messages" ON public.messages;
DROP POLICY IF EXISTS "Allow users to send messages" ON public.messages;

CREATE POLICY "Public Messages Read Access" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Public Messages Insert Access" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Messages Update Access" ON public.messages FOR UPDATE USING (true);

-- ------------------------------------------------------------------------------
-- 6. CREATE EVENTS & RSVPS TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  campus TEXT NOT NULL DEFAULT 'University of Nairobi',
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Party',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  image TEXT,
  description TEXT,
  redirect_url TEXT,
  rsvp_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Events Read Access" ON public.events;
DROP POLICY IF EXISTS "Public Events Insert Access" ON public.events;
DROP POLICY IF EXISTS "Public Events Update Access" ON public.events;
DROP POLICY IF EXISTS "Public Events Delete Access" ON public.events;
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
DROP POLICY IF EXISTS "Allow verified users to create events" ON public.events;

CREATE POLICY "Public Events Read Access" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public Events Insert Access" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Events Update Access" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Public Events Delete Access" ON public.events FOR DELETE USING (true);

CREATE TABLE public.event_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'going',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public RSVPs Read Access" ON public.event_rsvps;
DROP POLICY IF EXISTS "Public RSVPs Insert Access" ON public.event_rsvps;
DROP POLICY IF EXISTS "Public RSVPs Delete Access" ON public.event_rsvps;
DROP POLICY IF EXISTS "Allow public read access to RSVPs" ON public.event_rsvps;
DROP POLICY IF EXISTS "Allow users to manage their RSVPs" ON public.event_rsvps;

CREATE POLICY "Public RSVPs Read Access" ON public.event_rsvps FOR SELECT USING (true);
CREATE POLICY "Public RSVPs Insert Access" ON public.event_rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "Public RSVPs Delete Access" ON public.event_rsvps FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 7. CREATE SWIPES & MATCHES TABLES (Campus Discovery Deck)
-- ------------------------------------------------------------------------------
CREATE TABLE public.swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  mode TEXT DEFAULT 'Relationship',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(swiper_id, target_id, mode)
);

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Swipes All Access" ON public.swipes;
DROP POLICY IF EXISTS "Allow users to insert swipes" ON public.swipes;
DROP POLICY IF EXISTS "Allow users to view their own swipes" ON public.swipes;
CREATE POLICY "Public Swipes All Access" ON public.swipes FOR ALL USING (true);

CREATE TABLE public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_mode TEXT DEFAULT 'Friendship',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(user1_id, user2_id, match_mode)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Matches All Access" ON public.matches;
DROP POLICY IF EXISTS "Allow users to view their matches" ON public.matches;
CREATE POLICY "Public Matches All Access" ON public.matches FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- 8. ENABLE SUPABASE REALTIME REPLICATION (Instant Peer Sync)
-- ------------------------------------------------------------------------------
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.profiles, 
    public.posts, 
    public.post_likes, 
    public.post_comments, 
    public.messages, 
    public.conversations, 
    public.events, 
    public.event_rsvps,
    public.swipes,
    public.matches;
COMMIT;

-- ------------------------------------------------------------------------------
-- 9. PROVISION STORAGE BUCKETS (Public Read & Write)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('post_images', 'post_images', true),
  ('event_posters', 'event_posters', true),
  ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old storage policies if existing
DROP POLICY IF EXISTS "Public Avatar Storage" ON storage.objects;
DROP POLICY IF EXISTS "Public Post Images Storage" ON storage.objects;
DROP POLICY IF EXISTS "Public Event Posters Storage" ON storage.objects;
DROP POLICY IF EXISTS "Public Chat Media Storage" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage All Access" ON storage.objects;

-- Create open storage policies
CREATE POLICY "Public Storage All Access" ON storage.objects
  FOR ALL USING (true) WITH CHECK (true);
