import { env } from '@/lib/config';

/** Placeholder route proving the scaffold runs; replaced by the real pages from M3 onwards. */
export function Hello() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Task Management</h1>
      <p className="text-text-muted mt-2">
        The web app is running. API: <code>{env.VITE_API_URL}</code>
      </p>
    </main>
  );
}
