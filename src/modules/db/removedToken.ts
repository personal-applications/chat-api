import { PrismaClient } from "@prisma/client";

const removedTokenQueries = {
  find: (prisma: PrismaClient, hash: string) => {
    return prisma.removedToken.findFirst({ where: { token: hash } });
  },
  create: (prisma: PrismaClient, token: string) => {
    return prisma.removedToken.create({ data: { token } });
  },
};

export default removedTokenQueries;
