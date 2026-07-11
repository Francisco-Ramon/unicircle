
CREATE TABLE public.whatsapp_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_phone TEXT NOT NULL,
  whatsapp_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  conversation_id UUID,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX whatsapp_connections_active_phone
  ON public.whatsapp_connections (whatsapp_phone)
  WHERE status = 'active';
CREATE INDEX whatsapp_connections_user_idx ON public.whatsapp_connections(user_id);

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own whatsapp connections select" ON public.whatsapp_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own whatsapp connections insert" ON public.whatsapp_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own whatsapp connections update" ON public.whatsapp_connections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own whatsapp connections delete" ON public.whatsapp_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER whatsapp_connections_touch
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.whatsapp_link_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_link_codes_user_idx ON public.whatsapp_link_codes(user_id);

ALTER TABLE public.whatsapp_link_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own whatsapp link codes select" ON public.whatsapp_link_codes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own whatsapp link codes insert" ON public.whatsapp_link_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own whatsapp link codes delete" ON public.whatsapp_link_codes
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.whatsapp_messages_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_message_id TEXT NOT NULL UNIQUE,
  whatsapp_phone TEXT,
  payload JSONB,
  status TEXT DEFAULT 'received',
  error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_messages_log ENABLE ROW LEVEL SECURITY;
-- no user policies; service role only
