import { PasswordForm } from '@/components/forms';
export const metadata = { title: 'Choose a new password' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <>
      <h1>A fresh start.</h1>
      <p>Choose a strong password for your CareMatch account.</p>
      <PasswordForm token={token || 'invalid'} />
    </>
  );
}
