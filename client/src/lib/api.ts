export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Venue = {
  id: number;
  name: string;
  type: string;
  city: string;
  address: string | null;
  description: string | null;
  imageUrl: string | null;
  isLive: boolean;
};

export const CITIES = [
  "Johannesburg",
  "Soweto",
  "Sandton",
  "Pretoria",
  "Durban",
  "Cape Town",
  "Bloemfontein",
  "Polokwane",
  "East London",
  "Gqeberha",
];

export const VENUE_TYPES = [
  { value: "restaurant", label: "Restaurants" },
  { value: "pub", label: "Pubs" },
  { value: "club", label: "Clubs" },
];

type VenueFilters = { city?: string; type?: string; q?: string };

// Returns null when the backend can't be reached or returns an error.
export async function fetchVenues(
  filters: VenueFilters = {},
): Promise<Venue[] | null> {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.type) params.set("type", filters.type);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();

  try {
    const res = await fetch(`${API_URL}/venues${query ? `?${query}` : ""}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Venue[];
  } catch {
    return null;
  }
}

export async function fetchVenue(
  id: string,
): Promise<Venue | "not-found" | "error"> {
  try {
    const res = await fetch(`${API_URL}/venues/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 400) return "not-found";
    if (!res.ok) return "error";
    return (await res.json()) as Venue;
  } catch {
    return "error";
  }
}
