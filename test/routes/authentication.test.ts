import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import assert from "node:assert";
import { test } from "node:test";
import sinon from "sinon";
import { JWT_EXPIRATION_TIME, JWT_SECRET } from "../../src/config";
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

  await t.test("POST /auth/forgot-password", async (t) => {
    await t.test("Should throw validation errors if fields are not provided", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        payload: {},
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "body must have required property 'email'");
    });

    await t.test("Should not send an email to users if email is not found", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        payload: {
          email: "email@email.com",
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "body must have required property 'email'");
    });

    await t.test("Should send an email to users if email is found", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        payload: {
          email: "email@email.com",
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.equal(
        response.json().message,
        "Password reset link has been sent to your email address. Please check your email (including your spam folder) for further instructions."
      );
    });
  });

  await t.test("POST /auth/login", async (t) => {
    await t.test("Should throw validation errors if fields are not provided", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {},
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "body must have required property 'email'");
    });

    await t.test("Should throw an error if not user with email is found", async (t) => {
      findUserByEmailStub.resolves(null);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "email@email.com",
          password: "Password123*",
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "Invalid credentials.");
    });

    await t.test("Should throw an error if password is incorrect", async (t) => {
      findUserByEmailStub.resolves({
        id: 1,
        email: "email@email.com",
        password: "password",
        createdAt: new Date(),
        updatedAt: new Date(),
        firstName: null,
        lastName: null,
      });

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "email@email.com",
          password: "Password123*",
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "Invalid credentials.");
    });

    await t.test("Should log in successfully and return token", async (t) => {
      findUserByEmailStub.resolves({
        id: 1,
        email: "email@email.com",
        password: await bcrypt.hash("Password123*", 10),
        createdAt: new Date(),
        updatedAt: new Date(),
        firstName: null,
        lastName: null,
      });

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "email@email.com",
          password: "Password123*",
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.ok(typeof response.json().jwtToken, "string");
    });

    await t.test("Should create a jwt token with correct payload", async (t) => {
      findUserByEmailStub.resolves({
        id: 1,
        email: "email@email.com",
        password: await bcrypt.hash("Password123*", 10),
        createdAt: new Date(),
        updatedAt: new Date(),
        firstName: null,
        lastName: null,
      });

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "email@email.com",
          password: "Password123*",
        },
      });

      const jwtToken = response.json().jwtToken;
      const payload = jwt.verify(jwtToken, JWT_SECRET) as jwt.JwtPayload;

      // @ts-ignore
      assert.equal(payload.exp - Math.floor(Date.now() / 1000), JWT_EXPIRATION_TIME);
      assert.equal(payload.id, 1);
      assert.equal(payload.email, "email@email.com");
      assert.equal(payload.firstName, null);
      assert.equal(payload.lastName, null);
    });
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
      findUserByEmailStub.resolves({
        id: 1,
        email: "email@email.com",
        password: "Password123*",
        createdAt: new Date(),
        updatedAt: new Date(),
        firstName: null,
        lastName: null,
      });

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
