'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container section">
      <div className="empty">
        <h1>Let&apos;s try that again.</h1>
        <p>Something didn&apos;t load as expected. Your saved information is still there.</p>
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="text-link">
          Return to CareMatch
        </Link>
      </div>
    </main>
  );
}
