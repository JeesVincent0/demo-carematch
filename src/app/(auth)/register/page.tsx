import Link from 'next/link';
import { HeartHandshake, Stethoscope, ArrowRight } from 'lucide-react';
export const metadata = { title: 'Get started' };
export default function Register() {
  return (
    <>
      <p className="eyebrow">Welcome to CareMatch</p>
      <h1>How can we help?</h1>
      <p>Choose the journey that&apos;s right for you.</p>
      <Link href="/register/client" className="role-card">
        <HeartHandshake color="var(--primary)" size={30} />
        <h3>I&apos;m looking for care</h3>
        <p>Find compassionate professionals for yourself or someone you love.</p>
        <span className="text-link">
          Find your support <ArrowRight size={16} />
        </span>
      </Link>
      <Link href="/register/worker" className="role-card">
        <Stethoscope color="var(--primary)" size={30} />
        <h3>I&apos;m offering care</h3>
        <p>Share your experience and connect with people looking for thoughtful support.</p>
        <span className="text-link">
          Create your professional profile <ArrowRight size={16} />
        </span>
      </Link>
      <div className="auth-bottom">
        Already a member? <Link href="/login">Sign in</Link>
      </div>
    </>
  );
}
