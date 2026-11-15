import Link from 'next/link';
import { LoginForm } from '@/components/forms';
export const metadata = { title: 'Welcome back' };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const p = await searchParams;
  return (
    <>
      <p className="eyebrow">Good to see you again</p>
      <h1>Welcome back.</h1>
      <p>Sign in to continue your CareMatch journey.</p>
      <LoginForm callbackUrl={p.callbackUrl} demo={true} />
      <div className="auth-bottom">
        New to CareMatch? <Link href="/register">Create an account</Link>
      </div>
    </>
  );
}
