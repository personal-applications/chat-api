import { Message, PrismaClient, User } from "@prisma/client";
import _ from "lodash";
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
    findById: (prisma: PrismaClient, id: number) => {
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
    create: (prisma: PrismaClient, fromId: number, content: string, toId: number) => {
      return prisma.message.create({
        data: {
          content,
          toId,
          fromId,
        },
      });
    },
    list: async (
      prisma: PrismaClient,
      condition: CursorPaginationCondition & {
        user: User;
      },
    ) => {
      /**
       * This query retrieves the most recent message for each unique combination of fromId and toId,
       * ensuring that the specified user (with ID ${condition.user.id}) is either the sender or receiver.
       * The result is ordered by the latest timestamp
       */
      let messages: Message[] = await prisma.$queryRaw`
          select id,
                 fromId,
                 toId,
                 content,
                 max(createdAt) as createdAt
          from Message
          where (fromId = ${condition.user.id} or toId = ${condition.user.id}) and id > ${condition.after ?? true}
          group by min(fromId, toId), max(fromId, toId)
          order by createdAt
          limit ${condition.first + 1}
      `;
      const hasNextPage = messages.length > condition.first;
      if (hasNextPage) {
        messages = messages.slice(0, condition.first);
      }

      const userIds = _.flatten<number>(messages.map((m) => [m.fromId, m.toId])).filter((id) => id !== condition.user.id);
      const users = await db.user.findByIds(prisma, userIds);

      const result = messages.map((m) => {
        if (m.fromId === m.toId && m.toId === condition.user.id) {
          return {
            id: m.id,
            fromUser: condition.user,
            toUser: condition.user,
            content: m.content,
            createdAt: m.createdAt,
          };
        } else if (m.fromId === condition.user.id) {
          return {
            id: m.id,
            fromUser: condition.user,
            toUser: users.find((user) => user.id === m.toId),
            content: m.content,
            createdAt: m.createdAt,
          };
        } else if (m.toId === condition.user.id) {
          return {
            id: m.id,
            fromUser: users.find((user) => user.id === m.fromId),
            toUser: condition.user,
            content: m.content,
            createdAt: m.createdAt,
          };
        }
      });

      return {
        items: result,
        hasNextPage,
      };
    },
  },
};

export default db;
