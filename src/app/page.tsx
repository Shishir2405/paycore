import { redirect } from 'next/navigation';

/** Middleware normally handles "/", but keep a server redirect as a fallback. */
export default function RootPage() {
  redirect('/dashboard');
}
