# Nightlife KE

A mobile-first Kenyan virtual nightlife platform by Imfezi Solutions.

## Stack
- Next.js 15 App Router + TypeScript
- Supabase Auth, Postgres, Storage and Realtime
- `@supabase/ssr` cookie-based sessions
- Tailwind CSS, PWA manifest foundation, Three.js and React Three Fiber

## Local setup
1. Use Node.js 22 or newer.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the Nightlife KE Supabase project's Connect panel.
4. Run `npm install`, then `npm run dev`.
5. Open `http://localhost:3000`.

Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable or commit credentials.

## Google OAuth
In Supabase Dashboard → Authentication → Providers, enable Google with OAuth credentials created in Google Cloud. Add `http://localhost:3000/auth/callback` and your production callback to the authorized redirect URIs. Configure the Supabase Site URL and allowed redirect URLs.

## Implemented foundation
- Public responsive landing page
- Google OAuth initiation and callback exchange
- Profile onboarding using `profiles` and `counties`
- County-based public club discovery across the seeded 47 counties
- Transactional club creation: creator becomes owner and five standard rooms are created atomically
- Public and invite-only clubs, with cryptographically random invitation codes stored as SHA-256 hashes
- Private invitation preview and server-side joining with age checks and serialized capacity enforcement (2–30 members)
- Club pages that only show room content to verified members
- Live room chat using Supabase Realtime Postgres Changes
- Private room Presence for chat participants; separate private movement Presence for avatar coordinates
- Club roster visible only to verified club members
- Owner/moderator member removal with role-based rules
- Member reports with reason categories and moderator review states
- Database-backed message length and rate limits
- Generated Supabase TypeScript database types
- Cookie-based Supabase session refresh
- Installable PWA foundation: web app manifest, SVG app icon, service-worker registration and network-first offline navigation fallback (service worker, installability checks and offline strategy still required)
- Discovery displays age verification state and treats unverified accounts as restricted

## Not production-enabled
- **Age verification:** No provider is integrated. Google OAuth is not proof of age. Do not mark users verified manually or allow club entry until a real provider and signed server-side webhook are implemented.
- **Club create/join:** Core transactional flows are implemented. Still needs end-to-end testing with verified test accounts and invitation abuse/rate-limit review.
- **Realtime privacy setting:** In Supabase Dashboard → Project Settings → Realtime Settings, turn OFF **Allow public access to channels** before testing private room Presence in production. The client uses private channels and RLS authorization policies are installed, but this dashboard toggle has not been changed by this repository.
- **Realtime chat/presence:** Code and database policies are committed/applied. Multi-account browser testing is still required; Presence shows who is connected but is not a reservation/seat-lock system.
- **3D rooms/avatars:** A Three.js / React Three Fiber nightclub scene is now implemented with low-data/high-quality rendering, keyboard and touch movement, dance styles, and private Realtime avatar position sharing. It still needs real multi-account browser testing, authoritative movement validation, collision refinement, optimized character assets and device profiling.
- **Music:** Commercial music requires appropriate rights/licensing.
- **Payments/credits:** PayHero credentials, callback validation, idempotency and ledger are not connected.
- **Safety operations:** Basic club reporting and moderator removal/review tools exist. Platform-wide blocking, escalation, moderator audit trails, spam controls and retention policies are still required before public launch.

The Supabase database was provisioned separately. Club-engine, chat-safety, roster, reporting and Realtime authorization SQL have been applied to the live project. Security and health advisors currently report no findings. The live schema is not yet fully reproducible from a clean Supabase CLI database: the repository still needs a complete baseline migration for the pre-existing core schema and earlier DJ migrations. The newest room-movement authorization migration is recorded in `supabase/migrations/`, but do not treat that single file as a complete database bootstrap.

A GitHub Actions workflow runs dependency installation, TypeScript checking and a production build on pushes and pull requests. The workflow now uses Node.js 22 to match the pinned Supabase client. Check the Actions tab for the latest result.


## DJ and music foundation

The club-room page includes a DJ console for club owners, moderators, and members with the `dj` role. Platform DJ eligibility is separately stored in `public.platform_djs`; a platform DJ must also be a member of the room's club. The Supabase schema, RLS policies, and Realtime publication changes are recorded in `supabase/changes/dj_music.sql`.

- Queue submissions require a source category and rights-evidence reference and remain `pending`.
- Only rights-approved queue entries are visible in the playable queue.
- Approval is intentionally an administrative rights-review operation; the app does not automatically approve a track just because a user supplied a license reference.
- Playback session state (selected approved track, play/pause/stop, timestamp and position metadata) synchronizes through Supabase Realtime.
- The UI does **not** stream audio. A licensed music provider or verified original/public-domain asset delivery integration, plus its contractual permissions, is required before audio playback can be enabled.
- No commercial music catalog, scraping, direct media URLs, or unlicensed audio source is integrated.

Platform DJ grants are currently managed by trusted database administration, not a public self-service control. Do not grant platform DJ status to users through client-side writes.


## 3D nightclub and avatars

The room now renders a genuine WebGL scene with Three.js through React Three Fiber. It includes a nightclub floor, DJ stage, lounge props, neon lighting, orbit camera controls, and low-data/high-quality rendering options. Keyboard and touch controls move the local avatar within clamped scene bounds. Dance styles animate the avatar, and a dedicated private Supabase Realtime presence topic shares movement coordinates with verified members in the same room. The movement topic has separate Realtime RLS policies and is recorded in `supabase/migrations/20261109175523_room_movement_presence_authorization.sql`.

Avatar appearance choices are saved to the user's own `profiles.avatar_config` field and remain constrained by the database check in `supabase/changes/avatar_customization.sql`. Remote movement payloads are treated as untrusted display data and clamped by receiving clients; this is not yet an authoritative anti-cheat movement service. Real browser multi-user tests, collision refinement, optimized GLB character assets, low-end Android profiling and the remaining room types/interactions are still required.


## Current development milestone

- Real-time WebGL nightclub scene and avatar movement code committed to `main`.
- Room entry now checks for a current verified age-verification record in addition to club membership. Until a provider is integrated, unverified users remain blocked.
- A separate private movement Presence topic is protected by database RLS and verified-room-membership checks.
- CI must be checked on the latest commit; do not assume it passes until the GitHub Actions run completes.


### PWA behaviour

The service worker caches only the static `/offline` fallback. It does not cache authenticated navigation, API responses, payment information or profile data. Navigation is network-first and displays the offline page when the network is unavailable. The manifest and SVG icon are present; test installation in supported browsers and verify the icon presentation on target Android devices.
