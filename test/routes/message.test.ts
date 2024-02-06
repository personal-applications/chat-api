import { StatusCodes } from "http-status-codes";
import assert from "node:assert";
import test from "node:test";
import { build } from "../helper";

test("Message routes", async (t) => {
  const app = await build(t);

  await t.test("Should throw unauthorized if request is not authenticated", async (t) => {
    const response = await app.inject({
      method: "POST",
      url: "/messages",
      payload: {},
    });

    assert.equal(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  // await t.test("Should throw validation errors if fields are not provided", async (t) => {
  //   const response = await app.inject({
  //     method: "POST",
  //     url: "/messages",
  //     payload: {},
  //   });

  //   assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
  //   assert.equal(response.json().message, "body must have required property 'content'");
  // });
});
