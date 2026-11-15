import Image from 'next/image';
import { Logo } from '@/components/shared';
export const metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="auth-page">
      <aside className="auth-story">
        <Image
          src="/images/care-hero.jpg"
          alt="A moment of companionship"
          fill
          priority
          sizes="50vw"
        />
        <Logo />
        <div className="auth-story-copy">
          <h2>
            Care begins with
            <br />a connection.
          </h2>
          <p>
            A little support can make a world of difference. Find the people who make everyday life
            feel a little easier.
          </p>
          <small>
            Browser-only JSON demo. Sign-in is simulated, not secure authentication. Use fictional
            information only.
          </small>
        </div>
      </aside>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
