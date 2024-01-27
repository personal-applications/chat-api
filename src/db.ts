import { PrismaClient, User } from "@prisma/client";

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

export function updateUserInfo(prisma: PrismaClient, email: string, info: Partial<Pick<User, "firstName" | "lastName" | "password">>) {
  return prisma.user.update({ where: { email }, data: info });
}

export function findTokenByHash(prisma: PrismaClient, hash: string) {
  return prisma.removedToken.findFirst({ where: { token: hash } });
}

export function createRevokedToken(prisma: PrismaClient, token: string) {
  return prisma.removedToken.create({ data: { token } });
}
