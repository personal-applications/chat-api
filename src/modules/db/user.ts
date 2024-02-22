import { Prisma, PrismaClient, User } from "@prisma/client";

const userQueries = {
  create: (prisma: PrismaClient, data: Prisma.UserCreateInput) => {
    return prisma.user.create({ data });
  },
  update: (prisma: PrismaClient, condition: Prisma.UserWhereUniqueInput, data: Prisma.UserUpdateInput) => {
    return prisma.user.update({ where: condition, data });
  },
  findFirst: (prisma: PrismaClient, condition: Prisma.UserWhereInput) => {
    return prisma.user.findFirst({ where: condition });
  },
  findMany: (prisma: PrismaClient, condition: Prisma.UserWhereInput, selection: Prisma.UserSelectScalar): Promise<User> => {
    return prisma.user.findMany({
      where: condition,
      select: selection,
    });
  },
};

export default userQueries;
