import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RegistrationForm } from '@/components/forms';
export const metadata = { title: 'Create your account' };
export default async function Register({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!['client', 'worker'].includes(role)) notFound();
  return (
    <>
      <Link href="/register" className="text-link">
        ← Choose a different path
      </Link>
      <h1>{role === 'worker' ? 'Make a difference.' : 'Your care journey starts here.'}</h1>
      <p>
        {role === 'worker'
          ? 'Create your professional account. Your profile comes next.'
          : 'Create an account to find and save professionals and send care requests.'}
      </p>
      <RegistrationForm role={role === 'worker' ? 'WORKER' : 'CLIENT'} />
      <div className="auth-bottom">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </>
  );
}
