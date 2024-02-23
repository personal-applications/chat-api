import { PrismaClient } from "@prisma/client";
import assert from "node:assert";
import test from "node:test";
import Sinon from "sinon";
import messageQueries from "../../src/modules/db/message";

test("Message queries", async (t) => {
  await t.test("create", async () => {
    const fakePrisma = {
      message: {
        create: Sinon.stub().resolves(),
      },
    };

    await messageQueries.create(fakePrisma as any, { content: "content", receiverId: 1, senderId: 1 });

    assert(fakePrisma.message.create.calledOnce);
  });

  await t.test("listConversation", async (t) => {
    const prisma = new PrismaClient();

    t.before(async () => {
      await prisma.$executeRaw`
        INSERT INTO User (email, firstName, lastName, password, createdAt, updatedAt) VALUES
        ('user1@example.com', 'User', '1', 'password1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('user2@example.com', 'User', '2', 'password2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('user3@example.com', 'User', '3', 'password3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `;

      const user1 = await prisma.user.findFirst({ where: { email: "user1@example.com" } });
      const user2 = await prisma.user.findFirst({ where: { email: "user2@example.com" } });
      const user3 = await prisma.user.findFirst({ where: { email: "user3@example.com" } });

      await prisma.$executeRawUnsafe(`
        INSERT INTO Message (senderId, receiverId, content, createdAt) VALUES
        (${user1.id}, ${user2.id}, 'Message 1 from User ${user1.id} to User ${user2.id}', datetime('now', '+1 seconds')),
        (${user2.id}, ${user1.id}, 'Message 1 from User ${user2.id} to User ${user1.id}', datetime('now', '+2 seconds')),
        (${user2.id}, ${user1.id}, 'Message 2 from User ${user2.id} to User ${user1.id}', datetime('now', '+3 seconds')),
        (${user1.id}, ${user3.id}, 'Message 1 from User ${user1.id} to User ${user3.id}', datetime('now', '+4 seconds')),
        (${user1.id}, ${user3.id}, 'Message 2 from User ${user1.id} to User ${user3.id}', datetime('now', '+5 seconds')),
        (${user3.id}, ${user1.id}, 'Message 1 from User ${user3.id} to User ${user1.id}', datetime('now', '+6 seconds')),
        (${user3.id}, ${user1.id}, 'Message 2 from User ${user3.id} to User ${user1.id}', datetime('now', '+7 seconds'));
      `);
    });

    t.after(async () => {
      await prisma.message.deleteMany();
      await prisma.user.deleteMany();
    });

    await t.test("Should return a list correctly when no cursor is provided", async () => {
      const user1 = await prisma.user.findFirst({ where: { email: "user1@example.com" } });
      const user2 = await prisma.user.findFirst({ where: { email: "user2@example.com" } });
      const user3 = await prisma.user.findFirst({ where: { email: "user3@example.com" } });

      let result = await messageQueries.listConversations(prisma, { limit: 1, senderId: user1.id });
      result = result.map((r) => ({ content: r.content, receiverId: r.receiverId, senderId: r.senderId }));

      assert.deepEqual(result, [
        {
          content: `Message 2 from User ${user3.id} to User ${user1.id}`,
          receiverId: user1.id,
          senderId: user3.id,
        },
        {
          content: `Message 2 from User ${user2.id} to User ${user1.id}`,
          receiverId: user1.id,
          senderId: user2.id,
        },
      ]);
    });

    await t.test("Should return a list correctly when cursor is provided", async (t) => {
      const user1 = await prisma.user.findFirst({ where: { email: "user1@example.com" } });
      const lastMessage = await prisma.message.findFirst({ where: {}, orderBy: { createdAt: "desc" } });
      let result = await messageQueries.listConversations(prisma, { limit: 1, senderId: user1.id, before: lastMessage.id });
      const messageIds = result.map((result) => result.id);

      assert(messageIds.every((id) => id < lastMessage.id));
    });
  });
});
