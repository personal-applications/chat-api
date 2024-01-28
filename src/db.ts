import { PrismaClient, User } from "@prisma/client";

const db = {
  user: {
    create: (prisma: PrismaClient, email: string, password: string, firstName?: string, lastName?: string) => {
      return prisma.user.create({
        data: {
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
        },
      });
    },
    updateInfo: (prisma: PrismaClient, email: string, info: Partial<Pick<User, "firstName" | "lastName" | "password">>) => {
      return prisma.user.update({ where: { email }, data: info });
    },
    findByEmail: (prisma: PrismaClient, email: string) => {
      return prisma.user.findFirst({ where: { email } });
    },
  },
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
