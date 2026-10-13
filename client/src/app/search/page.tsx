import Link from "next/link";

export default function Page() {
  return (
    <main className="vibevision-page">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">COMING SOON</p>
          <h1>
            <span>Search</span>
          </h1>
          <p className="hero-description">This page is under construction.</p>
          <div className="hero-actions">
            <Link href="/" className="button">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
