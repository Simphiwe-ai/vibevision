import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const prismaMock = vi.hoisted(() => ({
  venue: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../db", () => ({ prisma: prismaMock }));

import app from "../app";

const SECRET = "test-secret";

type Method = "GET" | "POST" | "PUT" | "DELETE";

function bearer(payload: { userId: number; accountType: string }) {
  const token = jwt.sign({ email: "user@example.com", ...payload }, SECRET, {
    expiresIn: "1h",
  });
  return `Bearer ${token}`;
}

const asViewer = () => bearer({ userId: 1, accountType: "viewer" });
const asAdmin = () => bearer({ userId: 99, accountType: "admin" });

function call(method: Method, path: string) {
  return request(app)[
    method.toLowerCase() as "get" | "post" | "put" | "delete"
  ](path);
}

const notFoundError = () =>
  Object.assign(new Error("Record not found"), { code: "P2025" });

const valid = { name: "Moon Bar", type: "pub", city: "Durban" };

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", SECRET);
  for (const fn of Object.values(prismaMock.venue)) fn.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin venue access control", () => {
  const routes: [Method, string][] = [
    ["GET", "/admin/venues"],
    ["GET", "/admin/venues/1"],
    ["POST", "/admin/venues"],
    ["PUT", "/admin/venues/1"],
    ["DELETE", "/admin/venues/1"],
  ];

  it.each(routes)("%s %s returns 401 without a token", async (method, path) => {
    const res = await call(method, path);

    expect(res.status).toBe(401);
  });

  it.each(routes)("%s %s returns 403 for a non-admin", async (method, path) => {
    const res = await call(method, path).set("Authorization", asViewer());

    expect(res.status).toBe(403);
    for (const fn of Object.values(prismaMock.venue)) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});

describe("GET /admin/venues", () => {
  it("returns every venue, including stream links, for an admin", async () => {
    prismaMock.venue.findMany.mockResolvedValue([
      { id: 1, name: "A", streamUrl: "https://example.com/live" },
    ]);
    const res = await request(app)
      .get("/admin/venues")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(200);
    expect(res.body[0].streamUrl).toBe("https://example.com/live");
    expect(prismaMock.venue.findMany.mock.calls[0][0].select).toBeUndefined();
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.venue.findMany.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .get("/admin/venues")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(500);
  });
});

describe("GET /admin/venues/:id", () => {
  it("returns the venue with its stream link", async () => {
    prismaMock.venue.findUnique.mockResolvedValue({
      id: 3,
      name: "X",
      streamUrl: "https://example.com/live",
    });
    const res = await request(app)
      .get("/admin/venues/3")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(200);
    expect(res.body.streamUrl).toBe("https://example.com/live");
    expect(prismaMock.venue.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
    });
  });

  it.each(["abc", "0", "-1", "1.5"])("returns 400 for the invalid id %s", async (id) => {
    const res = await request(app)
      .get(`/admin/venues/${id}`)
      .set("Authorization", asAdmin());

    expect(res.status).toBe(400);
    expect(prismaMock.venue.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the venue does not exist", async () => {
    prismaMock.venue.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get("/admin/venues/999")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(404);
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.venue.findUnique.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .get("/admin/venues/3")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(500);
  });
});

describe("POST /admin/venues", () => {
  it("creates a venue with trimmed values and a lower-case type", async () => {
    prismaMock.venue.create.mockResolvedValue({ id: 1 });
    const res = await request(app)
      .post("/admin/venues")
      .set("Authorization", asAdmin())
      .send({
        name: "  Moon Bar ",
        type: "PUB",
        city: " Durban ",
        address: " 1 Beach Rd ",
        streamUrl: "https://youtube.com/watch?v=abc",
        isLive: true,
      });

    expect(res.status).toBe(201);
    expect(prismaMock.venue.create).toHaveBeenCalledWith({
      data: {
        name: "Moon Bar",
        type: "pub",
        city: "Durban",
        address: "1 Beach Rd",
        streamUrl: "https://youtube.com/watch?v=abc",
        isLive: true,
      },
    });
  });

  it.each(["restaurant", "pub", "club"])("accepts the type %s", async (type) => {
    prismaMock.venue.create.mockResolvedValue({ id: 1 });
    const res = await request(app)
      .post("/admin/venues")
      .set("Authorization", asAdmin())
      .send({ ...valid, type });

    expect(res.status).toBe(201);
  });

  it("stores blank optional fields as null", async () => {
    prismaMock.venue.create.mockResolvedValue({ id: 1 });
    await request(app)
      .post("/admin/venues")
      .set("Authorization", asAdmin())
      .send({
        ...valid,
        address: "   ",
        description: null,
        streamUrl: "",
      });

    expect(prismaMock.venue.create).toHaveBeenCalledWith({
      data: {
        ...valid,
        address: null,
        description: null,
        streamUrl: null,
      },
    });
  });

  it("returns 400 when no body is sent at all", async () => {
    const res = await request(app)
      .post("/admin/venues")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(400);
    expect(prismaMock.venue.create).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty body", {}],
    ["a missing name", { type: "pub", city: "Durban" }],
    ["a blank name", { ...valid, name: "   " }],
    ["a name over 120 characters", { ...valid, name: "x".repeat(121) }],
    ["a missing city", { name: "Moon Bar", type: "pub" }],
    ["a missing type", { name: "Moon Bar", city: "Durban" }],
    ["an unknown type", { ...valid, type: "museum" }],
    ["a non-string type", { ...valid, type: 5 }],
    ["a non-string address", { ...valid, address: 5 }],
    ["a description over 2000 characters", { ...valid, description: "x".repeat(2001) }],
    ["a javascript: stream link", { ...valid, streamUrl: "javascript:alert(1)" }],
    ["a stream link that is not a URL", { ...valid, streamUrl: "not a url" }],
    ["an ftp: image link", { ...valid, imageUrl: "ftp://example.com/a.jpg" }],
    ["a non-boolean isLive", { ...valid, isLive: "yes" }],
  ])("returns 400 for %s", async (_label, body) => {
    const res = await request(app)
      .post("/admin/venues")
      .set("Authorization", asAdmin())
      .send(body);

    expect(res.status).toBe(400);
    expect(prismaMock.venue.create).not.toHaveBeenCalled();
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.venue.create.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .post("/admin/venues")
      .set("Authorization", asAdmin())
      .send(valid);

    expect(res.status).toBe(500);
  });
});

describe("PUT /admin/venues/:id", () => {
  it.each(["abc", "0", "-3", "2.5"])("returns 400 for the invalid id %s", async (id) => {
    const res = await request(app)
      .put(`/admin/venues/${id}`)
      .set("Authorization", asAdmin())
      .send({ name: "x" });

    expect(res.status).toBe(400);
    expect(prismaMock.venue.update).not.toHaveBeenCalled();
  });

  it("only updates the fields that were sent", async () => {
    prismaMock.venue.update.mockResolvedValue({ id: 5 });
    const res = await request(app)
      .put("/admin/venues/5")
      .set("Authorization", asAdmin())
      .send({ isLive: true });

    expect(res.status).toBe(200);
    expect(prismaMock.venue.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isLive: true },
    });
  });

  it("trims text and lower-cases the type", async () => {
    prismaMock.venue.update.mockResolvedValue({ id: 5 });
    await request(app)
      .put("/admin/venues/5")
      .set("Authorization", asAdmin())
      .send({ name: " New Name ", type: "CLUB" });

    expect(prismaMock.venue.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { name: "New Name", type: "club" },
    });
  });

  it("can clear optional fields", async () => {
    prismaMock.venue.update.mockResolvedValue({ id: 5 });
    await request(app)
      .put("/admin/venues/5")
      .set("Authorization", asAdmin())
      .send({ streamUrl: null, address: "" });

    expect(prismaMock.venue.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { streamUrl: null, address: null },
    });
  });

  it("returns 400 when there is nothing to update", async () => {
    const res = await request(app)
      .put("/admin/venues/5")
      .set("Authorization", asAdmin())
      .send({});

    expect(res.status).toBe(400);
    expect(prismaMock.venue.update).not.toHaveBeenCalled();
  });

  it.each([
    ["a blank name", { name: "  " }],
    ["an unknown type", { type: "museum" }],
    ["a stream link that is not a URL", { streamUrl: "nope" }],
    ["a non-boolean isLive", { isLive: "yes" }],
  ])("returns 400 for %s", async (_label, body) => {
    const res = await request(app)
      .put("/admin/venues/5")
      .set("Authorization", asAdmin())
      .send(body);

    expect(res.status).toBe(400);
    expect(prismaMock.venue.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the venue does not exist", async () => {
    prismaMock.venue.update.mockRejectedValue(notFoundError());
    const res = await request(app)
      .put("/admin/venues/999")
      .set("Authorization", asAdmin())
      .send({ name: "x" });

    expect(res.status).toBe(404);
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.venue.update.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .put("/admin/venues/5")
      .set("Authorization", asAdmin())
      .send({ name: "x" });

    expect(res.status).toBe(500);
  });
});

describe("DELETE /admin/venues/:id", () => {
  it("deletes the venue", async () => {
    prismaMock.venue.delete.mockResolvedValue({ id: 5 });
    const res = await request(app)
      .delete("/admin/venues/5")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
    expect(prismaMock.venue.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it.each(["abc", "0", "-3", "2.5"])("returns 400 for the invalid id %s", async (id) => {
    const res = await request(app)
      .delete(`/admin/venues/${id}`)
      .set("Authorization", asAdmin());

    expect(res.status).toBe(400);
    expect(prismaMock.venue.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the venue does not exist", async () => {
    prismaMock.venue.delete.mockRejectedValue(notFoundError());
    const res = await request(app)
      .delete("/admin/venues/999")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(404);
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.venue.delete.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .delete("/admin/venues/5")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(500);
  });
});
