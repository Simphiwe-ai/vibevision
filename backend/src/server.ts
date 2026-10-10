
import "dotenv/config";

import app from "./app";
import { prisma } from "./db";

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    await prisma.$connect();

    const server = app.listen(PORT, () => {
      console.log(`VibeVision API running on http://localhost:${PORT}`);
    });

    const shutdown = () => {
      server.close(() => {
        void prisma.$disconnect().finally(() => {
          process.exit(0);
        });
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start VibeVision API:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void startServer();
