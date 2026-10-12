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
import bcrypt from "bcryptjs";

const prismaMock = vi.hoisted(() => ({
  user: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  venue: { findUnique: vi.fn() },
  post: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../db", () => ({ prisma: prismaMock }));

import app, { authenticateToken, requireActiveTrial } from "../app";
import express from "express";

const SECRET = "test-secret";

function bearer(
  payload: { userId: number; accountType: string },
  options: jwt.SignOptions = {},
) {
  const token = jwt.sign({ email: "user@example.com", ...payload }, SECRET, {
    expiresIn: "1h",
    ...options,
  });
  return `Bearer ${token}`;
}

const asViewer = (userId = 1) => bearer({ userId, accountType: "viewer" });
const asAdmin = () => bearer({ userId: 99, accountType: "admin" });

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", SECRET);
  for (const model of Object.values(prismaMock)) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public routes", () => {
  it("GET / reports that the API is running", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "VibeVision API is running!" });
  });

  it("GET /api/test responds with a success message", async () => {
    const res = await request(app).get("/api/test");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/successful/);
  });
});

describe("authentication middleware", () => {
  it("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(401);
  });

  it("returns 401 when the header has no token part", async () => {
    const res = await request(app).get("/users").set("Authorization", "Bearer");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a malformed token", async () => {
    const res = await request(app)
      .get("/users")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(403);
  });

  it("returns 403 for an expired token", async () => {
    const res = await request(app)
      .get("/users")
      .set(
        "Authorization",
        bearer({ userId: 1, accountType: "admin" }, { expiresIn: -10 }),
      );
    expect(res.status).toBe(403);
  });

  it("returns 403 for a token signed with a different secret", async () => {
    const forged = jwt.sign(
      { userId: 1, accountType: "admin" },
      "some-other-secret",
    );
    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(403);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it("returns 500, not access, when JWT_SECRET is not configured", async () => {
    const header = asAdmin();
    vi.stubEnv("JWT_SECRET", "");
    const res = await request(app).get("/users").set("Authorization", header);
    expect(res.status).toBe(500);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /users (registration)", () => {
  const valid = {
    fullName: "  Sam Mokoena ",
    email: " Sam@Example.COM ",
    password: "Password123",
  };

  const createdUser = {
    id: 1,
    fullName: "Sam Mokoena",
    email: "sam@example.com",
    phone: null,
    accountType: "viewer",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(createdUser);
  });

  it("creates a viewer with trimmed name, lower-cased email and hashed password", async () => {
    const res = await request(app).post("/users").send(valid);

    expect(res.status).toBe(201);
    const { data } = prismaMock.user.create.mock.calls[0][0];
    expect(data).toMatchObject({
      fullName: "Sam Mokoena",
      email: "sam@example.com",
      accountType: "viewer",
    });
    expect(data.passwordHash).not.toBe(valid.password);
    expect(await bcrypt.compare(valid.password, data.passwordHash)).toBe(true);
  });

  it("checks for an existing account using the normalised email", async () => {
    await request(app).post("/users").send(valid);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "sam@example.com" },
    });
  });

  it("never selects or returns the password hash", async () => {
    // This mock behaves like Prisma: it returns only the fields in `select`,
    // and returns everything (including the hash) if `select` is missing.
    prismaMock.user.create.mockImplementation(async ({ data, select }) => {
      const saved: Record<string, unknown> = {
        id: 1,
        fullName: data.fullName,
        email: data.email,
        phone: null,
        accountType: data.accountType,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: data.passwordHash,
      };
      return Object.fromEntries(
        Object.entries(select ?? saved)
          .filter(([, on]) => on)
          .map(([key]) => [key, saved[key]]),
      );
    });

    const res = await request(app).post("/users").send(valid);

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty("passwordHash");
  });

  it("ignores an accountType supplied by the caller", async () => {
    await request(app)
      .post("/users")
      .send({ ...valid, accountType: "admin" });

    const { data } = prismaMock.user.create.mock.calls[0][0];
    expect(data.accountType).toBe("viewer");
  });

  it("accepts a password of exactly 8 characters", async () => {
    const res = await request(app)
      .post("/users")
      .send({ ...valid, password: "12345678" });
    expect(res.status).toBe(201);
  });

  it("returns 409 when the email is already registered", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 5 });
    const res = await request(app).post("/users").send(valid);

    expect(res.status).toBe(409);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns 400 when no body is sent at all", async () => {
    const res = await request(app).post("/users");
    expect(res.status).toBe(400);
  });

  it.each([
    ["an empty body", {}],
    ["a missing full name", { email: "a@b.com", password: "Password123" }],
    ["a blank full name", { fullName: "   ", email: "a@b.com", password: "Password123" }],
    ["a missing email", { fullName: "Sam", password: "Password123" }],
    ["a blank email", { fullName: "Sam", email: " ", password: "Password123" }],
    ["a missing password", { fullName: "Sam", email: "a@b.com" }],
    ["a password shorter than 8 characters", { fullName: "Sam", email: "a@b.com", password: "short12" }],
    ["a non-string password", { fullName: "Sam", email: "a@b.com", password: 12345678 }],
  ])("returns 400 for %s", async (_label, body) => {
    const res = await request(app).post("/users").send(body);

    expect(res.status).toBe(400);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.user.create.mockRejectedValue(new Error("db down"));
    const res = await request(app).post("/users").send(valid);
    expect(res.status).toBe(500);
  });

  it.each([
    "not-an-email",
    "missing-at.example.com",
    "two@@example.com",
    "no-dot@example",
    "spaces in@example.com",
  ])("returns 400 for the malformed email %s", async (email) => {
    const res = await request(app).post("/users").send({ ...valid, email });

    expect(res.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it.todo("returns 409 when two signups race and hit the unique constraint");
});

describe("POST /auth/login", () => {
  const passwordHash = bcrypt.hashSync("correct-password", 4);
  const dbUser = {
    id: 7,
    fullName: "Sam",
    email: "sam@example.com",
    passwordHash,
    accountType: "viewer",
    trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
  };

  it("returns a signed token and the user, without the hash, for valid credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "sam@example.com", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 7,
      fullName: "Sam",
      email: "sam@example.com",
      accountType: "viewer",
      trial: {
        endsAt: dbUser.trialEndsAt.toISOString(),
        active: true,
        daysLeft: 10,
      },
    });
    expect(JSON.stringify(res.body)).not.toContain(passwordHash);

    const decoded = jwt.verify(res.body.token, SECRET) as jwt.JwtPayload;
    expect(decoded).toMatchObject({
      userId: 7,
      email: "sam@example.com",
      accountType: "viewer",
    });
    expect(decoded.exp! - decoded.iat!).toBe(3600);
  });

  it("looks the user up by trimmed, lower-cased email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    await request(app)
      .post("/auth/login")
      .send({ email: "  SAM@Example.com ", password: "correct-password" });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "sam@example.com" },
    });
  });

  it("returns 401 for an unknown email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "whatever" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for a wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "sam@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty("token");
  });

  it("gives the same error for unknown email and wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: "sam@example.com", password: "nope" });

    prismaMock.user.findUnique.mockResolvedValue(null);
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: "ghost@example.com", password: "nope" });

    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });

  it.each([
    ["an empty body", {}],
    ["a missing password", { email: "a@b.com" }],
    ["a missing email", { password: "x" }],
    ["a non-string email", { email: 123, password: "x" }],
  ])("returns 400 for %s", async (_label, body) => {
    const res = await request(app).post("/auth/login").send(body);

    expect(res.status).toBe(400);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "a@b.com", password: "pw" });
    expect(res.status).toBe(500);
  });

  it("returns 500 and no token when JWT_SECRET is not configured", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    vi.stubEnv("JWT_SECRET", "");
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "sam@example.com", password: "correct-password" });

    expect(res.status).toBe(500);
    expect(res.body).not.toHaveProperty("token");
  });
});

