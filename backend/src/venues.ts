import { Router, Request, Response } from "express";
import { prisma } from "./db";

const router = Router();

const VENUE_TYPES = ["restaurant", "pub", "club"];
const insensitive = "insensitive" as const;

// Public responses never include streamUrl. Streams will be gated
// behind login and the free trial in a later step.
const publicVenueSelect = {
  id: true,
  name: true,
  type: true,
  city: true,
  address: true,
  description: true,
  imageUrl: true,
  isLive: true,
  createdAt: true,
};

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

router.get("/", async (req: Request, res: Response) => {
  const city = cleanString(req.query.city);
  const type = cleanString(req.query.type)?.toLowerCase();
  const search = cleanString(req.query.q);

  if (type && !VENUE_TYPES.includes(type)) {
    return res.status(400).json({
      error: "Type must be restaurant, pub or club.",
    });
  }

  try {
    const venues = await prisma.venue.findMany({
      where: {
        ...(city ? { city: { equals: city, mode: insensitive } } : {}),
        ...(type ? { type } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: insensitive } },
                { description: { contains: search, mode: insensitive } },
                { city: { contains: search, mode: insensitive } },
              ],
            }
          : {}),
      },
      select: publicVenueSelect,
      orderBy: [{ isLive: "desc" }, { name: "asc" }],
      take: 100,
    });

    return res.json(venues);
  } catch (error) {
    console.error("Fetching venues failed:", error);

    return res.status(500).json({
      error: "Failed to fetch venues.",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid venue ID." });
  }

  try {
    const venue = await prisma.venue.findUnique({
      where: { id },
      select: publicVenueSelect,
    });

    if (!venue) {
      return res.status(404).json({ error: "Venue not found." });
    }

    return res.json(venue);
  } catch (error) {
    console.error("Fetching venue failed:", error);

    return res.status(500).json({
      error: "Failed to fetch venue.",
    });
  }
});

export default router;
