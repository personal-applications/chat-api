import { Message, Prisma, PrismaClient, User } from "@prisma/client";
import { CursorPaginationCondition } from "./pagination";

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
    findById: (prisma: PrismaClient, id: number): Promise<User> => {
      return prisma.user.findFirst({ where: { id } });
    },
    findByIds: (prisma: PrismaClient, ids: number[]): Promise<User[]> => {
      if (ids.length === 0) {
        return Promise.resolve([]);
      }
      return prisma.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });
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
  message: {
    create: (
      prisma: PrismaClient,
      data: {
        senderId: number;
        receiverId: number;
        content: string;
      },
    ) => {
      return prisma.message.create({
        data: data,
      });
    },
    listConversations: async (
      prisma: PrismaClient,
      condition: CursorPaginationCondition & {
        senderId: number;
      },
    ) => {
      /**
       * This query retrieves the most recent message for each unique combination of fromId and toId,
       * ensuring that the specified user (with ID ${condition.userId}) is either the sender or receiver.
       * The result is ordered by the latest timestamp
       */
      let messages: Message[] = await prisma.$queryRaw`
          select id,
                 senderId,
                 receiverId,
                 content,
                 max(createdAt) as createdAt
          from Message
          where (senderId = ${condition.senderId} or receiverId = ${condition.senderId})and id > ${condition.after ?? true}
          group by min(senderId, receiverId), max(senderId, receiverId)
          order by createdAt asc
          limit ${condition.first + 1}
      `;

      return messages;
    },
    list: (prisma: PrismaClient, condition: CursorPaginationCondition & { senderId: number; receiverId: number }): Promise<Message[]> => {
      const where: Prisma.MessageWhereInput = {};
      where.OR = [
        {
          senderId: condition.senderId,
          receiverId: condition.receiverId,
        },
        {
          senderId: condition.receiverId,
          receiverId: condition.senderId,
        },
      ];

      if (condition.after) {
        where.id = { gt: condition.after };
      }

      return prisma.message.findMany({
        where: where,
        orderBy: {
          createdAt: "asc",
        },
        take: condition.first + 1,
      });
    },
  },
};

export default db;
