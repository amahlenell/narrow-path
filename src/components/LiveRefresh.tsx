'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Keeps both partners in step: when the other person checks in (or a reset is
// reported) the page re-fetches from the server. Falls back gracefully — if
// Realtime is unavailable the page still refreshes when the app regains focus.
export function LiveRefresh({ coupleId }: { coupleId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => router.refresh();
    const tables = ['check_ins', 'journeys', 'resets', 'milestone_unlocks', 'couple_members'];

    let channel = supabase.channel(`couple-${coupleId}`);
    for (const table of tables) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `couple_id=eq.${coupleId}` },
        refresh,
      );
    }
    channel.subscribe();

    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [coupleId, router]);

  return null;
}
