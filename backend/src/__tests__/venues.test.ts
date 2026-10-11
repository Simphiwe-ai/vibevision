import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";
import request from "supertest";

const prismaMock = vi.hoisted(() => ({
  venue: { findMany: vi.fn(), findUnique: vi.fn() },
}));

vi.mock("../db", () => ({ prisma: prismaMock }));

import app from "../app";

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  prismaMock.venue.findMany.mockReset();
  prismaMock.venue.findUnique.mockReset();
});

describe("GET /venues", () => {
  it("lists venues without needing a token", async () => {
    prismaMock.venue.findMany.mockResolvedValue([{ id: 1, name: "A" }]);
    const res = await request(app).get("/venues");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("never selects the stream URL", async () => {
    prismaMock.venue.findMany.mockResolvedValue([]);
    await request(app).get("/venues");

    const { select } = prismaMock.venue.findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty("streamUrl");
    expect(select).toMatchObject({ name: true, city: true, isLive: true });
  });

  it("applies no filters when none are given", async () => {
    prismaMock.venue.findMany.mockResolvedValue([]);
    await request(app).get("/venues");

    expect(prismaMock.venue.findMany.mock.calls[0][0].where).toEqual({});
  });

  it("filters by city, ignoring case", async () => {
    prismaMock.venue.findMany.mockResolvedValue([]);
    await request(app).get("/venues?city=durban");

    expect(prismaMock.venue.findMany.mock.calls[0][0].where.city).toEqual({
      equals: "durban",
      mode: "insensitive",
    });
  });

  it("filters by type, ignoring case", async () => {
    prismaMock.venue.findMany.mockResolvedValue([]);
    await request(app).get("/venues?type=PUB");

    expect(prismaMock.venue.findMany.mock.calls[0][0].where.type).toBe("pub");
  });

  it("returns 400 for an unknown type", async () => {
    const res = await request(app).get("/venues?type=museum");

    expect(res.status).toBe(400);
    expect(prismaMock.venue.findMany).not.toHaveBeenCalled();
  });

  it("searches name, description and city with q", async () => {
    prismaMock.venue.findMany.mockResolvedValue([]);
    await request(app).get("/venues?q=grill");

    expect(prismaMock.venue.findMany.mock.calls[0][0].where.OR).toHaveLength(3);
  });

  it("ignores blank filters", async () => {
    prismaMock.venue.findMany.mockResolvedValue([]);
    await request(app).get("/venues?city=%20%20&q=");

    expect(prismaMock.venue.findMany.mock.calls[0][0].where).toEqual({});
  });

  it("combines city, type and search together", async () => {
    prismaMock.venue.findMany.mockResolvedValue([]);
    await request(app).get("/venues?city=Durban&type=pub&q=tap");

    const { where } = prismaMock.venue.findMany.mock.calls[0][0];
    expect(where.city).toBeDefined();
    expect(where.type).toBe("pub");
    expect(where.OR).toHaveLength(3);
  });

  it("lists live venues first, then by name", async () => {
    prismaMock.venue.findMany.mockResolvedValue([]);
    await request(app).get("/venues");

    expect(prismaMock.venue.findMany.mock.calls[0][0].orderBy).toEqual([
      { isLive: "desc" },
      { name: "asc" },
    ]);
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.venue.findMany.mockRejectedValue(new Error("db down"));
    const res = await request(app).get("/venues");

    expect(res.status).toBe(500);
  });
});

describe("GET /venues/:id", () => {
  it("returns the venue, without the stream URL", async () => {
    prismaMock.venue.findUnique.mockResolvedValue({ id: 3, name: "X" });
    const res = await request(app).get("/venues/3");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("X");
    const args = prismaMock.venue.findUnique.mock.calls[0][0];
    expect(args.where).toEqual({ id: 3 });
    expect(args.select).not.toHaveProperty("streamUrl");
  });

  it.each(["abc", "0", "-1", "1.5"])("returns 400 for the invalid id %s", async (id) => {
    const res = await request(app).get(`/venues/${id}`);

    expect(res.status).toBe(400);
    expect(prismaMock.venue.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the venue does not exist", async () => {
    prismaMock.venue.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/venues/999");

    expect(res.status).toBe(404);
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.venue.findUnique.mockRejectedValue(new Error("db down"));
    const res = await request(app).get("/venues/3");

    expect(res.status).toBe(500);
  });
});
