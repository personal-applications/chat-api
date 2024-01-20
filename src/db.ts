import { PrismaClient } from "@prisma/client";

export function findUserByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findFirst({ where: { email: email } });
}

export function createUser(prisma: PrismaClient, email: string, password: string, firstName?: string, lastName?: string) {
  return prisma.user.create({
    data: {
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
    },
  });
}
