export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl">You’re offline</h1>
      <p className="mt-3 text-forest/70">
        Your path is still there. Reconnect and we’ll pick up right where you left off — your check-ins are
        only saved when you’re online, so nothing is lost or counted twice.
      </p>
    </main>
  );
}
