
-- google_connections: per-user OAuth tokens (Gmail + Calendar in one grant)
CREATE TABLE public.google_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  google_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own google connection select" ON public.google_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own google connection delete" ON public.google_connections
  FOR DELETE USING (auth.uid() = user_id);
-- INSERT/UPDATE done by service role only (no policy on purpose)
CREATE TRIGGER google_connections_touch
  BEFORE UPDATE ON public.google_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- gmail_drafts: AI-generated replies awaiting approval
CREATE TABLE public.gmail_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gmail_message_id TEXT,
  thread_id TEXT,
  to_addr TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gmail_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own drafts all" ON public.gmail_drafts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_gmail_drafts_user ON public.gmail_drafts(user_id, created_at DESC);

-- pending_calendar_events: events awaiting approval
CREATE TABLE public.pending_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pending events all" ON public.pending_calendar_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_pending_events_user ON public.pending_calendar_events(user_id, created_at DESC);
