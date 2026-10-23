import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db";

async function main() {
  const email = process.env.TARGET_EMAIL;
  const password = process.env.NEWPW;

  if (!email || !password || password.length < 8) {
    throw new Error("Set TARGET_EMAIL and a NEWPW of at least 8 characters.");
  }

  const user = await prisma.user.update({
    where: { email },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      accountType: "admin",
    },
    select: { id: true, email: true, accountType: true },
  });

  console.log("Updated:", user);
}

main()
  .catch((error) => {
    console.error(
      (error as { code?: string }).code === "P2025"
        ? "No user with that email exists."
        : error,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
