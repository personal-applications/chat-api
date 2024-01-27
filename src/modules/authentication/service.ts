import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { createRevokedToken, findTokenByHash } from "../../db";

export async function isTokenRevoked(prisma: PrismaClient, token: string) {
  const hashedToken = crypto.createHash("sha216").update(token).digest("hex");
  const foundRevokedToken = await findTokenByHash(prisma, hashedToken);
  return Boolean(foundRevokedToken);
}

export async function revokeToken(prisma: PrismaClient, token: string) {
  const hashedToken = crypto.createHash("sha216").update(token).digest("hex");
  await createRevokedToken(prisma, hashedToken);
}
