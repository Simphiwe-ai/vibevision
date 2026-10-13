"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import StreamPanel from "../../components/StreamPanel";
import { fetchVenue, type Venue } from "../../lib/api";

type Loaded = { id: string; result: Venue | "not-found" | "error" };

function VenueContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim() ?? "";

  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    fetchVenue(id).then((result) => {
      if (!cancelled) setLoaded({ id, result });
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const result: Venue | "not-found" | "error" | null = !id
    ? "not-found"
    : loaded && loaded.id === id
      ? loaded.result
      : null;

  return (
    <main className="vibevision-page">
      <SiteHeader />

      <section className="page-section venue-detail">
        {result === null ? (
          <div className="empty-state">
            <p>Loading venue...</p>
          </div>
        ) : result === "not-found" ? (
          <div className="empty-state">
            <p>We couldn&apos;t find that venue.</p>
            <Link href="/restaurants" className="button button-small">
              Back to venues
            </Link>
          </div>
        ) : result === "error" ? (
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

            <StreamPanel venueId={id} />
          </>
        )}
      </section>
    </main>
  );
}

export default function VenuePage() {
  return (
    <Suspense
      fallback={
        <main className="vibevision-page">
          <SiteHeader />
        </main>
      }
    >
      <VenueContent />
    </Suspense>
  );
}
