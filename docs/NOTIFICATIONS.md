# Notifications

Everything here is **opt-in**, chosen separately on each device in **Settings → Notifications**.

| Notification | Triggered by | Needs |
|---|---|---|
| Partner checked in | Your partner's check-in (server action) | VAPID keys |
| Milestone reached | Your partner's check-in unlocks a checkpoint | VAPID keys |
| Evening reminder | Hourly scheduler, at the person's chosen hour (NZ time), only if they haven't checked in | VAPID keys + scheduler + service-role key |
| Morning scripture (8am) | Hourly scheduler | same |
| Milestone is close (8am, one day away) | Hourly scheduler | same |

## Setup

1. `npm run vapid` → copy the keys into `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and set `VAPID_SUBJECT=mailto:you@yourdomain`.
2. Run `supabase/migrations/0002_push.sql` in the Supabase SQL editor.
3. Redeploy. On each phone: open the app → Settings → *Turn on notifications on this device* → *Send a test*.
4. For the scheduled ones, add `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` (any 16+ random characters) in Vercel, then call
   `GET https://YOUR-APP/api/cron/reminders` **every hour** with the header `Authorization: Bearer <CRON_SECRET>`.
   - Vercel Hobby cron can only run once a day, so use a free scheduler such as cron-job.org (supports custom headers), or Vercel Pro (`vercel.json` crons send the header automatically).

The partner-checked-in and milestone notifications use no service-role key: a database function returns only your partner's subscriptions, and only if they opted in. The service-role key is used by the cron route alone.

## Testing locally

The service worker only registers in production builds: run `npm run build && npm start` and open http://localhost:3000 (localhost counts as a secure context for push).

## Platform notes

- **iPhone/iPad (iOS 16.4+):** push only works after *Share → Add to Home Screen* and opening from the icon. The settings screen explains this when it detects it.
- Android and desktop Chrome/Edge/Firefox work in the browser. Safari on macOS 13+ works.
- Unsupported browsers see a plain explanation; the app works fully without notifications.

## Honest status

Subscription, preferences, sending and the service-worker handlers are written, and the database side is tested (`npm run test:db`). **Actual delivery to a real phone has not been tested**, because that needs your keys, a deployed HTTPS site and a device. Use the *Send a test* button first.
