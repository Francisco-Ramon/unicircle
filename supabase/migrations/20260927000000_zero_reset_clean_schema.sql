-- ==============================================================================
-- UNICIRCLE PLATFORM: COMPLETE NUCLEAR RESET TO ZERO (WIPES EVERYTHING)
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yztsnjnogiiblezrxqox/sql/new
--
-- This nukes the entire public schema (all tables, all policies, all triggers),
-- recreates a clean public schema, and builds the tables without policy conflicts.
-- ==============================================================================

-- 1. NUCLEAR WIPE OF ALL OLD TABLES, POLICIES, AND CONSTRAINTS
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Grant standard Supabase permissions to the fresh schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

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

CREATE TABLE public.post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

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

CREATE TABLE public.event_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'going',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(event_id, user_id)
);

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

CREATE TABLE public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_mode TEXT DEFAULT 'Friendship',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(user1_id, user2_id, match_mode)
);

-- ------------------------------------------------------------------------------
-- 8. GRANT FULL PERMISSIONS (ZERO Restrictive Policies / Zero Blockers)
-- ------------------------------------------------------------------------------
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 9. ENABLE REALTIME BROADCASTING ON ALL TABLES
-- ------------------------------------------------------------------------------
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;

-- ------------------------------------------------------------------------------
-- 10. PROVISION STORAGE BUCKETS (Public Read & Write)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('post_images', 'post_images', true),
  ('event_posters', 'event_posters', true),
  ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove any old storage policies entirely & grant full public access
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Storage All Access" ON storage.objects;
  DROP POLICY IF EXISTS "Public Avatar Storage" ON storage.objects;
  DROP POLICY IF EXISTS "Public Post Images Storage" ON storage.objects;
  DROP POLICY IF EXISTS "Public Event Posters Storage" ON storage.objects;
  DROP POLICY IF EXISTS "Public Chat Media Storage" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE POLICY "Public Storage All Access" ON storage.objects
  FOR ALL USING (true) WITH CHECK (true);
