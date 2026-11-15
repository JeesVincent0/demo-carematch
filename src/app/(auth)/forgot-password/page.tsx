import { PasswordForm } from '@/components/forms';
export const metadata = { title: 'Reset your password' };
export default function Page() {
  return (
    <>
      <h1>Let&apos;s get you back in.</h1>
      <p>
        Enter your email to create a secure reset token. In local development, this demo displays
        the reset link instead of sending email.
      </p>
      <PasswordForm />
    </>
  );
}
