import { User } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import assert from "node:assert";
import test, { beforeEach, describe } from "node:test";
import Sinon from "sinon";
import db from "../../src/db";
import jwt from "../../src/modules/jwt/jwt";
import { build } from "../helper";

test("Message routes", async (t) => {
  const app = await build(t);

  const findByEmail = Sinon.stub(db.user, "findByEmail");

  const user: User = {
    id: "1",
    email: "email@email.com",
    password: "Password123*",
    firstName: "firstName",
    lastName: "lastName",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const token = jwt.createLogInToken(user);

  await t.test("Should throw unauthorized if request is not authenticated", async (t) => {
    const response = await app.inject({
      method: "POST",
      url: "/messages",
      payload: {},
    });

    assert.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await describe("Authenticated");
  beforeEach(() => {
    findByEmail.resolves(user);
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
});
