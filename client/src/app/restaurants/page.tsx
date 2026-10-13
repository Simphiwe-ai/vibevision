"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import {
  CITIES,
  VENUE_TYPES,
  fetchVenues,
  type Venue,
} from "../../lib/api";

type Filters = { location?: string; type?: string; q?: string };

function clean(value: string | null): string | undefined {
  return value && value.trim() ? value.trim() : undefined;
}

function href(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.location) params.set("location", filters.location);
  if (filters.type) params.set("type", filters.type);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return query ? `/restaurants?${query}` : "/restaurants";
}

function RestaurantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const location = clean(searchParams.get("location"));
  const type = clean(searchParams.get("type"));
  const q = clean(searchParams.get("q"));
  const filters: Filters = { location, type, q };
  const key = [location, type, q].join("|");

  const [result, setResult] = useState<{
    key: string;
    venues: Venue[] | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchVenues({ city: location, type, q }).then((venues) => {
      if (!cancelled) setResult({ key, venues });
    });

    return () => {
      cancelled = true;
    };
  }, [key, location, type, q]);

  const loading = result === null || result.key !== key;
  const venues = result ? result.venues : null;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("q");

    router.push(
      href({
        ...filters,
        q: typeof text === "string" && text.trim() ? text.trim() : undefined,
      }),
    );
  }

  return (
    <main className="vibevision-page">
      <SiteHeader />

      <section className="page-section">
        <div className="section-heading">
          <p className="eyebrow">DISCOVER THE VIBE</p>
          <h1 className="page-title">Restaurants, pubs &amp; nightlife</h1>
          <p>Pick a city, filter by type, or search by name.</p>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            key={q ?? ""}
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search venues..."
            aria-label="Search venues"
          />
          <button type="submit" className="button button-small">
            Search
          </button>
        </form>

        <div className="filter-row">
          <Link
            href={href({ ...filters, location: undefined })}
            className={`chip${!location ? " chip-active" : ""}`}
          >
            All cities
          </Link>
          {CITIES.map((city) => (
            <Link
              key={city}
              href={href({ ...filters, location: city })}
              className={`chip${
                location?.toLowerCase() === city.toLowerCase()
                  ? " chip-active"
                  : ""
              }`}
            >
              {city}
            </Link>
          ))}
        </div>

        <div className="filter-row">
          <Link
            href={href({ ...filters, type: undefined })}
            className={`chip${!type ? " chip-active" : ""}`}
          >
            All types
          </Link>
          {VENUE_TYPES.map((option) => (
            <Link
              key={option.value}
              href={href({ ...filters, type: option.value })}
              className={`chip${type === option.value ? " chip-active" : ""}`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading venues...</p>
          </div>
        ) : venues === null ? (
          <div className="empty-state">
            <p>We couldn&apos;t load venues right now. Please try again soon.</p>
          </div>
        ) : venues.length === 0 ? (
          <div className="empty-state">
            <p>No venues match your search yet.</p>
            <Link href="/restaurants" className="button button-small">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="venue-grid">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venue?id=${venue.id}`}
                className="venue-card"
              >
                <div className="venue-card-top">
                  <span className="venue-type">{venue.type}</span>
                  {venue.isLive && <span className="live-badge">● LIVE</span>}
                </div>
                <h3>{venue.name}</h3>
                <p className="venue-city">{venue.city}</p>
                {venue.address && (
                  <p className="venue-address">{venue.address}</p>
                )}
                {venue.description && (
                  <p className="venue-description">{venue.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense
      fallback={
        <main className="vibevision-page">
          <SiteHeader />
        </main>
      }
    >
      <RestaurantsContent />
    </Suspense>
  );
}
