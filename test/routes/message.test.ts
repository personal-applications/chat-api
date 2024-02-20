import { StatusCodes } from "http-status-codes";
import assert from "node:assert";
import test from "node:test";
import Sinon from "sinon";
import db from "../../src/db";
import { authenticatedUser, loginToken } from "../data";
import { build } from "../helper";
import { Message } from "@prisma/client";

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
      assert.deepEqual(response.json(), { items: [], hasNextPage: false });
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

    await t.test("Should return a list of messages", async (t) => {
      const fakeUser = { id: 2, firstName: "John", lastName: "Doe" };
      const data: Message[] = [
        {
          id: 1,
          senderId: authenticatedUser.id,
          receiverId: fakeUser.id,
          content: "Hello, how are you?",
          createdAt: 1623456789,
        },
        {
          id: 2,
          senderId: fakeUser.id,
          receiverId: authenticatedUser.id,
          content: "I'm doing well, thank you!",
          createdAt: 1623456799,
        },
      ];
      listMessagesStub.resolves(data);
      findByIdUserStub.resolves(fakeUser);

      let response = await app.inject({
        method: "GET",
        url: "/messages",
        query: {
          receiverId: "3",
          first: "2",
        },
        headers: {
          authorization: `Bearer ${loginToken}`,
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.deepEqual(response.json(), {
        items: [
          {
            content: "Hello, how are you?",
            createdAt: 1623456789,
            sender: {
              id: authenticatedUser.id,
              firstName: authenticatedUser.firstName,
              lastName: authenticatedUser.lastName,
            },
            id: 1,
            receiver: fakeUser,
          },
          {
            content: "I'm doing well, thank you!",
            createdAt: 1623456799,
            sender: fakeUser,
            id: 2,
            receiver: {
              id: authenticatedUser.id,
              firstName: authenticatedUser.firstName,
              lastName: authenticatedUser.lastName,
            },
          },
        ],
        hasNextPage: false,
      });
      assert.equal(findByIdUserStub.callCount, 1);
      findByIdUserStub.resetHistory();

      response = await app.inject({
        method: "GET",
        url: "/messages",
        query: {
          receiverId: "3",
          first: "1",
        },
        headers: {
          authorization: `Bearer ${loginToken}`,
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.deepEqual(response.json(), {
        items: [
          {
            content: "Hello, how are you?",
            createdAt: 1623456789,
            sender: {
              id: authenticatedUser.id,
              firstName: authenticatedUser.firstName,
              lastName: authenticatedUser.lastName,
            },
            id: 1,
            receiver: fakeUser,
          },
        ],
        hasNextPage: true,
      });
      assert.equal(findByIdUserStub.callCount, 1);
      findByIdUserStub.resetHistory();

      response = await app.inject({
        method: "GET",
        url: "/messages",
        query: {
          receiverId: authenticatedUser.id,
          first: "1",
        },
        headers: {
          authorization: `Bearer ${loginToken}`,
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.equal(findByIdUserStub.callCount, 0);
    });
  });
});
