import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import jsonwebtoken from "jsonwebtoken";
import assert from "node:assert";
import { test } from "node:test";
import sinon from "sinon";
import config from "../../src/config";
import db from "../../src/db";
import authenticationService from "../../src/modules/authentication/service";
import jwt from "../../src/modules/jwt/jwt";
import mail from "../../src/modules/mail/mail";
import { build } from "../helper";

test("Authentication routes", async (t) => {
  const app = await build(t);

  const user: User = {
    id: 1,
    email: "email@email.com",
    password: "password",
    firstName: "firstName",
    lastName: "lastName",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const findUserByEmailStub = sinon.stub(db.user, "findByEmail");
  const createUserStub = sinon.stub(db.user, "create");
  const updateUserInfoStub = sinon.stub(db.user, "updateInfo");

  const sendMailStub = sinon.stub(mail, "send");

  const isTokenRevokedStub = sinon.stub(authenticationService, "isTokenRevoked");
  const revokeTokenStub = sinon.stub(authenticationService, "revokeToken");

  t.beforeEach(() => {
    findUserByEmailStub.reset();
    createUserStub.reset();
    updateUserInfoStub.reset();

    sendMailStub.reset();

    isTokenRevokedStub.reset();
    revokeTokenStub.reset();
  });

  await t.test("POST /auth/reset-password", async (t) => {
    await t.test("Should throw validation errors if fields are not provided", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/reset-password",
        payload: {},
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "body must have required property 'token'");
    });

    await t.test("Should throw a validation error if token is not valid", async (t) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/reset-password",
        payload: {
          token: "string",
          newPassword: "Password123*",
          confirmPassword: "Password123*",
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "Invalid token.");
    });

    await t.test("Should throw a validation error if token is revoked", async (t) => {
      const token = jwt.createForgotPasswordToken(user);
      isTokenRevokedStub.resolves(true);

      const response = await app.inject({
        method: "POST",
        url: "/auth/reset-password",
        payload: {
          token: token,
          newPassword: "Password123*",
          confirmPassword: "Password123*",
        },
      });

      assert.equal(response.statusCode, StatusCodes.BAD_REQUEST);
      assert.equal(response.json().message, "Invalid token.");
    });

    await t.test("Should reset password successfully", async (t) => {
      const token = jwt.createForgotPasswordToken(user);
      isTokenRevokedStub.resolves(false);
      findUserByEmailStub.resolves(user);
      sendMailStub.resolves();
      updateUserInfoStub.resolves();
      revokeTokenStub.resolves();

      const response = await app.inject({
        method: "POST",
        url: "/auth/reset-password",
        payload: {
          token: token,
          newPassword: "Password123*",
          confirmPassword: "Password123*",
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.equal(response.json().message, "Your password has been successfully reset.");
      assert.equal(sendMailStub.called, true);
      assert.equal(updateUserInfoStub.called, true);
      assert.equal(revokeTokenStub.called, true);
    });
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
      findUserByEmailStub.resolves(null);

      const response = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        payload: {
          email: "email@email.com",
        },
      });

      assert.equal(response.statusCode, StatusCodes.OK);
      assert.equal(sendMailStub.called, false);
    });

    await t.test("Should send an email to users if email is found", async (t) => {
      findUserByEmailStub.resolves({
        id: 1,
        email: "email@email.com",
        password: "password",
        firstName: null,
        lastName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      sendMailStub.resolves();

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
      assert.equal(sendMailStub.called, true);
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
      assert.ok(typeof response.json().jwt, "string");
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

      const jwt = response.json().jwt;
      const payload = jsonwebtoken.verify(jwt, config.jwt.secret) as jsonwebtoken.JwtPayload;

      assert.equal((payload.exp ?? 0) - Math.floor(Date.now() / 1000), config.jwt.expirationTime);
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