describe("GET /users", () => {
  it("returns 403 for a non-admin", async () => {
    const res = await request(app).get("/users").set("Authorization", asViewer());
    expect(res.status).toBe(403);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it("returns users, newest first and without password hashes, for an admin", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 1, fullName: "Sam", email: "s@example.com", accountType: "viewer" },
    ]);
    const res = await request(app).get("/users").set("Authorization", asAdmin());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const args = prismaMock.user.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.select).not.toHaveProperty("passwordHash");
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.user.findMany.mockRejectedValue(new Error("db down"));
    const res = await request(app).get("/users").set("Authorization", asAdmin());
    expect(res.status).toBe(500);
  });
});

describe("POST /users/:id/posts", () => {
  const body = { title: "  Hello ", content: " World " };

  it("lets the owner create a post, trimming fields and connecting the author", async () => {
    prismaMock.post.create.mockResolvedValue({ id: 1 });
    const res = await request(app)
      .post("/users/1/posts")
      .set("Authorization", asViewer(1))
      .send(body);

    expect(res.status).toBe(201);
    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: { title: "Hello", content: "World", author: { connect: { id: 1 } } },
    });
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).post("/users/1/posts").send(body);
    expect(res.status).toBe(401);
  });

  it("blocks a user from posting as someone else", async () => {
    const res = await request(app)
      .post("/users/2/posts")
      .set("Authorization", asViewer(1))
      .send(body);

    expect(res.status).toBe(403);
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("lets an admin post on behalf of another user", async () => {
    prismaMock.post.create.mockResolvedValue({ id: 1 });
    const res = await request(app)
      .post("/users/2/posts")
      .set("Authorization", asAdmin())
      .send(body);

    expect(res.status).toBe(201);
    expect(prismaMock.post.create.mock.calls[0][0].data.author).toEqual({
      connect: { id: 2 },
    });
  });

  it.each(["abc", "0", "-1", "1.5"])("returns 400 for the invalid user id %s", async (id) => {
    const res = await request(app)
      .post(`/users/${id}/posts`)
      .set("Authorization", asViewer(1))
      .send(body);

    expect(res.status).toBe(400);
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing title", { content: "World" }],
    ["a blank title", { title: "  ", content: "World" }],
    ["a missing content", { title: "Hello" }],
    ["a blank content", { title: "Hello", content: "" }],
    ["a non-string title", { title: 5, content: "World" }],
  ])("returns 400 for %s", async (_label, payload) => {
    const res = await request(app)
      .post("/users/1/posts")
      .set("Authorization", asViewer(1))
      .send(payload);

    expect(res.status).toBe(400);
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("returns 500 when the database fails (for example, the author does not exist)", async () => {
    prismaMock.post.create.mockRejectedValue(new Error("no such author"));
    const res = await request(app)
      .post("/users/1/posts")
      .set("Authorization", asViewer(1))
      .send(body);
    expect(res.status).toBe(500);
  });
});

describe("GET /users/:id/posts", () => {
  it("returns the owner's posts, filtered by author", async () => {
    prismaMock.post.findMany.mockResolvedValue([{ id: 1 }]);
    const res = await request(app)
      .get("/users/1/posts")
      .set("Authorization", asViewer(1));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(prismaMock.post.findMany.mock.calls[0][0].where).toEqual({
      authorId: 1,
    });
  });

  it("only exposes the author's name and email", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    await request(app).get("/users/1/posts").set("Authorization", asViewer(1));

    expect(prismaMock.post.findMany.mock.calls[0][0].include.author.select).toEqual({
      fullName: true,
      email: true,
    });
  });

  it("blocks viewing another user's posts", async () => {
    const res = await request(app)
      .get("/users/2/posts")
      .set("Authorization", asViewer(1));

    expect(res.status).toBe(403);
    expect(prismaMock.post.findMany).not.toHaveBeenCalled();
  });

  it("lets an admin view anyone's posts", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get("/users/2/posts")
      .set("Authorization", asAdmin());
    expect(res.status).toBe(200);
  });

  it("returns 400 for an invalid user id", async () => {
    const res = await request(app)
      .get("/users/abc/posts")
      .set("Authorization", asViewer(1));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.post.findMany.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .get("/users/1/posts")
      .set("Authorization", asViewer(1));
    expect(res.status).toBe(500);
  });
});

