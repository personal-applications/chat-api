import { StatusCodes } from "http-status-codes";
import assert from "node:assert";
import test from "node:test";
import Sinon from "sinon";
import userQueries from "../../../src/modules/db/user";
import { loginToken } from "../../data";
import { build } from "../../helper";

test("User routes", async (t) => {
  const app = await build(t);

  const userQueriesStub = Sinon.stub(userQueries);

  await t.test("GET /users/me", async (t) => {
    await t.test("Should throw unauthorized if request is not authenticated", async (t) => {
      const response = await app.inject({
        method: "GET",
        url: "/users/me",
      });

      assert.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test("Should return user details", async (t) => {
      userQueriesStub.findFirst.resolves({
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "email@email.com",
      });

      const response = await app.inject({
        method: "GET",
        url: "/users/me",
        headers: {
          authorization: `Bearer ${loginToken}`,
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.deepEqual(response.json(), {
        id: 1,
        fullName: "John Doe",
        email: "email@email.com",
      });
    });
  });
});
