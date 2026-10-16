# Architecture

## Routes

| Route | Purpose |
|---|---|
| `/login` | Sign in / create account (public) |
| `/auth/callback` | Email-confirmation link target |
| `/setup` | Create a couple or join with an invite code |
| `/` | Dashboard: streak, pathway, check-in, verse, stats, wedding card |
| `/reset` | Reflect → confirm → return-to-start flow |
| `/milestones` | Checkpoints, rewards, voting, custom milestones |
| `/history` | Month calendar + list of fresh starts |
| `/growing` | Growing Together |
| `/offline` | Shown by the service worker when offline |

## Layers

```
supabase/migrations/0001_init.sql   source of truth: tables, RLS, RPCs
src/lib/streak.ts, dates.ts         pure rules (display side of what Postgres enforces)
src/lib/pathgeometry.ts             pathway curve + couple position
src/lib/data.ts                     loadApp(): one RLS-scoped read for all pages
src/app/actions.ts                  server actions → Supabase RPCs
src/components/                     UI (Pathway, CheckInCard, ResetFlow, …)
src/content/                        curated scripture, milestone copy, devotionals
```

## Data model

`couples` (timezone, invite, wedding_date) ← `couple_members` (max 2, one couple per user) ← `journeys` (one open at a time; a reset closes it and opens the next **tomorrow**) ← `check_ins` (unique per user+day). A day counts as walked only when every member has a check-in for it (`journey_days_walked`). `resets` store days walked at the time; `reset_reflections` are author-only. `milestones` (+ `milestone_unlocks`, which survive resets), `reward_suggestions`, `reward_votes`, `prayer_intentions`, `app_locks`, `push_subscriptions`.

## Rules worth remembering

- A missed day never resets anything. Only a confirmed reset does.
- Either partner may confirm today, or yesterday (flagged late).
- A reset ends the journey today; the new one starts tomorrow, so a day is never both "slip" and "honoured".
- Rewards are only chosen by both partners backing the same suggestion. Nothing is purchased.
