import { Message, Prisma, PrismaClient } from "@prisma/client";
import { CursorPaginationCondition } from "../../pagination";

const messageQueries = {
  create: (prisma: PrismaClient, data: Prisma.MessageUncheckedCreateInput) => {
    return prisma.message.create({ data: data });
  },
  listConversations: async (
    prisma: PrismaClient,
    condition: CursorPaginationCondition & {
      senderId: number;
    },
  ): Promise<Message[]> => {
    /**
     * This query retrieves the most recent message for each unique combination of fromId and toId,
     * ensuring that the specified user (with ID ${condition.userId}) is either the sender or receiver.
     * The result is ordered by the latest timestamp
     */
    let query = `
          select id,
                 senderId,
                 receiverId,
                 content,
                 max(createdAt) as createdAt
          from Message
          where (senderId = ${condition.senderId} or receiverId = ${condition.senderId})
            and #cursorCondition
          group by min(senderId, receiverId), max(senderId, receiverId)
          order by createdAt desc, id desc
          limit ${condition.limit + 1}
      `;
    if (condition.before) {
      query = query.replace("#cursorCondition", `id < ${condition.after ?? true}`);
    } else {
      query = query.replace("#cursorCondition", "true");
    }

    return prisma.$queryRawUnsafe<Message[]>(query);
  },
  list: (
    prisma: PrismaClient,
    condition: CursorPaginationCondition & {
      senderId: number;
      receiverId: number;
    },
  ): Promise<Message[]> => {
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

    if (condition.before) {
      where.id = { lt: condition.before };
    }

    return prisma.message.findMany({
      where: where,
      orderBy: {
        createdAt: "desc",
      },
      take: condition.limit + 1,
    });
  },
};

export default messageQueries;
