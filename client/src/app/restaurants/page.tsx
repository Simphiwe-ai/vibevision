import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import { CITIES, VENUE_TYPES, fetchVenues } from "../../lib/api";

type RawParams = { [key: string]: string | string[] | undefined };
type Filters = { location?: string; type?: string; q?: string };

function first(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  return text && text.trim() ? text.trim() : undefined;
}

function href(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.location) params.set("location", filters.location);
  if (filters.type) params.set("type", filters.type);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return query ? `/restaurants?${query}` : "/restaurants";
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const raw = await searchParams;
  const filters: Filters = {
    location: first(raw.location),
    type: first(raw.type),
    q: first(raw.q),
  };

  const venues = await fetchVenues({
    city: filters.location,
    type: filters.type,
    q: filters.q,
  });

  return (
    <main className="vibevision-page">
      <SiteHeader />

      <section className="page-section">
        <div className="section-heading">
          <p className="eyebrow">DISCOVER THE VIBE</p>
          <h1 className="page-title">Restaurants, pubs &amp; nightlife</h1>
          <p>Pick a city, filter by type, or search by name.</p>
        </div>

        <form action="/restaurants" className="search-form">
          {filters.location && (
            <input type="hidden" name="location" value={filters.location} />
          )}
          {filters.type && (
            <input type="hidden" name="type" value={filters.type} />
          )}
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
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
            className={`chip${!filters.location ? " chip-active" : ""}`}
          >
            All cities
          </Link>
          {CITIES.map((city) => (
            <Link
              key={city}
              href={href({ ...filters, location: city })}
              className={`chip${
                filters.location?.toLowerCase() === city.toLowerCase()
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
            className={`chip${!filters.type ? " chip-active" : ""}`}
          >
            All types
          </Link>
          {VENUE_TYPES.map((type) => (
            <Link
              key={type.value}
              href={href({ ...filters, type: type.value })}
              className={`chip${
                filters.type === type.value ? " chip-active" : ""
              }`}
            >
              {type.label}
            </Link>
          ))}
        </div>

        {venues === null ? (
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
                href={`/restaurants/${venue.id}`}
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
