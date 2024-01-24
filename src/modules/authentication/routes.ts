import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import bcrypt from "bcrypt";
import { FastifyPluginAsync } from "fastify";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { JWT_EXPIRATION_TIME, JWT_EXPIRATION_TIME_FORGOT_PASSWORD, JWT_SECRET, JWT_SECRET_FORGOT_PASSWORD } from "../../config";
import { PASSWORD_REGEX } from "../../constants";
import { createUser, findUserByEmail } from "../../db";
import { createServerURL } from "../../helper";
import { sendMail } from "../mail/mail";

const routes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  // Authentication
  server.post(
    "/auth/register",
    {
      schema: {
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
      },
    },
    async (request, response) => {
      const { password, confirmPassword } = request.body;
      if (password !== confirmPassword) {
        const error = fastify.httpErrors.badRequest("Passwords do not match.");
        return response.send(error);
      }

      request.body.email = request.body.email.toLowerCase();
      // TODO: We can cache user query from DB
      const user = await findUserByEmail(fastify.prisma, request.body.email);
      if (user) {
        const error = fastify.httpErrors.badRequest("Email is not available.");
        return response.send(error);
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
        body: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", pattern: PASSWORD_REGEX },
          },
          required: ["email", "password"],
        },
      },
    },
    async (request, response) => {
      // TODO: We can cache user query from DB
      const error = fastify.httpErrors.badRequest("Invalid credentials.");

      request.body.email = request.body.email.toLowerCase();
      const user = await findUserByEmail(fastify.prisma, request.body.email);
      if (!user) {
        return response.send(error);
      }

      const isPasswordMatched = await bcrypt.compare(request.body.password, user.password);
      if (!isPasswordMatched) {
        return response.send(error);
      }

      const jwtToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION_TIME }
      );
      return response.status(StatusCodes.OK).send({ jwtToken });
    }
  );
  server.post(
    "/auth/forgot-password",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
          },
          required: ["email"],
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
        return response.status(StatusCodes.OK).send(data);
      }

      const token = jwt.sign({ email: user.email }, JWT_SECRET_FORGOT_PASSWORD, {
        expiresIn: JWT_EXPIRATION_TIME_FORGOT_PASSWORD,
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
        body: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
          },
          required: ["email"],
        },
      },
    },
    () => {}
  );
};

export default routes;
