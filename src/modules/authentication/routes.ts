import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import bcrypt from "bcrypt";
import { FastifyPluginAsync } from "fastify";
import { StatusCodes } from "http-status-codes";
import jsonwebtoken from "jsonwebtoken";
import _ from "lodash";
import config from "../../config";
import { PASSWORD_REGEX } from "../../constants";
import { createServerURL } from "../../helper";
import { serverErrorDefs } from "../../plugins/swagger";
import userQueries from "../db/user";
import jwt from "../jwt/jwt";
import mail from "../mail/mail";
import authenticationService from "./service";

const authenticationRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  // Authentication
  server.post(
    "/auth/register",
    {
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", pattern: PASSWORD_REGEX },
            confirmPassword: { type: "string", pattern: PASSWORD_REGEX },
            firstName: { type: "string", minLength: 2 },
            lastName: { type: "string", minLength: 2 },
          },
          required: ["email", "password", "confirmPassword"],
        },
        response: {
          204: {},
          ...serverErrorDefs,
        },
      },
    },
    async (request, response) => {
      const { password, confirmPassword } = request.body;
      if (password !== confirmPassword) {
        return fastify.httpErrors.badRequest("Passwords do not match.");
      }

      request.body.email = request.body.email.toLowerCase();
      // TODO: We can cache user query from DB
      const user = await userQueries.findFirst(server.prisma, { email: request.body.email });
      if (user) {
        return fastify.httpErrors.badRequest("Email is not available.");
      }

      request.body.password = await bcrypt.hash(request.body.password, 10);
      await userQueries.create(server.prisma, _.pick(request.body, ["email", "password", "firstName", "lastName"]));
      return response.status(StatusCodes.NO_CONTENT).send();
    },
  );
  server.post(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", pattern: PASSWORD_REGEX },
          },
          required: ["email", "password"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              jwt: { type: "string" },
            },
            required: ["jwt"],
          },
          ...serverErrorDefs,
        },
      },
    },
    async (request, response) => {
      // TODO: We can cache user query from DB
      const error = fastify.httpErrors.badRequest("Invalid credentials.");

      request.body.email = request.body.email.toLowerCase();
      const user = await userQueries.findFirst(server.prisma, { email: request.body.email });
      if (!user) {
        return error;
      }

      const isPasswordMatched = await bcrypt.compare(request.body.password, user.password);
      if (!isPasswordMatched) {
        return error;
      }

      const jwtToken = jwt.createLogInToken(user);
      return response.status(StatusCodes.OK).send({ jwt: jwtToken });
    },
  );
  server.post(
    "/auth/forgot-password",
    {
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
          },
          required: ["email"],
        },
        response: {
          200: {
            description: "Success response",
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
          ...serverErrorDefs,
        },
      },
    },
    async (request, response) => {
      request.body.email = request.body.email.toLowerCase();

      const user = await userQueries.findFirst(server.prisma, { email: request.body.email });
      const data = {
        message: "Password reset link has been sent to your email address. Please check your email (including your spam folder) for further instructions.",
      };
      if (!user) {
        const error = new Error(`Cannot find any users with existing email: ${request.body.email}`);
        request.log.info(error);
        return response.status(StatusCodes.OK).send(data);
      }

      const token = jwt.createForgotPasswordToken(user);
      const resetLink = createServerURL(`/auth/reset-password?token=${token}`);
      await mail.send<"ForgotPassword">({
        to: request.body.email,
        template: "ForgotPassword",
        data: {
          resetLink,
        },
      });

      return response.status(StatusCodes.OK).send(data);
    },
  );
  server.post(
    "/auth/reset-password",
    {
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          properties: {
            token: { type: "string" },
            newPassword: { type: "string", pattern: PASSWORD_REGEX },
            confirmPassword: { type: "string", pattern: PASSWORD_REGEX },
          },
          required: ["token", "newPassword", "confirmPassword"],
        },
        response: {
          202: {
            description: "Success response",
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
          ...serverErrorDefs,
        },
      },
    },
    async (request, response) => {
      const { newPassword, confirmPassword } = request.body;
      if (newPassword !== confirmPassword) {
        return fastify.httpErrors.badRequest("Passwords do not match.");
      }

      let email: string;
      try {
        const payload = jsonwebtoken.verify(request.body.token, config.jwt.secretForgotPassword) as jsonwebtoken.JwtPayload;
        email = payload.email;
      } catch (error) {
        return fastify.httpErrors.badRequest("Invalid token.");
      }

      if (await authenticationService.isTokenRevoked(server.prisma, request.body.token)) {
        return fastify.httpErrors.badRequest("Invalid token.");
      }

      const user = await userQueries.findFirst(server.prisma, { email });
      if (!user) {
        return fastify.httpErrors.badRequest("Invalid token.");
      }

      const newHashedPassword = await bcrypt.hash(newPassword, 10);
      await userQueries.update(server.prisma, { email }, { password: newHashedPassword });
      await mail.send<"ResetPasswordSuccess">({
        to: email,
        template: "ResetPasswordSuccess",
        data: {},
      });
      await authenticationService.revokeToken(server.prisma, request.body.token);

      return response.status(StatusCodes.OK).send({
        message: "Your password has been successfully reset.",
      });
    },
  );
};

export default authenticationRoutes;
