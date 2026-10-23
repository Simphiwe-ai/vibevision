import express, { Router, Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { hashStreamKey } from "./streamKey";

// Called only by the nginx streaming container, never by browsers.
const router = Router();

const PUBLIC_BASE = (
  process.env.STREAM_PUBLIC_BASE_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);

  return x.length === y.length && timingSafeEqual(x, y);
}

function secretOk(req: Request): boolean {
  const expected = process.env.RTMP_CALLBACK_SECRET;
  const given = typeof req.query.secret === "string" ? req.query.secret : "";

  return Boolean(expected && given && safeEqual(expected, given));
}

router.use((req: Request, res: Response, next: NextFunction) => {
  if (!secretOk(req)) return res.sendStatus(403);
  next();
});

// nginx-rtmp sends form-encoded POSTs, not JSON.
router.use(express.urlencoded({ extended: false, limit: "10kb" }));

function venueIdFromName(name: unknown): number | null {
  if (typeof name !== "string") return null;

  const match = /^venue-(\d+)$/.exec(name);

  return match ? Number(match[1]) : null;
}

// A broadcaster is trying to go live at rtmp://host/live/venue-<id>?key=<secret>.
// nginx sends the stream name as "name" and the query argument as "key".
router.post("/on-publish", async (req: Request, res: Response) => {
  const id = venueIdFromName(req.body?.name);
  const key = req.body?.key;

  if (id === null || typeof key !== "string" || key.length < 10 || key.length > 200) {
    return res.sendStatus(403);
  }

  try {
    const venue = await prisma.venue.findUnique({
      where: { id },
      select: { id: true, streamKeyHash: true },
    });

    if (!venue?.streamKeyHash || !safeEqual(venue.streamKeyHash, hashStreamKey(key))) {
      return res.sendStatus(403);
    }

    await prisma.venue.update({
      where: { id: venue.id },
      data: {
        isLive: true,
        streamUrl: `${PUBLIC_BASE}/hls/venue-${venue.id}.m3u8`,
      },
      select: { id: true },
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("RTMP on-publish failed:", error);
    return res.sendStatus(500);
  }
});

// The broadcaster disconnected. Always answer 200 so nginx is never blocked.
router.post("/on-done", async (req: Request, res: Response) => {
  const id = venueIdFromName(req.body?.name);

  if (id !== null) {
    try {
      await prisma.venue.updateMany({ where: { id }, data: { isLive: false } });
    } catch (error) {
      console.error("RTMP on-done failed:", error);
    }
  }

  return res.sendStatus(200);
});

export default router;
