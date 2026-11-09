# Nightlife KE

A mobile-first Kenyan virtual nightlife platform by Imfezi Solutions.

## Stack
- Next.js 15 App Router + TypeScript
- Supabase Auth, Postgres, Storage and Realtime
- `@supabase/ssr` cookie-based sessions
- Tailwind CSS and PWA manifest foundation

## Local setup
1. Use Node.js 20.9+.
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
- County-based public club discovery
- Cookie-based Supabase session refresh
- PWA manifest starter
- Discovery displays age verification state and treats unverified accounts as restricted

## Not production-enabled
- **Age verification:** No provider is integrated. Google OAuth is not proof of age. Do not mark users verified manually or allow club entry until a real provider and signed server-side webhook are implemented.
- **Club create/join:** Needs transactional server-side flows for owner membership, capacity enforcement, invitation-code hashing and room creation.
- **Realtime chat/presence:** Database publication is enabled; subscriptions, moderation and rate limits remain to be implemented.
- **3D rooms/avatars/DJ audio:** Rendering and audio architecture, device testing and performance budgets remain open.
- **Music:** Commercial music requires appropriate rights/licensing.
- **Payments/credits:** PayHero credentials, callback validation, idempotency and ledger are not connected.
- **Safety operations:** Reporting, blocking, spam controls and retention policies are required before public launch.

The Supabase database was provisioned separately. Direct SQL changes are not yet represented as versioned migration files in this repository. Generate and review migrations before relying on reproducible environments.
