import { User } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import assert from "node:assert";
import test from "node:test";
import Sinon from "sinon";
import db from "../../src/db";
import jwt from "../../src/modules/jwt/jwt";
import { build } from "../helper";

test("Message routes", async (t) => {
  const app = await build(t);

  const findByIdUserStub = Sinon.stub(db.user, "findById");
  const createMessageStub = Sinon.stub(db.message, "create");

  const user: User = {
    id: 1,
    email: "email@email.com",
    password: "Password123*",
    firstName: "firstName",
    lastName: "lastName",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const token = jwt.createLogInToken(user);

  t.beforeEach(() => {
    Sinon.reset();
  });

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
        authorization: `Bearer ${token}`,
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
        toUserId: 0,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
    assert.equal(
      response.json().message,
      "Destination failed. The user you're trying to reach does not exist or is invalid. Please check the user ID and try again."
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
        toUserId: 1,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(response.statusCode, StatusCodes.OK);
    assert.equal(response.json().id, 1);
  });
});
