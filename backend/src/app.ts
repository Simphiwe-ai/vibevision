import express, {
  Request,
  Response,
  NextFunction,
} from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./db";
import venuesRouter from "./venues";

const app = express();

app.use(cors());
app.use(express.json());

type AuthUser = {
  userId: number;
  email: string;
  accountType: string;
};

type AuthRequest = Request & {
  user?: AuthUser;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is missing from your .env file");
  }

  return secret;
}

function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Access denied. No token provided.",
    });
  }

  jwt.verify(token, getJwtSecret(), (err, decoded) => {
    if (err || !decoded || typeof decoded === "string") {
      return res.status(403).json({
        error: "Invalid or expired token.",
      });
    }

    (req as AuthRequest).user = decoded as AuthUser;
    next();
  });
}

function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = (req as AuthRequest).user;

  if (user?.accountType !== "admin") {
    return res.status(403).json({
      error: "Admin privileges required.",
    });
  }

  next();
}

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "VibeVision API is running!" });
});

app.get("/api/test", (_req: Request, res: Response) => {
  res.json({ message: "VibeVision API test successful!" });
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Registration: public users must not choose their own account role.
app.post("/users", async (req: Request, res: Response) => {
  const { fullName, email, password } = req.body ?? {};

  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    typeof email !== "string" ||
    !EMAIL_PATTERN.test(email.trim()) ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return res.status(400).json({
      error: "Provide a full name, valid email, and password of at least 8 characters.",
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        accountType: "viewer",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        accountType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error("Registration failed:", error);

    return res.status(500).json({
      error: "Failed to create user.",
    });
  }
});

app.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      error: "Email and password are required.",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        accountType: user.accountType,
      },
      getJwtSecret(),
      { expiresIn: "1h" },
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        accountType: user.accountType,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      error: "Login failed.",
    });
  }
});

app.get(
  "/users",
  authenticateToken,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          accountType: true,
          createdAt: true,
        },
      });

      return res.json(users);
    } catch (error) {
      console.error("Fetching users failed:", error);

      return res.status(500).json({
        error: "Failed to fetch users.",
      });
    }
  },
);

app.post(
  "/users/:id/posts",
  authenticateToken,
  async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const requester = (req as AuthRequest).user;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    if (
      !requester ||
      (requester.userId !== userId &&
        requester.accountType !== "admin")
    ) {
      return res.status(403).json({
        error: "You can only create posts for yourself.",
      });
    }

    const { title, content } = req.body ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(400).json({
        error: "Title and content are required.",
      });
    }

    try {
      const post = await prisma.post.create({
        data: {
          title: title.trim(),
          content: content.trim(),
          author: { connect: { id: userId } },
        },
      });

      return res.status(201).json(post);
    } catch (error) {
      console.error("Creating post failed:", error);

      return res.status(500).json({
        error: "Failed to create post.",
      });
    }
  },
);

app.get(
  "/users/:id/posts",
  authenticateToken,
  async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const requester = (req as AuthRequest).user;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    if (
      !requester ||
      (requester.userId !== userId &&
        requester.accountType !== "admin")
    ) {
      return res.status(403).json({
        error: "You can only view your own posts.",
      });
    }

    try {
      const posts = await prisma.post.findMany({
        where: { authorId: userId },
        include: {
          author: {
            select: { fullName: true, email: true },
          },
        },
      });

      return res.json(posts);
    } catch (error) {
      console.error("Fetching posts failed:", error);

      return res.status(500).json({
        error: "Failed to fetch posts.",
      });
    }
  },
);

app.get(
  "/posts",
  authenticateToken,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const posts = await prisma.post.findMany({
        include: {
          author: {
            select: { fullName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json(posts);
    } catch (error) {
      console.error("Fetching all posts failed:", error);

      return res.status(500).json({
        error: "Failed to fetch all posts.",
      });
    }
  },
);

app.put(
  "/posts/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const postId = Number(req.params.id);
    const requester = (req as AuthRequest).user;

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ error: "Invalid post ID." });
    }

    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        return res.status(404).json({ error: "Post not found." });
      }

      if (
        !requester ||
        (requester.userId !== post.authorId &&
          requester.accountType !== "admin")
      ) {
        return res.status(403).json({
          error: "You can only update your own posts.",
        });
      }

      const { title, content, published } = req.body ?? {};

      const data: {
        title?: string;
        content?: string;
        published?: boolean;
      } = {};

      if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
          return res.status(400).json({ error: "Invalid title." });
        }
        data.title = title.trim();
      }

      if (content !== undefined) {
        if (typeof content !== "string" || !content.trim()) {
          return res.status(400).json({ error: "Invalid content." });
        }
        data.content = content.trim();
      }

      if (published !== undefined) {
        if (typeof published !== "boolean") {
          return res.status(400).json({ error: "Invalid published value." });
        }
        data.published = published;
      }

      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data,
      });

      return res.json(updatedPost);
    } catch (error) {
      console.error("Updating post failed:", error);

      return res.status(500).json({
        error: "Failed to update post.",
      });
    }
  },
);

app.delete(
  "/posts/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const postId = Number(req.params.id);
    const requester = (req as AuthRequest).user;

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ error: "Invalid post ID." });
    }

    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        return res.status(404).json({ error: "Post not found." });
      }

      if (
        !requester ||
        (requester.userId !== post.authorId &&
          requester.accountType !== "admin")
      ) {
        return res.status(403).json({
          error: "You can only delete your own posts.",
        });
      }

      await prisma.post.delete({ where: { id: postId } });

      return res.json({ message: "Post deleted successfully." });
    } catch (error) {
      console.error("Deleting post failed:", error);

      return res.status(500).json({
        error: "Failed to delete post.",
      });
    }
  },
);

app.use("/venues", venuesRouter);

export default app;
