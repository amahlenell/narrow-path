import 'server-only';
import webpush from 'web-push';

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

let ready = false;
function init() {
  if (ready) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  ready = true;
}

/**
 * Sends one notification to each target. Never throws: a failed push must
 * never break a check-in. `gone` lists endpoints the browser says no longer
 * exist (so a caller with the right access can clean them up).
 */
export async function sendPush(
  targets: readonly PushTarget[],
  payload: PushPayload,
): Promise<{ sent: number; gone: string[] }> {
  if (!pushConfigured() || targets.length === 0) return { sent: 0, gone: [] };
  init();
  const body = JSON.stringify({ url: '/', ...payload });
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, body, {
          TTL: 60 * 60 * 12,
        });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(t.endpoint);
      }
    }),
  );
  return { sent, gone };
}
