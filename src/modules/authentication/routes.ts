import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import bcrypt from "bcrypt";
import { FastifyPluginAsync, errorCodes } from "fastify";
import { StatusCodes } from "http-status-codes";
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
        return response.status(StatusCodes.BAD_REQUEST).send(new errorCodes.FST_ERR_VALIDATION("Passwords do not match."));
      }

      request.body.email = request.body.email.toLowerCase();
      const user = await findUserByEmail(fastify.prisma, request.body.email);
      if (user) {
        return response.status(StatusCodes.BAD_REQUEST).send(new errorCodes.FST_ERR_VALIDATION("Email is not available."));
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
    () => {}
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
