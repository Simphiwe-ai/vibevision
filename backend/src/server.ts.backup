import dotenv from "dotenv";

dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });
import bcrypt from "bcryptjs"; // for password hashing
import jwt from "jsonwebtoken"; // for issuing tokens

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ JWT Authentication Middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Expect "Bearer <token>"

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token." });
    (req as any).user = user; // attach decoded user info to request
    next();
  });
}

// ✅ Role-based Access Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user.accountType !== "admin") {
    return res.status(403).json({ error: "Admin privileges required." });
  }
  next();
}

// Home/test route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "VibeVision API is running!" });
});

// ✅ Create a new user (with hashed password)
app.post("/users", async (req: Request, res: Response) => {
  const { fullName, email, password, accountType } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { fullName, email, passwordHash: hashedPassword, accountType },
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ✅ Fetch all users (admin only)
app.get("/users", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, email: true, accountType: true },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ✅ User login route
app.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, accountType: user.accountType },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ✅ Create a new post for a user (protected, only owner or admin)
app.post("/users/:id/posts", authenticateToken, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const requester = (req as any).user;

  if (requester.userId !== userId && requester.accountType !== "admin") {
    return res.status(403).json({ error: "You can only create posts for yourself." });
  }

  const { title, content } = req.body;

  try {
    const post = await prisma.post.create({
      data: {
        title,
        content,
        author: { connect: { id: userId } },
      },
    });
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ✅ Fetch all posts by a user (protected, only owner or admin)
app.get("/users/:id/posts", authenticateToken, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const requester = (req as any).user;

  if (requester.userId !== userId && requester.accountType !== "admin") {
    return res.status(403).json({ error: "You can only view your own posts." });
  }

  try {
    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      include: { author: { select: { fullName: true, email: true } } },
    });
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ✅ Fetch all posts (blog feed, protected, admin only)
app.get("/posts", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      include: { author: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch all posts" });
  }
});

// ✅ Update an existing post (protected, only owner or admin)
app.put("/posts/:id", authenticateToken, async (req: Request, res: Response) => {
  const postId = parseInt(req.params.id, 10);
  const requester = (req as any).user;

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (requester.userId !== post.authorId && requester.accountType !== "admin") {
      return res.status(403).json({ error: "You can only update your own posts." });
    }

    const { title, content, published } = req.body;
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { title, content, published },
    });
    res.json(updatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// ✅ Delete a post by ID (protected, only owner or admin)
app.delete("/posts/:id", authenticateToken, async (req: Request, res: Response) => {
  const postId = parseInt(req.params.id, 10);
  const requester = (req as any).user;

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (requester.userId !== post.authorId && requester.accountType !== "admin") {
      return res.status(403).json({ error: "You can only delete your own posts." });
    }

    const deletedPost = await prisma.post.delete({ where: { id: postId } });
    res.json({ message: "Post deleted successfully", deletedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// API test route
app.get("/api/test", (req: Request, res: Response) => {
  res.json({ message: "VibeVision API test successful!" });
});

app.listen(PORT, () => {
  console.log(`VibeVision API running on http://localhost:${PORT}`);
});

