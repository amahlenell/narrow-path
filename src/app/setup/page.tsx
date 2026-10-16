import { redirect } from 'next/navigation';
import { SetupForms } from '@/components/Forms';
import { createClient } from '@/lib/supabase/server';

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membership) redirect('/');

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 py-10">
      <h1 className="text-3xl">Welcome</h1>
      <p className="mb-6 mt-2 text-forest/70">
        This is a private space for exactly two people. Only you and your partner will ever see what’s inside.
      </p>
      <SetupForms />
    </main>
  );
}
