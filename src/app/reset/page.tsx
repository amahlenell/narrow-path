import { loadApp } from '@/lib/data';
import { ResetFlow } from '@/components/ResetFlow';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function ResetPage() {
  const app = await loadApp();
  return (
    <Shell active="/">
      <h1 className="mb-4 text-2xl">Report a reset</h1>
      <ResetFlow
        walked={app.walked}
        milestoneDays={app.milestoneDays}
        unlockedDays={app.unlockedDays}
        names={[app.me.name, app.partner?.name ?? 'Your partner']}
        resetCount={app.stats.resets}
      />
    </Shell>
  );
}
