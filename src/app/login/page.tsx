import { AuthForm } from '@/components/Forms';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-sage">Amy &amp; Aaron</p>
        <h1 className="mt-2 text-4xl">The Narrow Path</h1>
        <p className="mt-3 text-forest/70">Walking toward Christ, side by side.</p>
      </div>
      <AuthForm confirmFailed={error === 'confirm'} />
    </main>
  );
}
