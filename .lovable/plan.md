## Gmail + Google Calendar Integration for Mr. Cisco

Both integrations share one OAuth flow (Gmail + Calendar scopes requested together) using the existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` secrets. UI layout is preserved — the existing "Coming soon" rows in Settings become live cards. Inbox and Calendar pages keep their structure but switch from mock data to real data when connected (mock fallback if not).

---

### 1. Database (one migration)

New tables, all with RLS (`auth.uid() = user_id`):

- **`google_connections`** — single row per user, holds tokens for both Gmail + Calendar (one OAuth grant covers both):
  - `id`, `user_id` (unique), `google_email`, `access_token`, `refresh_token`, `expiry` (timestamptz), `scopes` (text[]), `status`, `connected_at`, `updated_at`
- **`gmail_drafts`** — store generated drafts before user approval:
  - `id`, `user_id`, `gmail_message_id` (nullable, source email), `to`, `subject`, `body`, `status` ('pending'|'discarded'|'sent'), `created_at`
- **`pending_calendar_events`** — events awaiting approval:
  - `id`, `user_id`, `title`, `description`, `start_time`, `end_time`, `status` ('pending'|'approved'|'created'|'rejected'), `google_event_id`, `created_at`

Tokens stored server-side only; never selectable from the client (RLS allows select by owner, but client code never reads `access_token`/`refresh_token` — only edge functions do via service role).

### 2. Edge Functions

All under `supabase/functions/`, all with `verify_jwt = true` except the OAuth callback which Google calls directly. Shared helper `_google/client.ts` handles token refresh.

- **`google-oauth-start`** (auth required) — builds Google consent URL with combined scopes (`gmail.readonly`, `gmail.compose`, `calendar.readonly`, `calendar.events`), `access_type=offline`, `prompt=consent`, encodes `user_id` in `state` (HMAC-signed).
- **`google-oauth-callback`** (`verify_jwt = false`) — Google redirects here with `code` + `state`. Verifies state HMAC, exchanges code for tokens, fetches user email from `userinfo`, upserts into `google_connections`, then redirects browser back to `/settings?google=connected`.
- **`google-status`** — returns `{ connected, email, scopes, gmail_ok, calendar_ok }`.
- **`google-disconnect`** — deletes the connection row.
- **`gmail-api`** — single dispatcher with `action` field:
  - `list_unread` → `GET messages?q=is:unread&maxResults=20` then batch-fetch headers
  - `get_email` → `GET messages/{id}?format=full`, parse subject/from/body
  - `summarize_inbox` → fetches unread, calls Lovable AI Gateway (`google/gemini-2.5-flash`) with the system prompt asking for clear summary + urgency detection + suggested actions
  - `draft_reply` → fetches the source email, calls AI to generate a reply, stores in `gmail_drafts` with `status='pending'`, returns the draft. **Never sends.**
- **`calendar-api`** — single dispatcher:
  - `list_today` → `GET calendars/primary/events` for today
  - `list_upcoming` → next 7 days
  - `find_free_time` → fetches today's events, computes gaps inside working hours (09:00–18:00 default)
  - `create_event` → requires `{ approved: true }` flag; inserts into `pending_calendar_events` first, then calls Google `events.insert` only if approved, and updates row + logs to `activity_logs`.

All functions use service-role Supabase client to load tokens, auto-refresh if `expiry < now()+60s` using `refresh_token`, and persist refreshed token back.

### 3. `agent-chat` updates

Replace mock email/calendar tool implementations with real ones that call the new edge functions internally (or inline the same logic). New/updated tools:

- `list_unread_emails`, `get_email`, `summarize_inbox`, `draft_reply` (Gmail)
- `list_today_events`, `list_upcoming_events`, `find_free_time`, `propose_calendar_event` (stores pending event, returns it for confirmation), `create_calendar_event` (requires `approved: true`)

System prompt updated: before any `create_calendar_event`, Mr. Cisco must ask "Do you want me to add this to your calendar?" and only call with `approved: true` after explicit "yes". Drafts are shown to user, never sent.

If the user has no Google connection, tools return `{ error: "not_connected", hint: "Ask the user to connect Google in Settings." }` and Mr. Cisco prompts them.

### 4. UI Changes (no layout redesign)

- **`src/routes/_app.settings.tsx`** — replace the two "Coming soon" rows (Gmail, Google Calendar) with a single **Google card** (since one OAuth covers both) showing:
  - Status (connected email + which scopes granted)
  - "Connect Google" button → calls `google-oauth-start`, redirects to returned URL
  - "Reconnect (re-authorize scopes)" + "Disconnect" buttons
  - Detects `?google=connected` query param on mount → toast + refresh status
- **`src/routes/_app.inbox.tsx`** — same card layout, but data source switches to `gmail-api list_unread` when connected. Adds "Summarize Inbox" button at top, "Generate Reply" button on each email opens a draft preview modal with Approve/Discard (Approve just saves; nothing is sent).
- **`src/routes/_app.calendar.tsx`** — keeps the Today's events / Free time two-column layout, but populates from `calendar-api`. Adds "Suggest schedule" and "Create study session" buttons — both create a `pending_calendar_events` row and show a confirm dialog before calling `create_event` with `approved: true`.

A small Mock-data badge stays visible only when not connected.

### 5. Google Cloud Console steps (user must do once)

1. Add scopes to the OAuth consent screen: `gmail.readonly`, `gmail.compose`, `calendar.readonly`, `calendar.events`, `userinfo.email`.
2. Verify the redirect URI matches `GOOGLE_REDIRECT_URI` secret = `https://hyrmyaggzozcwxjvziwk.supabase.co/functions/v1/google-oauth-callback`.
3. While in Testing mode, add the user's Google account as a Test user.

(The current `GOOGLE_REDIRECT_URI` secret will be used as-is. If it currently points at `gmail-oauth-callback`, we'll either rename our function to match or ask you to update the secret + Google Console — I'll confirm which after reading the secret value during build.)

### 6. Security notes

- `access_token`/`refresh_token` only ever read inside edge functions using service role.
- `state` parameter HMAC-signed with `SUPABASE_SERVICE_ROLE_KEY` to prevent CSRF on the OAuth callback.
- All Google API calls are server-side; the frontend only ever sees parsed/sanitized results.
- RLS isolates every table by `user_id`.
- No auto-send of email; no auto-create of calendar events without `approved: true`.

### Files touched

```
supabase/migrations/<new>.sql         (new tables + RLS)
supabase/config.toml                  (verify_jwt=false for google-oauth-callback)
supabase/functions/_google/client.ts  (new shared helper)
supabase/functions/google-oauth-start/index.ts        (new)
supabase/functions/google-oauth-callback/index.ts     (new)
supabase/functions/google-status/index.ts             (new)
supabase/functions/google-disconnect/index.ts         (new)
supabase/functions/gmail-api/index.ts                 (new)
supabase/functions/calendar-api/index.ts              (new)
supabase/functions/agent-chat/index.ts                (replace mock tools)
src/lib/google.ts                                     (new client wrapper)
src/routes/_app.settings.tsx                          (Google card)
src/routes/_app.inbox.tsx                             (real data + draft modal)
src/routes/_app.calendar.tsx                          (real data + approval flow)
```

Reply **Approve** to build, or tell me what to change (e.g. split Gmail and Calendar into separate cards, or use only Gmail scopes for now).