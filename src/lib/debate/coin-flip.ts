import crypto from "node:crypto";

export function performCoinFlip(
  userAId: number,
  userBId: number
): { winnerId: number; result: "heads" | "tails" } {
  // Cryptographically random selection
  const randomByte = crypto.randomBytes(1)[0];
  const result: "heads" | "tails" = randomByte % 2 === 0 ? "heads" : "tails";
  const winnerId = result === "heads" ? userAId : userBId;

  return { winnerId, result };
}
