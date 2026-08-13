"use client";

import { useState } from "react";
import Link from "next/link";

const venues = [
  {
    id: 1,
    name: "Vibe Lounge",
    location: "Johannesburg",
    type: "Restaurant & Pub",
    status: "LIVE",
  },
  {
    id: 2,
    name: "The Blue Pub",
    location: "Pretoria",
    type: "Pub",
    status: "OFFLINE",
  },
  {
    id: 3,
    name: "Sunset Restaurant",
    location: "Soweto",
    type: "Restaurant",
    status: "LIVE",
  },
];

export default function RestaurantsPage() {
  const [search, setSearch] = useState("");

  const filteredVenues = venues.filter((venue) =>
    venue.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="restaurants-page">
      <section className="restaurants-header">
        <h1>Restaurants & Pubs</h1>

        <p>
          Discover restaurants and pubs and watch their live atmosphere on
          VibeVision.
        </p>

        <input
          type="text"
          placeholder="Search restaurants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="restaurant-search"
        />
      </section>

      <section className="restaurant-grid">
        {filteredVenues.map((venue) => (
          <article className="restaurant-card" key={venue.id}>
            <div className="restaurant-image">
              <span className="restaurant-placeholder">
                {venue.name}
              </span>
            </div>

            <div className="restaurant-content">
              <h2>{venue.name}</h2>

              <p className="restaurant-type">
                {venue.type}
              </p>

              <p className="restaurant-location">
                📍 {venue.location}
              </p>

              <div className="restaurant-status">
                {venue.status === "LIVE" ? (
                  <span className="live-status">
                    🟢 LIVE
                  </span>
                ) : (
                  <span className="offline-status">
                    🔴 OFFLINE
                  </span>
                )}
              </div>

              <div className="restaurant-actions">
                {venue.status === "LIVE" ? (
                  <Link
                    href={`/livestream?id=${venue.id}`}
                    className="watch-button"
                  >
                    Watch Live
                  </Link>
                ) : (
                  <Link
                    href={`/restaurant/${venue.id}`}
                    className="details-button"
                  >
                    View Details
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}

        {filteredVenues.length === 0 && (
          <p className="no-results">
            No restaurants or pubs found.
          </p>
        )}
      </section>
    </main>
  );
}