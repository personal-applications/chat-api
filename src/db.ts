import { PrismaClient } from "@prisma/client";

const db = {
  revokedToken: {
    find: (prisma: PrismaClient, hash: string) => {
      return prisma.removedToken.findFirst({ where: { token: hash } });
    },
    create: (prisma: PrismaClient, token: string) => {
      return prisma.removedToken.create({ data: { token } });
    },
  },
};

export default db;
