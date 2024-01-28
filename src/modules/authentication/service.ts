import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import db from "../../db";

async function isTokenRevoked(prisma: PrismaClient, token: string) {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const foundRevokedToken = await db.revokedToken.find(prisma, hashedToken);
  return Boolean(foundRevokedToken);
}

async function revokeToken(prisma: PrismaClient, token: string) {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  await db.revokedToken.create(prisma, hashedToken);
}

const authenticationService = {
  isTokenRevoked,
  revokeToken,
};

export default authenticationService;
