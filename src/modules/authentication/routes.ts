import createError from "@fastify/error";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import bcrypt from "bcrypt";
import { FastifyPluginAsync } from "fastify";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { JWT_EXPIRATION_TIME, JWT_SECRET } from "../../config";
import { PASSWORD_REGEX } from "../../constants";
import { createUser, findUserByEmail } from "../../db";

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
        const E = createError("FST_ERR_VALIDATION", "Passwords do not match.", StatusCodes.BAD_REQUEST);
        return response.send(new E());
      }

      request.body.email = request.body.email.toLowerCase();
      // TODO: We can cache user query from DB
      const user = await findUserByEmail(fastify.prisma, request.body.email);
      if (user) {
        const E = createError("FST_ERR_VALIDATION", "Email is not available.", StatusCodes.BAD_REQUEST);
        return response.send(new E());
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
      const E = createError("FST_ERR_BAD_STATUS_CODE", "Invalid credentials.", StatusCodes.BAD_REQUEST);

      request.body.email = request.body.email.toLowerCase();
      const user = await findUserByEmail(fastify.prisma, request.body.email);
      if (!user) {
        return response.send(new E());
      }

      const isPasswordMatched = await bcrypt.compare(request.body.password, user.password);
      if (!isPasswordMatched) {
        return response.send(new E());
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
    () => {}
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
