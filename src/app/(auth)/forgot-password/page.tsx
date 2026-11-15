import { PasswordForm } from '@/components/forms';
export const metadata = { title: 'Reset your password' };
export default function Page() {
  return (
    <>
      <h1>Let&apos;s get you back in.</h1>
      <p>
        Enter your email to create a demo reset token. This browser-only demo displays the reset
        link instead of sending email.
      </p>
      <PasswordForm />
    </>
  );
}
