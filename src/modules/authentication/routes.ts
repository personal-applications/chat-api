import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import bcrypt from "bcrypt";
import { FastifyPluginAsync } from "fastify";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import config from "../../config";
import { PASSWORD_REGEX } from "../../constants";
import { createUser, findUserByEmail, updateUserInfo } from "../../db";
import { createServerURL } from "../../helper";
import { sendMail } from "../mail/mail";
import { revokeToken } from "./service";

const routes: FastifyPluginAsync = async (fastify) => {
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
          400: {
            description: "Validation error",
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
          500: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
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
      const user = await findUserByEmail(fastify.prisma, request.body.email);
      if (user) {
        return fastify.httpErrors.badRequest("Email is not available.");
      }

      request.body.password = await bcrypt.hash(request.body.password, 10);
      await createUser(fastify.prisma, request.body.email, request.body.password, request.body.firstName, request.body.lastName);
      return response.status(StatusCodes.NO_CONTENT).send();
    }
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
              jwtToken: { type: "string" },
            },
            required: ["jwtToken"],
          },
          400: {
            description: "Validation error",
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
          500: {
            description: "Validation error",

            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
        },
      },
    },
    async (request, response) => {
      // TODO: We can cache user query from DB
      const error = fastify.httpErrors.badRequest("Invalid credentials.");

      request.body.email = request.body.email.toLowerCase();
      const user = await findUserByEmail(fastify.prisma, request.body.email);
      if (!user) {
        return error;
      }

      const isPasswordMatched = await bcrypt.compare(request.body.password, user.password);
      if (!isPasswordMatched) {
        return error;
      }

      const jwtToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expirationTime }
      );
      return response.status(StatusCodes.OK).send({ jwtToken });
    }
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
          400: {
            description: "Validation error",
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
          500: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
        },
      },
    },
    async (request, response) => {
      request.body.email = request.body.email.toLowerCase();

      const user = await findUserByEmail(fastify.prisma, request.body.email);
      const data = {
        message: "Password reset link has been sent to your email address. Please check your email (including your spam folder) for further instructions.",
      };
      if (!user) {
        const error = new Error(`Cannot find any users with existing email: ${request.body.email}`);
        request.log.info(error);
        return response.status(StatusCodes.OK).send(data);
      }

      const token = jwt.sign({ email: user.email }, config.jwt.secretForgotPassword, {
        expiresIn: config.jwt.expirationTimeForgotPassword,
      });
      const resetLink = createServerURL(`/auth/reset-password?token=${token}`);
      await sendMail<"ForgotPassword">({
        to: request.body.email,
        template: "ForgotPassword",
        data: {
          resetLink,
        },
      });

      return response.status(StatusCodes.OK).send(data);
    }
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
          400: {
            description: "Validation error",
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
          500: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
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
        const payload = jwt.verify(request.body.token, config.jwt.secretForgotPassword) as jwt.JwtPayload;
        email = payload.email;
      } catch (error) {
        return fastify.httpErrors.badRequest("Invalid token.");
      }

      const user = await findUserByEmail(fastify.prisma, email);
      if (!user) {
        return fastify.httpErrors.badRequest("Invalid token.");
      }

      const newHashedPassword = await bcrypt.hash(newPassword, 10);
      await updateUserInfo(fastify.prisma, email, { password: newHashedPassword });
      await sendMail<"ResetPasswordSuccess">({
        to: email,
        template: "ResetPasswordSuccess",
        data: {},
      });
      await revokeToken(fastify.prisma, request.body.token);

      return response.status(StatusCodes.OK).send({
        message: "Your password has been successfully reset.",
      });
    }
  );
};

export default routes;
