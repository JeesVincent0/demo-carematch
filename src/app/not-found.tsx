import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="container section">
      <div className="empty">
        <p className="eyebrow">A little detour</p>
        <h1>This page isn&apos;t available.</h1>
        <p>The profile may no longer be listed, or this link may have changed.</p>
        <Link className="btn btn-primary" href="/find-care">
          Explore care professionals
        </Link>
        <Link className="text-link" href="/">
          Back to CareMatch
        </Link>
      </div>
    </main>
  );
}