describe("GET /posts", () => {
  it("returns 403 for a non-admin", async () => {
    const res = await request(app).get("/posts").set("Authorization", asViewer());
    expect(res.status).toBe(403);
    expect(prismaMock.post.findMany).not.toHaveBeenCalled();
  });

  it("returns all posts, newest first, for an admin", async () => {
    prismaMock.post.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = await request(app).get("/posts").set("Authorization", asAdmin());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const args = prismaMock.post.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.include.author.select).toEqual({ fullName: true, email: true });
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.post.findMany.mockRejectedValue(new Error("db down"));
    const res = await request(app).get("/posts").set("Authorization", asAdmin());
    expect(res.status).toBe(500);
  });
});

describe("PUT /posts/:id", () => {
  const existing = { id: 5, authorId: 1 };

  it.each(["abc", "0", "-3", "2.5"])("returns 400 for the invalid post id %s", async (id) => {
    const res = await request(app)
      .put(`/posts/${id}`)
      .set("Authorization", asViewer(1))
      .send({ title: "x" });
    expect(res.status).toBe(400);
    expect(prismaMock.post.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the post does not exist", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .put("/posts/5")
      .set("Authorization", asViewer(1))
      .send({ title: "x" });
    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).put("/posts/5").send({ title: "x" });
    expect(res.status).toBe(401);
  });

  it("blocks users who do not own the post", async () => {
    prismaMock.post.findUnique.mockResolvedValue(existing);
    const res = await request(app)
      .put("/posts/5")
      .set("Authorization", asViewer(2))
      .send({ title: "x" });

    expect(res.status).toBe(403);
    expect(prismaMock.post.update).not.toHaveBeenCalled();
  });

  it("lets the owner update all fields, trimming text", async () => {
    prismaMock.post.findUnique.mockResolvedValue(existing);
    prismaMock.post.update.mockResolvedValue({ ...existing, title: "New" });
    const res = await request(app)
      .put("/posts/5")
      .set("Authorization", asViewer(1))
      .send({ title: " New ", content: " Body ", published: true });

    expect(res.status).toBe(200);
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { title: "New", content: "Body", published: true },
    });
  });

  it("only updates the fields that were sent", async () => {
    prismaMock.post.findUnique.mockResolvedValue(existing);
    prismaMock.post.update.mockResolvedValue(existing);
    await request(app)
      .put("/posts/5")
      .set("Authorization", asViewer(1))
      .send({ published: true });

    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { published: true },
    });
  });

  it("lets an admin update someone else's post", async () => {
    prismaMock.post.findUnique.mockResolvedValue(existing);
    prismaMock.post.update.mockResolvedValue(existing);
    const res = await request(app)
      .put("/posts/5")
      .set("Authorization", asAdmin())
      .send({ title: "Edited by admin" });
    expect(res.status).toBe(200);
  });

  it.each([
    ["a blank title", { title: "   " }],
    ["a non-string title", { title: 42 }],
    ["a blank content", { content: "" }],
    ["a non-string content", { content: ["x"] }],
    ["a non-boolean published", { published: "yes" }],
  ])("returns 400 for %s", async (_label, payload) => {
    prismaMock.post.findUnique.mockResolvedValue(existing);
    const res = await request(app)
      .put("/posts/5")
      .set("Authorization", asViewer(1))
      .send(payload);

    expect(res.status).toBe(400);
    expect(prismaMock.post.update).not.toHaveBeenCalled();
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.post.findUnique.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .put("/posts/5")
      .set("Authorization", asViewer(1))
      .send({ title: "x" });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /posts/:id", () => {
  const existing = { id: 5, authorId: 1 };

  it.each(["abc", "0", "-3", "2.5"])("returns 400 for the invalid post id %s", async (id) => {
    const res = await request(app)
      .delete(`/posts/${id}`)
      .set("Authorization", asViewer(1));
    expect(res.status).toBe(400);
    expect(prismaMock.post.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the post does not exist", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .delete("/posts/5")
      .set("Authorization", asViewer(1));
    expect(res.status).toBe(404);
    expect(prismaMock.post.delete).not.toHaveBeenCalled();
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).delete("/posts/5");
    expect(res.status).toBe(401);
  });

  it("blocks users who do not own the post", async () => {
    prismaMock.post.findUnique.mockResolvedValue(existing);
    const res = await request(app)
      .delete("/posts/5")
      .set("Authorization", asViewer(2));

    expect(res.status).toBe(403);
    expect(prismaMock.post.delete).not.toHaveBeenCalled();
  });

  it("lets the owner delete their post", async () => {
    prismaMock.post.findUnique.mockResolvedValue(existing);
    prismaMock.post.delete.mockResolvedValue(existing);
    const res = await request(app)
      .delete("/posts/5")
      .set("Authorization", asViewer(1));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
    expect(prismaMock.post.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("lets an admin delete anyone's post", async () => {
    prismaMock.post.findUnique.mockResolvedValue(existing);
    prismaMock.post.delete.mockResolvedValue(existing);
    const res = await request(app)
      .delete("/posts/5")
      .set("Authorization", asAdmin());
    expect(res.status).toBe(200);
  });

  it("returns 500 when the database fails", async () => {
    prismaMock.post.findUnique.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .delete("/posts/5")
      .set("Authorization", asViewer(1));
    expect(res.status).toBe(500);
  });
});

describe("free trial (31 days)", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

  describe("POST /users", () => {
    it("starts a 31-day trial for new signups", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation(async ({ data }) => ({
        id: 1,
        fullName: data.fullName,
        email: data.email,
        phone: null,
        accountType: data.accountType,
        trialEndsAt: data.trialEndsAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const res = await request(app).post("/users").send({
        fullName: "Trial User",
        email: "trial@example.com",
        password: "password123",
      });

      expect(res.status).toBe(201);

      const { data } = prismaMock.user.create.mock.calls[0][0];
      const msAhead = data.trialEndsAt.getTime() - Date.now();
      expect(Math.round(msAhead / DAY)).toBe(31);

      expect(res.body.trial).toMatchObject({ active: true, daysLeft: 31 });
      expect(res.body).not.toHaveProperty("passwordHash");
    });
  });

  describe("GET /auth/me", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/auth/me");

      expect(res.status).toBe(401);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns the current user with an active trial", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 5,
        fullName: "Ann",
        email: "ann@example.com",
        accountType: "viewer",
        trialEndsAt: daysFromNow(12),
        createdAt: daysFromNow(-19),
      });

      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", asViewer(5));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 5,
        email: "ann@example.com",
        trial: { active: true, daysLeft: 12 },
      });
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } }),
      );
    });

    it("shows an expired trial with 0 days left", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 5,
        fullName: "Ann",
        email: "ann@example.com",
        accountType: "viewer",
        trialEndsAt: daysFromNow(-2),
        createdAt: daysFromNow(-33),
      });

      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", asViewer(5));

      expect(res.status).toBe(200);
      expect(res.body.trial).toMatchObject({ active: false, daysLeft: 0 });
    });

    it("counts 31 days from createdAt when trialEndsAt is null", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 5,
        fullName: "Ann",
        email: "ann@example.com",
        accountType: "viewer",
        trialEndsAt: null,
        createdAt: daysFromNow(-5),
      });

      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", asViewer(5));

      expect(res.body.trial).toMatchObject({ active: true, daysLeft: 26 });
    });

    it("returns 404 when the account no longer exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", asViewer(5));

      expect(res.status).toBe(404);
    });
  });

  describe("requireActiveTrial middleware", () => {
    const guarded = express();
    guarded.get("/stream", authenticateToken, requireActiveTrial, (_req, res) => {
      res.json({ ok: true });
    });

    it("returns 401 without a token", async () => {
      const res = await request(guarded).get("/stream");

      expect(res.status).toBe(401);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("lets a viewer with an active trial through", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        accountType: "viewer",
        trialEndsAt: daysFromNow(3),
        createdAt: daysFromNow(-28),
      });

      const res = await request(guarded)
        .get("/stream")
        .set("Authorization", asViewer(1));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it("blocks a viewer whose trial has ended", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        accountType: "viewer",
        trialEndsAt: daysFromNow(-1),
        createdAt: daysFromNow(-32),
      });

      const res = await request(guarded)
        .get("/stream")
        .set("Authorization", asViewer(1));

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("TRIAL_EXPIRED");
    });

    it("lets admins through without checking the trial", async () => {
      const res = await request(guarded)
        .get("/stream")
        .set("Authorization", asAdmin());

      expect(res.status).toBe(200);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns 401 when the account no longer exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(guarded)
        .get("/stream")
        .set("Authorization", asViewer(1));

      expect(res.status).toBe(401);
    });

    it("returns 500 when the database fails", async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error("db down"));

      const res = await request(guarded)
        .get("/stream")
        .set("Authorization", asViewer(1));

      expect(res.status).toBe(500);
    });
  });
});

