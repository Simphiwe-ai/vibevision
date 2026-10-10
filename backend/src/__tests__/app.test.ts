
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../db", () => ({
  prisma: {
    user: mockUser,
  },
}));

import app from "../app";

describe("VibeVision API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET / returns the API running message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "VibeVision API is running!",
    });
  });

  it("POST /users creates a viewer and never returns passwordHash", async () => {
    mockUser.findUnique.mockResolvedValue(null);

    mockUser.create.mockImplementation(async ({ data, select }) => {
      expect(data.accountType).toBe("viewer");
      expect(data.passwordHash).toBeTruthy();
      expect(data.password).toBeUndefined();

      const savedUser = {
        id: 1,
        fullName: data.fullName,
        email: data.email,
        phone: null,
        accountType: data.accountType,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        passwordHash: data.passwordHash,
      };

      return Object.fromEntries(
  Object.entries(select)
    .filter(([, enabled]) => enabled)
    .map(([key]) => [
      key,
      savedUser[key as keyof typeof savedUser],
    ]),
);
    });

    const response = await request(app)
      .post("/users")
      .send({
        fullName: "Test Viewer",
        email: "viewer@example.com",
        password: "SafeTestPass123!",
        accountType: "admin",
      });

    expect(response.status).toBe(201);
    expect(response.body.accountType).toBe("viewer");
    expect(response.body.passwordHash).toBeUndefined();
    expect(mockUser.create).toHaveBeenCalledOnce();
  });

  it("POST /users rejects a short password", async () => {
    const response = await request(app)
      .post("/users")
      .send({
        fullName: "Test Viewer",
        email: "viewer@example.com",
        password: "short",
      });

    expect(response.status).toBe(400);
    expect(mockUser.create).not.toHaveBeenCalled();
  });
});
