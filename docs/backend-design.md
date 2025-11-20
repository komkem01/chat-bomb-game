# Chat Bomb Backend & Data Design

This document summarizes the data model, backend responsibilities, and request/response flows for the Vercel-hosted Node.js backend that talks to Supabase Postgres directly.

## High-level Requirements

1. **No authentication** – players simply enter a display name that is stored in `localStorage`.
2. **Room lifecycle** – any player can host a game (auto-generates a 6-digit `room_id`). Other players join via this code.
3. **Real-time chat + eliminations** – chatting is live; if a player types the trap word, their message is flagged and they are marked eliminated immediately.
4. **Owner controls** – hosts can close the room or reset it for a fresh round.

## Entities & Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `rooms` | Stores metadata about a room session | `room_id`, `owner_id`, `status`, `bomb_word`, `hint`, `setter_id`, timestamps |
| `room_players` | Tracks players that have joined a room and their elimination status | `room_id`, `player_id`, `player_name`, `is_eliminated`, `joined_at` |
| `messages` | Chat history with boom markers | `room_id`, `sender_id`, `sender_name`, `message_text`, `is_boom`, `created_at` |

> See `database/schema.sql` for the SQL definitions, indexes, and realtime publication configuration.

### Status Machine

- `IDLE`: Room exists but no round is active. Host can define trap word + hint.
- `PLAYING`: Round active. Messages flow, eliminations happen.
- `CLOSED`: Room terminated by host. Clients listening to the room should exit.

## Backend Modules

All mutations now flow through Next.js API routes (Node.js serverless functions on Vercel) so that database credentials never reach the browser:

- `lib/server/db.ts` – PG connection pool that reuses a single client across hot reloads.
- `lib/server/roomService.ts` – pure data-service layer that implements the domain logic (create/join room, update settings, chat, close/reset) using SQL queries that match `database/schema.sql`.
- `lib/server/httpHelpers.ts` & `lib/server/errors.ts` – shared utilities for consistent JSON responses and typed HTTP errors.

`lib/supabase.ts` now only boots the Supabase JS client for realtime subscriptions; every read/write (except realtime) calls the internal API endpoints via `fetch`.

### API surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rooms` | POST | Create a room (optionally with preferred 6-digit code) and auto-register the host |
| `/api/rooms/join` | POST | Join/add a player to a room |
| `/api/rooms/[roomId]` | GET | Fetch room + players + messages snapshot |
| `/api/rooms/[roomId]/settings` | POST | Host defines trap word + hint, resets round state |
| `/api/messages` | POST | Send a chat message; backend evaluates boom logic and eliminates players |
| `/api/rooms/[roomId]/close` | POST | Host-only action to close a room |
| `/api/rooms/[roomId]/reset` | POST | Host-only action to reset a room to `IDLE` without leaving |

All endpoints return the canonical `RoomData` payload so the client can optimistically update if desired.

## Client ↔ Database Flow

| User Action | Supabase Calls | Notes |
|-------------|----------------|-------|
| Enter Display Name | none | Name stored in `localStorage` only.
| Host room | `createRoom` | Generates new numeric code. Success navigates to `/game/[code]`.
| Join room | `getRoomData` → `addPlayerToRoom` (if not already) | Renders error if code invalid or room closed.
| Start round | `updateRoomSettings` | Only host/setter accessible; sets trap word and hint.
| Send chat message | `/api/messages` | Server evaluates `is_boom` by comparing lower-cased message text with the stored `bomb_word`.
| Close room | `closeRoom` | All listeners see `status === 'CLOSED'` and exit.
| Reset game | `resetGame` | Optional UI entry to restart without leaving room.

## Security Considerations

- Project uses the **anon** Supabase key, so RLS rules should be crafted if the project evolves beyond prototype. Current SQL enables realtime publication but no RLS.
- Database credentials live exclusively on the server (Vercel). Clients never touch the Postgres connection string or service-role key.
- Supabase realtime is still used purely for subscriptions, so every mutation performed via the Node.js backend instantly streams back to listeners.
- Player identity relies on a generated `userId` stored in memory/localStorage; tampering is possible but acceptable for casual gameplay.

## Future Backend Enhancements

- Persist generated `userId` in `localStorage` so reconnects keep the same identity.
- Implement RLS policies (e.g., allow insert/update/delete when `auth.uid()` matches `player_id`), or move to service-role functions.
- Add serverless endpoints for analytics, match history, etc.

This backend plan satisfies the requirement of name-only entry, supports room creation/join via Supabase, and keeps the logic straightforward for future iteration.