import { redirect } from 'next/navigation';
import { LockForm } from '@/components/PinForms';
import { createClient } from '@/lib/supabase/server';
import { isUnlocked, pinLockConfigured } from '@/lib/pinlock';
import { signOut } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function LockPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: hasPin } = await supabase.rpc('has_pin');
  if (!hasPin || (await isUnlocked(user.id))) redirect('/');

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10 text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-sage">The Narrow Path</p>
      <h1 className="mt-2 text-3xl">Welcome back</h1>
      <p className="mb-6 mt-2 text-forest/70">Enter your PIN to open your path.</p>
      {pinLockConfigured() ? (
        <LockForm />
      ) : (
        <p role="alert" className="rounded-2xl bg-peach-soft px-4 py-3 text-sm text-terracotta-deep">
          The server is missing its PIN_COOKIE_SECRET setting, so the PIN can’t be checked. See the README.
        </p>
      )}
      <form action={signOut} className="mt-8">
        <button className="text-sm text-forest/60 underline underline-offset-4">Forgot your PIN? Sign out and sign back in</button>
      </form>
    </main>
  );
}