describe("GET /venues/:id/stream", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

  const activeViewer = {
    id: 1,
    accountType: "viewer",
    trialEndsAt: daysFromNow(10),
    createdAt: daysFromNow(-21),
  };
  const expiredViewer = {
    id: 1,
    accountType: "viewer",
    trialEndsAt: daysFromNow(-1),
    createdAt: daysFromNow(-32),
  };
  const streamUrl = "https://streams.example.com/vibe-room";
  const liveVenue = { id: 3, isLive: true, streamUrl };

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/venues/3/stream");

    expect(res.status).toBe(401);
    expect(prismaMock.venue.findUnique).not.toHaveBeenCalled();
  });

  it("blocks a viewer whose trial has ended and never touches the venue", async () => {
    prismaMock.user.findUnique.mockResolvedValue(expiredViewer);

    const res = await request(app)
      .get("/venues/3/stream")
      .set("Authorization", asViewer(1));

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("TRIAL_EXPIRED");
    expect(JSON.stringify(res.body)).not.toContain(streamUrl);
    expect(prismaMock.venue.findUnique).not.toHaveBeenCalled();
  });

  it("returns the stream link to a viewer with an active trial", async () => {
    prismaMock.user.findUnique.mockResolvedValue(activeViewer);
    prismaMock.venue.findUnique.mockResolvedValue(liveVenue);

    const res = await request(app)
      .get("/venues/3/stream")
      .set("Authorization", asViewer(1));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ live: true, streamUrl });
    expect(prismaMock.venue.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 } }),
    );
  });

  it("hides the link when the venue is not live", async () => {
    prismaMock.user.findUnique.mockResolvedValue(activeViewer);
    prismaMock.venue.findUnique.mockResolvedValue({
      ...liveVenue,
      isLive: false,
    });

    const res = await request(app)
      .get("/venues/3/stream")
      .set("Authorization", asViewer(1));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ live: false, streamUrl: null });
    expect(JSON.stringify(res.body)).not.toContain(streamUrl);
  });

  it("reports not live when the venue has no stream link", async () => {
    prismaMock.user.findUnique.mockResolvedValue(activeViewer);
    prismaMock.venue.findUnique.mockResolvedValue({
      ...liveVenue,
      streamUrl: null,
    });

    const res = await request(app)
      .get("/venues/3/stream")
      .set("Authorization", asViewer(1));

    expect(res.body).toEqual({ live: false, streamUrl: null });
  });

  it("returns 404 when the venue does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(activeViewer);
    prismaMock.venue.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/venues/3/stream")
      .set("Authorization", asViewer(1));

    expect(res.status).toBe(404);
  });

  it.each(["abc", "0", "-1", "1.5"])(
    "returns 400 for the invalid venue id %s",
    async (id) => {
      prismaMock.user.findUnique.mockResolvedValue(activeViewer);

      const res = await request(app)
        .get("/venues/" + id + "/stream")
        .set("Authorization", asViewer(1));

      expect(res.status).toBe(400);
      expect(prismaMock.venue.findUnique).not.toHaveBeenCalled();
    },
  );

  it("lets admins through without a trial check", async () => {
    prismaMock.venue.findUnique.mockResolvedValue(liveVenue);

    const res = await request(app)
      .get("/venues/3/stream")
      .set("Authorization", asAdmin());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ live: true, streamUrl });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns 500 when the venue lookup fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue(activeViewer);
    prismaMock.venue.findUnique.mockRejectedValue(new Error("db down"));

    const res = await request(app)
      .get("/venues/3/stream")
      .set("Authorization", asViewer(1));

    expect(res.status).toBe(500);
  });
});
