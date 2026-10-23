import { generateStreamKey, hashStreamKey } from "./streamKey";
import { Router, Request, Response } from "express";
import { prisma } from "./db";

// Mounted in app.ts behind authenticateToken and requireAdmin,
// so every route in this file is admin-only.
const router = Router();

const VENUE_TYPES = ["restaurant", "pub", "club"];

type VenueInput = {
  name?: string;
  type?: string;
  city?: string;
  address?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  streamUrl?: string | null;
  isLive?: boolean;
};

type ParseResult =
  | { ok: true; data: VenueInput }
  | { ok: false; error: string };

const requiredText = [
  ["name", 120],
  ["city", 80],
] as const;

const optionalText = [
  ["address", 200],
  ["description", 2000],
] as const;

const urlFields = ["imageUrl", "streamUrl"] as const;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isBlank(value: unknown): boolean {
  return value === null || (typeof value === "string" && !value.trim());
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2025"
  );
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// requireAll is true when creating a venue and false when updating one.
function parseVenue(body: unknown, requireAll: boolean): ParseResult {
  const input = (body ?? {}) as Record<string, unknown>;
  const data: VenueInput = {};

  for (const [field, max] of requiredText) {
    const value = input[field];

    if (value === undefined) {
      if (requireAll) return { ok: false, error: `${field} is required.` };
      continue;
    }

    if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
      return { ok: false, error: `${field} must be 1 to ${max} characters.` };
    }

    data[field] = value.trim();
  }

  if (input.type === undefined) {
    if (requireAll) return { ok: false, error: "type is required." };
  } else {
    const type =
      typeof input.type === "string" ? input.type.trim().toLowerCase() : "";

    if (!VENUE_TYPES.includes(type)) {
      return { ok: false, error: "type must be restaurant, pub or club." };
    }

    data.type = type;
  }

  for (const [field, max] of optionalText) {
    const value = input[field];

    if (value === undefined) continue;

    if (isBlank(value)) {
      data[field] = null;
      continue;
    }

    if (typeof value !== "string" || value.trim().length > max) {
      return { ok: false, error: `${field} must be at most ${max} characters.` };
    }

    data[field] = value.trim();
  }

  for (const field of urlFields) {
    const value = input[field];

    if (value === undefined) continue;

    if (isBlank(value)) {
      data[field] = null;
      continue;
    }

    if (
      typeof value !== "string" ||
      value.trim().length > 500 ||
      !isHttpUrl(value.trim())
    ) {
      return {
        ok: false,
        error: `${field} must be a valid http or https link.`,
      };
    }

    data[field] = value.trim();
  }

  if (input.isLive !== undefined) {
    if (typeof input.isLive !== "boolean") {
      return { ok: false, error: "isLive must be true or false." };
    }

    data.isLive = input.isLive;
  }

  return { ok: true, data };
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const venues = await prisma.venue.findMany({
      omit: { streamKeyHash: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return res.json(venues);
  } catch (error) {
    console.error("Fetching venues (admin) failed:", error);

    return res.status(500).json({ error: "Failed to fetch venues." });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = parseId(String(req.params.id));

  if (id === null) {
    return res.status(400).json({ error: "Invalid venue ID." });
  }

  try {
    const venue = await prisma.venue.findUnique({
      where: { id },
      omit: { streamKeyHash: true },
    });

    if (!venue) {
      return res.status(404).json({ error: "Venue not found." });
    }

    return res.json(venue);
  } catch (error) {
    console.error("Fetching venue (admin) failed:", error);

    return res.status(500).json({ error: "Failed to fetch venue." });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = parseVenue(req.body, true);

  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  const { name, type, city, ...rest } = parsed.data;

  try {
    const venue = await prisma.venue.create({
      omit: { streamKeyHash: true },
      data: {
        name: name as string,
        type: type as string,
        city: city as string,
        ...rest,
      },
    });

    return res.status(201).json(venue);
  } catch (error) {
    console.error("Creating venue failed:", error);

    return res.status(500).json({ error: "Failed to create venue." });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = parseId(String(req.params.id));

  if (id === null) {
    return res.status(400).json({ error: "Invalid venue ID." });
  }

  const parsed = parseVenue(req.body, false);

  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "Nothing to update." });
  }

  try {
    const venue = await prisma.venue.update({
      omit: { streamKeyHash: true },
      where: { id },
      data: parsed.data,
    });

    return res.json(venue);
  } catch (error) {
    if (isNotFound(error)) {
      return res.status(404).json({ error: "Venue not found." });
    }

    console.error("Updating venue failed:", error);

    return res.status(500).json({ error: "Failed to update venue." });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = parseId(String(req.params.id));

  if (id === null) {
    return res.status(400).json({ error: "Invalid venue ID." });
  }

  try {
    await prisma.venue.delete({ where: { id } });

    return res.json({ message: "Venue deleted successfully." });
  } catch (error) {
    if (isNotFound(error)) {
      return res.status(404).json({ error: "Venue not found." });
    }

    console.error("Deleting venue failed:", error);

    return res.status(500).json({ error: "Failed to delete venue." });
  }
});


// Generates (or rotates) a venue's stream key. The real key is returned
// once and only its hash is stored, so it can never be shown again.
router.post("/:id/stream-key", async (req: Request, res: Response) => {
  const id = parseId(String(req.params.id));

  if (id === null) {
    return res.status(400).json({ error: "Invalid venue ID." });
  }

  const streamKey = generateStreamKey();

  try {
    await prisma.venue.update({
      where: { id },
      data: { streamKeyHash: hashStreamKey(streamKey) },
      select: { id: true },
    });

    return res.json({
      streamKey,
      message: "Copy this key now. It will not be shown again.",
    });
  } catch (error) {
    if (isNotFound(error)) {
      return res.status(404).json({ error: "Venue not found." });
    }

    console.error("Generating stream key failed:", error);

    return res.status(500).json({ error: "Failed to generate stream key." });
  }
});

// Revokes a venue's stream key, so nobody can broadcast for it.
router.delete("/:id/stream-key", async (req: Request, res: Response) => {
  const id = parseId(String(req.params.id));

  if (id === null) {
    return res.status(400).json({ error: "Invalid venue ID." });
  }

  try {
    await prisma.venue.update({
      where: { id },
      data: { streamKeyHash: null },
      select: { id: true },
    });

    return res.json({ message: "Stream key revoked." });
  } catch (error) {
    if (isNotFound(error)) {
      return res.status(404).json({ error: "Venue not found." });
    }

    console.error("Revoking stream key failed:", error);

    return res.status(500).json({ error: "Failed to revoke stream key." });
  }
});

export default router;
