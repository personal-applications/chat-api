import { User } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import assert from "node:assert";
import test from "node:test";
import Sinon from "sinon";
import db from "../../src/db";
import { authenticatedUser, loginToken } from "../data";
import { build } from "../helper";

test("Message routes", async (t) => {
  const app = await build(t);

  const findByIdUserStub = Sinon.stub(db.user, "findById");
  const createMessageStub = Sinon.stub(db.message, "create");
  const listConversationsStub = Sinon.stub(db.message, "listConversations");
  const listMessagesStub = Sinon.stub(db.message, "list");

  t.beforeEach(() => {
    Sinon.reset();
  });

  await t.test("POST /messages", async (t) => {
    await t.test("Should throw unauthorized if request is not authenticated", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/messages",
        payload: {},
      });

      assert.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test("Should throw validation errors if fields are not provided", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/messages",
        payload: {},
        headers: {
          authorization: `Bearer ${loginToken}`,
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "body must have required property 'content'");
    });

    await t.test("Should throw error if send message to an unknown user", async () => {
      findByIdUserStub.resolves(null);

      const response = await app.inject({
        method: "POST",
        url: "/messages",
        payload: {
          content: "content",
          receiverId: 0,
        },
        headers: {
          authorization: `Bearer ${loginToken}`,
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(
        response.json().message,
        "Destination failed. The user you're trying to reach does not exist or is invalid. Please check the user ID and try again.",
      );
      assert.equal(findByIdUserStub.callCount, 1);
    });

    await t.test("Should create message correctly", async () => {
      createMessageStub.resolves({ id: 1 });

      const response = await app.inject({
        method: "POST",
        url: "/messages",
        payload: {
          content: "content",
          receiverId: 1,
        },
        headers: {
          authorization: `Bearer ${loginToken}`,
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.equal(response.json().id, 1);
    });
  });

  await t.test("GET /messages/conversations", async (t) => {
    await t.test("Should throw unauthorized if request is not authenticated", async (t) => {
      const response = await app.inject({
        method: "GET",
        url: "/messages/conversations",
        payload: {},
      });

      assert.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test("Should return a list of messages", async (t) => {
      listConversationsStub.resolves([]);

      const response = await app.inject({
        method: "GET",
        url: "/messages/conversations",
        query: {},
        headers: {
          authorization: `Bearer ${loginToken}`,
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.deepEqual(response.json(), { items: [], hasPreviousPage: false });
    });
  });

  await t.test("GET /messages", async (t) => {
    await t.test("Should throw unauthorized if request is not authenticated", async (t) => {
      const response = await app.inject({
        method: "GET",
        url: "/messages",
        payload: {},
      });

      assert.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test("Should throw validation errors if fields are not provided", async (t) => {
      const response = await app.inject({
        method: "GET",
        url: "/messages",
        payload: {},
        headers: {
          authorization: `Bearer ${loginToken}`,
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "querystring must have required property 'receiverId'");
    });

    await t.test("Should return a list of messages correctly", async (t) => {
      await t.test("Should return a list without any condition correctly", async () => {
        listMessagesStub.resolves([]);

        const response = await app.inject({
          method: "GET",
          url: "/messages",
          query: {
            receiverId: "1",
          },
          headers: {
            authorization: `Bearer ${loginToken}`,
          },
        });

        assert.equal(response.statusCode, StatusCodes.OK);
        assert.deepEqual(response.json(), { items: [], hasPreviousPage: false });
      });

      await t.test("Should return a list with limit correctly", async () => {
        const otherUser: User = {
          id: 2,
          firstName: "John",
          lastName: "Doe",
        };

        listMessagesStub.resolves([
          {
            id: 1,
            senderId: otherUser.id,
            receiverId: authenticatedUser.id,
            content: "Hello, how are you?",
            createdAt: 1645342800,
          },
          {
            id: 2,
            senderId: authenticatedUser.id,
            receiverId: otherUser.id,
            content: "I'm doing well, thank you!",
            createdAt: 1645343100,
          },
        ]);
        findByIdUserStub.resolves(otherUser);

        const response = await app.inject({
          method: "GET",
          url: "/messages",
          query: {
            receiverId: otherUser.id,
            limit: "1",
          },
          headers: {
            authorization: `Bearer ${loginToken}`,
          },
        });

        assert.equal(response.statusCode, StatusCodes.OK);
        assert.deepEqual(response.json(), {
          hasPreviousPage: true,
          items: [
            {
              content: "Hello, how are you?",
              createdAt: 1645342800,
              id: 1,
              receiver: {
                firstName: "firstName",
                id: 1,
                lastName: "lastName",
              },
              sender: {
                firstName: "John",
                id: 2,
                lastName: "Doe",
              },
            },
          ],
        });
      });

      await t.test("Should not call db when getting messages for same user", async () => {
        listMessagesStub.resolves([
          {
            id: 1,
            senderId: authenticatedUser.id,
            receiverId: authenticatedUser.id,
            content: "Hello, how are you?",
            createdAt: 1645342800,
          },
        ]);

        const response = await app.inject({
          method: "GET",
          url: "/messages",
          query: {
            receiverId: authenticatedUser.id,
            limit: "1",
          },
          headers: {
            authorization: `Bearer ${loginToken}`,
          },
        });

        assert.equal(response.statusCode, StatusCodes.OK);
        assert.deepEqual(response.json(), {
          hasPreviousPage: false,
          items: [
            {
              content: "Hello, how are you?",
              createdAt: 1645342800,
              id: 1,
              receiver: {
                firstName: "firstName",
                id: 1,
                lastName: "lastName",
              },
              sender: {
                firstName: "firstName",
                id: 1,
                lastName: "lastName",
              },
            },
          ],
        });
      });
    });
  });
});
