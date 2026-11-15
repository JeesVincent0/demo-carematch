import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import './fonts.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'),
  title: {
    default: 'CareMatch | Find Trusted Care Professionals in the UK',
    template: '%s | CareMatch',
  },
  description:
    'Discover nurses, carers and healthcare professionals with CareMatch. Explore profiles and request care for your loved ones across the UK.',
  openGraph: {
    title: 'CareMatch — Compassionate care. Trusted professionals.',
    description:
      'A thoughtful way to explore care and connect with professionals. Demonstration platform.',
    images: ['/images/care-hero.jpg'],
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
