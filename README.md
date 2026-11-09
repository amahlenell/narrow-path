# The Narrow Path

A private, two-person faith-based application for building consistency, strengthening connection, and growing together in faith. Follow a shared mountain path toward the cross through daily check-ins, meaningful milestones, grace-centred resets, and spiritual reflection.

Built with Next.js 15, TypeScript, Tailwind CSS, Supabase, Motion, and Lucide.

## Features

- **Shared journey:** An interactive mountain pathway with evolving scenery, animated characters, and a visual representation of shared progress.
- **Daily check-ins:** Mutual confirmation, Auckland-local dates, duplicate prevention, and a one-day grace period.
- **Streaks and milestones:** Shared streak tracking, lifetime statistics, milestone rewards, badges, and custom goals.
- **Grace-centred resets:** Reflect privately, confirm a fresh start, and continue the journey without losing earned badges.
- **Shared rewards:** Suggest rewards and vote together on milestones worth celebrating.
- **Journey history:** Calendar view of completed days, missed confirmations, and fresh starts.
- **Growing Together:** Curated scripture, devotionals, reflection questions, shared prayer lists, and encouragement for difficult days.
- **Live synchronisation:** Supabase Realtime keeps both partners' progress in sync.
- **Wedding countdown:** Optional countdown displayed once a date is configured.
- **Installable PWA:** Home-screen installation, app icons, and an offline page.
- **App lock:** Optional PIN protection with rate limiting.
- **Push notifications:** Notification preferences and web push infrastructure, requiring VAPID configuration for delivery.

## Tech Stack

Next.js 15, TypeScript, Tailwind CSS, Supabase Auth, PostgreSQL, Row Level Security, Supabase Realtime, Supabase Storage, Motion, and Lucide.

## Local Development

### Requirements

- Node.js and npm
- A Supabase project

### Setup

```bash
npm install
```

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` and `0002_push.sql` in the Supabase SQL Editor.
3. Configure the signup confirmation template to use:

   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`

4. Set the Supabase Site URL to `http://localhost:3000` and allow `http://localhost:3000/**` as a redirect.
5. Copy `.env.example` to `.env.local` and configure the Supabase URL and publishable key.
6. Optionally configure `PIN_COOKIE_SECRET` and the push notification variables.

Never expose a Supabase service-role key in the application.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The first person creates the couple and shares an invitation code. The second person joins using that code, and the shared journey begins.

## Verification

```bash
npm test
npm run test:db
npm run typecheck
npm run build
```

## Deployment

Deploy to Vercel by importing the private GitHub repository and configuring the required environment variables.

After deployment, update the Supabase Site URL and redirect URLs to match the production domain. Install the app on mobile using the browser's Add to Home Screen or Install App option.

See `docs/NOTIFICATIONS.md` for push notification setup and `docs/ARCHITECTURE.md` for the project structure.

## Security

- Row Level Security restricts access to each couple's data.
- Shared progress changes use database functions that validate permissions and check-in rules.
- Reflection notes are private to their author.
- PINs are bcrypt-hashed and rate-limited.
- Authentication sessions are validated on each request.

## Current Limitations

- Push notification delivery requires VAPID keys and real-device testing.
- Photo avatar storage policies are implemented, but the upload interface is not yet available.
- Type checking and production build verification remain outstanding.

## Project Structure

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the application structure and technical decisions.
