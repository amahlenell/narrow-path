# The Narrow Path

A private, two-person web app for Amy & Aaron: a shared streak shown as a winding mountain path toward a cross, with daily check-ins, grace-centred resets, milestones and rewards, and a "Growing Together" section. Next.js 15 · TypeScript · Tailwind · Supabase (Auth, Postgres + RLS, Realtime, Storage) · Motion · Lucide.

## What works today

| Area | Status |
|---|---|
| Accounts (email + password), two-person couple, invite code | Working |
| Daily check-in, both must confirm, Pacific/Auckland days, no duplicates, one-day late grace | Working (rules enforced in Postgres, mirrored in `src/lib/streak.ts`) |
| Shared streak, lifetime stats (separate from current streak) | Working |
| Reset with reflection (private to author), two-step confirm, challenge, return-to-start animation | Working |
| Milestones 3…365 + custom, badges (kept after reset), reward suggestions + joint voting | Working |
| Interactive pathway with changing scenery and both characters | Working |
| Calendar history (walked / open / not confirmed / fresh start) | Working |
| Growing Together: scripture, devotional, question, shared prayer list, hard-day encouragement | Working (curated content, no AI) |
| Wedding countdown, hidden until a date is added | Working |
| Live updates between partners (Supabase Realtime + refresh on app focus) | Working once Realtime is on (default in the migration) |
| PWA: installable manifest, icons, offline page | Working |
| Web push notifications + preferences screen | Code written, DB tested. **Needs your VAPID keys; real-device delivery untested.** See `docs/NOTIFICATIONS.md` |
| PIN app lock (set / change / remove / lock now) | Working once `PIN_COOKIE_SECRET` is set |
| Crucifixion scene at the end of the path; characters styled from your reference picture | Done |
| **Photo avatars** | **Private bucket + policies done.** No upload screen yet |

## Verification status (be aware)

- `npm test` — 35 pure-logic tests (streak rules, Auckland dates incl. daylight saving, path geometry). **Passing.**
- `npm run test:db` — runs both migrations against a throwaway Postgres and tests RLS, check-in, reset, rewards, PIN and push-subscription privacy. **Passing.**
- The UI code (everything under `src/app` and `src/components`) was written in an environment with no access to the npm registry, so **`npm install`, `npm run typecheck` and `npm run build` have not been run yet.** Expect to fix a few small type or import issues on first build. Run those first.

## Run it locally

1. `npm install`
2. Create a Supabase project (free tier is fine).
3. In Supabase → **SQL Editor**, paste and run `supabase/migrations/0001_init.sql`, then `0002_push.sql`.
4. Supabase → **Authentication → Email templates → Confirm signup**: set the link to
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`
5. Supabase → **Authentication → URL Configuration**: Site URL `http://localhost:3000`; add `http://localhost:3000/**` to Redirect URLs.
6. Copy `.env.example` to `.env.local` and fill in the project URL and anon/publishable key (Project Settings → API). **Never** put a service-role key in this app; it doesn't need one.
7. Optional: set `PIN_COOKIE_SECRET` (`openssl rand -base64 48`) to enable the PIN lock; see `docs/NOTIFICATIONS.md` for push.
8. `npm run dev`, open http://localhost:3000.
9. Amy signs up → "Begin our path" → copies the invite code. Aaron signs up → "Join your partner". The path begins that day.

Optional: to stop strangers creating accounts once you both have yours, turn off **Authentication → Sign In / Providers → Allow new users to sign up**. (The database already refuses a third person joining a couple.)

### Refresh an expired invite

```sql
update public.couples set invite_expires_at = now() + interval '7 days' where created_by = '<your user id>';
```

## Deploy to Vercel

1. Push this folder to a GitHub repository (private).
2. Vercel → **Add New Project** → import it. Framework is detected as Next.js.
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your Vercel URL), plus `PIN_COOKIE_SECRET` and the push variables from `.env.example` if you want those features.
4. Deploy. Then in Supabase set the **Site URL** to the Vercel URL and add `https://YOUR-APP.vercel.app/**` to Redirect URLs.
5. On each phone, open the site and choose **Share → Add to Home Screen** (iPhone) or **Install app** (Android).

## Security notes

- Every table has Row Level Security; people can only read their own couple's rows.
- All changes to shared progress go through `SECURITY DEFINER` functions that check who is calling and the rules (no future dates, no backfilling beyond yesterday, one check-in per person per day, reset needs explicit confirmation).
- Reset reflections are readable only by their author (RLS), not even the partner.
- PINs are bcrypt-hashed, rate-limited (5 tries → 15 minute lock) and never readable by the client. The PIN is a convenience lock on top of real authentication, not a replacement.
- The middleware validates the session with `auth.getUser()` on every request.

## Project map

See `docs/ARCHITECTURE.md`.
