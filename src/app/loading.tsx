export default function Loading() {
  return (
    <main id="main" className="container section">
      <div className="skeleton" style={{ height: 44, width: '60%', marginBottom: 25 }} />
      <div className="professional-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 300 }} />
        ))}
      </div>
      <p className="small muted" role="status" style={{ marginTop: 20 }}>
        Finding your next connection…
      </p>
    </main>
  );
}
