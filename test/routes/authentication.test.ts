import { StatusCodes } from "http-status-codes";
import assert from "node:assert";
import { test } from "node:test";
import sinon from "sinon";
import * as db from "../../src/db";
import { build } from "../helper";

test("Authentication routes", async (t) => {
  const app = await build(t);
  const findUserByEmailStub = sinon.stub(db, "findUserByEmail");
  const createUserStub = sinon.stub(db, "createUser");

  t.beforeEach(() => {
    findUserByEmailStub.reset();
    createUserStub.reset();
  });

  await t.test("POST /auth/register", async (t) => {
    await t.test("Should throw validation errors if fields are not provided", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {},
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "body must have required property 'email'");
    });

    await t.test("Should throw validation error if passwords are not matched", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "email@email.com",
          password: "Password123*",
          confirmPassword: "Password123",
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "Passwords do not match.");
    });

    await t.test("Should throw validation error if email is not available", async (t) => {
      findUserByEmailStub.resolves({} as any);

      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "email@email.com",
          password: "Password123*",
          confirmPassword: "Password123*",
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "Email is not available.");
      assert.equal(findUserByEmailStub.calledOnce, true);
    });

    await t.test("Should create a user successfully", async (t) => {
      findUserByEmailStub.resolves(null);

      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "email@email.com",
          password: "Password123*",
          confirmPassword: "Password123*",
        },
      });

      assert.equal(response.statusCode, StatusCodes.NO_CONTENT);
      assert.equal(findUserByEmailStub.calledOnce, true);
      assert.equal(createUserStub.calledOnce, true);
    });
  });
});
