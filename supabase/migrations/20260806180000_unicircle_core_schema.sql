-- ========================================================
-- UNICIRCLE PLATFORM CORE DATABASE SCHEMA
-- Migration: 20260806180000_unicircle_core_schema.sql
-- ========================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- --------------------------------------------------------
-- 1. UNIVERSITIES TABLE (Admin Managed)
-- --------------------------------------------------------
create table if not exists public.universities (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  short_name text not null,
  country text not null default 'South Africa',
  city text not null,
  logo_url text,
  banner_url text,
  email_domains text[] default '{}',
  verified_students_count integer default 0,
  active_users_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.universities enable row level security;

create policy "Allow public read access to universities"
  on public.universities for select
  using (true);

-- --------------------------------------------------------
-- 2. PROFILES TABLE (Linked to auth.users)
-- --------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text not null,
  last_name text,
  dob date,
  gender text check (gender in ('Male', 'Female', 'Non-binary', 'Other')),
  orientation text check (orientation in ('Straight', 'Gay', 'Lesbian', 'Bisexual', 'Queer', 'Other')),
  interested_in text check (interested_in in ('Female', 'Male', 'Everyone')),
  relationship_goal text default 'Friendship', -- Dating, Long-Term, Marriage, Study Partner, Networking, Friendship
  university_id uuid references public.universities(id) on delete set null,
  university_name text not null,
  faculty text,
  course text,
  year_of_study text not null, -- 1st Year, 2nd Year, 3rd Year, 4th Year, Postgraduate
  height text,
  bio text,
  lifestyle jsonb default '{}'::jsonb, -- smoking, drinking, pets, workout, sleep_habit
  interests text[] default '{}',
  languages text[] default '{}',
  photos text[] default '{}',
  is_verified boolean default false,
  verification_score float default 0.0,
  is_online boolean default false,
  last_active timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "Allow public read access to verified student profiles"
  on public.profiles for select
  using (true);

create policy "Allow users to insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Allow users to update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- --------------------------------------------------------
-- 3. DISCOVERY PREFERENCES TABLE
-- --------------------------------------------------------
create table if not exists public.discovery_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  mode text default 'Friendship' check (mode in ('Friendship', 'Relationship', 'Study Partners', 'Networking')),
  min_age integer default 18,
  max_age integer default 30,
  max_distance_km integer default 50,
  same_university_only boolean default false,
  verified_only boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.discovery_preferences enable row level security;

create policy "Allow users to manage their discovery preferences"
  on public.discovery_preferences for all
  using (auth.uid() = user_id);

-- --------------------------------------------------------
-- 4. SWIPES TABLE (Interactions)
-- --------------------------------------------------------
create table if not exists public.swipes (
  id uuid default gen_random_uuid() primary key,
  swiper_id uuid references public.profiles(id) on delete cascade not null,
  target_id uuid references public.profiles(id) on delete cascade not null,
  action text not null check (action in ('like', 'pass', 'superlike')),
  mode text not null default 'Relationship',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(swiper_id, target_id, mode)
);

alter table public.swipes enable row level security;

create policy "Allow users to insert swipes"
  on public.swipes for insert
  with check (auth.uid() = swiper_id);

create policy "Allow users to view their own swipes"
  on public.swipes for select
  using (auth.uid() = swiper_id);

-- --------------------------------------------------------
-- 5. MATCHES TABLE (Bi-directional Mutual Interest)
-- --------------------------------------------------------
create table if not exists public.matches (
  id uuid default gen_random_uuid() primary key,
  user1_id uuid references public.profiles(id) on delete cascade not null,
  user2_id uuid references public.profiles(id) on delete cascade not null,
  match_mode text not null default 'Friendship',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user1_id, user2_id, match_mode)
);

alter table public.matches enable row level security;

create policy "Allow users to view their matches"
  on public.matches for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- --------------------------------------------------------
-- 6. MESSAGES TABLE (Chat)
-- --------------------------------------------------------
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  message_type text default 'text' check (message_type in ('text', 'image', 'voice')),
  media_url text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.messages enable row level security;

create policy "Allow users to read their own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Allow users to send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- --------------------------------------------------------
-- 7. EVENTS TABLE
-- --------------------------------------------------------
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text not null check (category in ('Party', 'Hackathon', 'Concert', 'Workshop', 'Sports', 'Study', 'Other')),
  category_emoji text default '🎉',
  category_color text default 'from-purple-600 to-indigo-600',
  cover_photo text not null,
  event_date date not null,
  event_time text not null,
  venue text not null,
  university_name text not null,
  organizer_id uuid references public.profiles(id) on delete cascade not null,
  registration_link text,
  contact_info text,
  tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.events enable row level security;

create policy "Allow public read access to events"
  on public.events for select
  using (true);

create policy "Allow verified users to create events"
  on public.events for insert
  with check (auth.uid() is not null);

-- --------------------------------------------------------
-- 8. EVENT RSVPS TABLE
-- --------------------------------------------------------
create table if not exists public.event_rsvps (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'going' check (status in ('going', 'interested')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(event_id, user_id)
);

alter table public.event_rsvps enable row level security;

create policy "Allow public read access to RSVPs"
  on public.event_rsvps for select
  using (true);

create policy "Allow users to manage their RSVPs"
  on public.event_rsvps for all
  using (auth.uid() = user_id);

-- --------------------------------------------------------
-- 9. COMMUNITY POSTS TABLE
-- --------------------------------------------------------
create table if not exists public.community_posts (
  id uuid default gen_random_uuid() primary key,
  university_name text not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text default 'General',
  image_url text,
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.community_posts enable row level security;

create policy "Allow public read access to community posts"
  on public.community_posts for select
  using (true);

create policy "Allow authenticated users to create posts"
  on public.community_posts for insert
  with check (auth.uid() = author_id);

-- --------------------------------------------------------
-- 10. POST REACTIONS TABLE
-- --------------------------------------------------------
create table if not exists public.post_reactions (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reaction_type text default 'like',
  unique(post_id, user_id)
);

alter table public.post_reactions enable row level security;

create policy "Allow public read access to post reactions"
  on public.post_reactions for select
  using (true);

create policy "Allow users to manage post reactions"
  on public.post_reactions for all
  using (auth.uid() = user_id);

-- --------------------------------------------------------
-- 11. AUTOMATIC PROFILE CREATION TRIGGER
-- --------------------------------------------------------
create or replace function public.handle_new_unicircle_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, university_name, year_of_study)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'display_name', 'Student'),
    coalesce(new.raw_user_meta_data->>'university_name', 'University of Nairobi'),
    coalesce(new.raw_user_meta_data->>'year_of_study', '1st Year')
  )
  on conflict (id) do nothing;

  insert into public.discovery_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_auth_user_created_unicircle on auth.users;
create trigger on_auth_user_created_unicircle
  after insert on auth.users
  for each row execute function public.handle_new_unicircle_user();
