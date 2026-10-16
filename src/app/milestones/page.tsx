import { loadApp } from '@/lib/data';
import { MilestoneList } from '@/components/MilestoneList';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function MilestonesPage() {
  const app = await loadApp();
  return (
    <Shell active="/milestones">
      <h1 className="text-2xl">Milestones</h1>
      <p className="mb-5 mt-1 text-sm text-forest/70">
        Checkpoints along the path. Badges you’ve earned stay yours, even after a reset.
      </p>
      <MilestoneList
        coupleId={app.coupleId}
        userId={app.userId}
        walked={app.walked}
        milestones={app.milestones}
        unlockedDays={app.unlockedDays}
        suggestions={app.suggestions}
      />
    </Shell>
  );
}
