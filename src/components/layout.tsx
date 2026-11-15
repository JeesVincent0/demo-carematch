'use client';
import { useEffect, useState } from 'react';
import { subscribeDemo } from '@/lib/demo/store';
import type { User } from '@/lib/demo/types';
import Link from 'next/link';
import { ArrowUpRight, Heart, Mail } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { Logo } from './shared';
import { MobileMenu } from './interactive';
import { Button } from './ui/button';
export function Header() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const refresh = () => {
      void currentUser().then(setUser);
    };
    refresh();
    return subscribeDemo(refresh);
  }, []);
  return (
    <>
      <div className="announcement">
        <span>Care that feels like home.</span> Compassionate care. Trusted professionals.{' '}
        <Link href="/how-it-works">
          Discover CareMatch <ArrowUpRight size={12} />
        </Link>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/find-care">Find care</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/services">Our services</Link>
            <Link href="/become-a-professional">For professionals</Link>
            <Link href="/about">About us</Link>
          </nav>
          <div className="header-actions">
            <Link href={user ? '/dashboard' : '/login'}>{user ? 'My dashboard' : 'Log in'}</Link>
            <Button asChild size="sm">
              <Link href="/register">
                Get started <ArrowUpRight size={15} />
              </Link>
            </Button>
          </div>
          <MobileMenu signedIn={!!user} />
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>
            Bringing compassionate people
            <br />
            and meaningful care together.
          </p>
          <span className="footer-made">
            <Heart size={14} /> Built around people, always.
          </span>
        </div>
        <div>
          <h4>Find your care</h4>
          <Link href="/find-care">Find a professional</Link>
          <Link href="/services">Explore our services</Link>
          <Link href="/how-it-works">How it works</Link>
        </div>
        <div>
          <h4>CareMatch</h4>
          <Link href="/about">Our story</Link>
          <Link href="/become-a-professional">Become a professional</Link>
          <Link href="/contact">Contact us</Link>
        </div>
        <div>
          <h4>Here to help</h4>
          <Link href="/faq">Common questions</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms of use</Link>
          <Link href="/contact" className="row">
            <Mail size={15} /> Contact the demo team
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} CareMatch. A demonstration platform.</span>
        <span>JSON demo · Changes stay in this browser · No payments</span>
      </div>
      <p className="demo-disclaimer">
        CareMatch is a browser-only JSON demonstration, not an emergency medical service. No real
        care is arranged and no external credential checks are performed.
      </p>
    </footer>
  );
}
export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
