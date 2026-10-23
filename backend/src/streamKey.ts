import { createHash, randomBytes } from "node:crypto";

// 48 random hex characters: far too long to guess.
export function generateStreamKey(): string {
  return `vv_${randomBytes(24).toString("hex")}`;
}

// A fast SHA-256 is fine here because the key is long and random.
export function hashStreamKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
