import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import { fetchVenue } from "../../../lib/api";

export default async function VenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchVenue(id);

  if (result === "not-found") {
    notFound();
  }

  return (
    <main className="vibevision-page">
      <SiteHeader />

      <section className="page-section venue-detail">
        {result === "error" ? (
          <div className="empty-state">
            <p>We couldn&apos;t load this venue right now. Please try again soon.</p>
            <Link href="/restaurants" className="button button-small">
              Back to venues
            </Link>
          </div>
        ) : (
          <>
            <Link
              href={`/restaurants?location=${encodeURIComponent(result.city)}`}
              className="back-link"
            >
              ← Back to {result.city}
            </Link>

            <div className="venue-card-top">
              <span className="venue-type">{result.type}</span>
              {result.isLive && <span className="live-badge">● LIVE NOW</span>}
            </div>

            <h1 className="page-title">{result.name}</h1>
            <p className="venue-city">{result.city}</p>
            {result.address && (
              <p className="venue-address">{result.address}</p>
            )}
            {result.description && (
              <p className="venue-description">{result.description}</p>
            )}

            <div className="stream-panel">
              <h2>Live stream</h2>
              <p>
                Live streams are for members. Sign in or start your free trial
                to watch when this venue goes live.
              </p>
              <div className="hero-actions">
                <Link href="/login" className="button button-outline button-small">
                  Login
                </Link>
                <Link href="/createaccount" className="button button-small">
                  Start free trial
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
