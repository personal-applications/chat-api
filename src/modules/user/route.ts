import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { User } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createNotFoundResponse } from "../../error";
import { authServerErrorDefs } from "../../plugins/swagger";
import userQueries from "../db/user";

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  server.get(
    "/users/:id",
    {
      schema: {
        tags: ["User"],
        params: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: { id: { type: "number" }, fullName: { type: "string" } },
            required: ["id", "fullName"],
          },
          ...authServerErrorDefs,
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    },
    async (request, response) => {
      const user = await userQueries.findFirst(
        request.server.prisma,
        { id: request.params.id },
        {
          id: true,
          firstName: true,
          lastName: true,
        },
      );

      if (!user) {
        return response.status(StatusCodes.NOT_FOUND).send(createNotFoundResponse("User not found."));
      }

      const data = {
        id: user.id,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
      };
      return response.status(StatusCodes.OK).send(data);
    },
  );

  server.get(
    "/users/me",
    {
      schema: {
        tags: ["User"],
        response: {
          200: {
            type: "object",
            properties: { id: { type: "number" }, fullName: { type: "string" }, email: { type: "string" } },
            required: ["id", "fullName", "email"],
          },
          ...authServerErrorDefs,
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    },
    async (request, response) => {
      const currentUser = request.user as User;
      const user = await userQueries.findFirst(
        request.server.prisma,
        { id: currentUser.id },
        {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      );

      const data = {
        id: user.id,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
      };
      return response.status(StatusCodes.OK).send(data);
    },
  );
};

export default userRoutes;
