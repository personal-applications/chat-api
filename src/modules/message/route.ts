import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { User } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { StatusCodes } from "http-status-codes";
import db from "../../db";
import { authServerErrorDefs } from "../../plugins/swagger";

const messageRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const server = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  server.post(
    "/messages",
    {
      schema: {
        tags: ["Message"],
        body: {
          type: "object",
          properties: {
            content: { type: "string", minLength: 1 },
            toId: { type: "number" },
          },
          required: ["content", "toId"],
        },
        response: {
          200: {
            type: "object",
            properties: { id: { type: "number" } },
            required: ["id"],
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
      const user = request.user as User;
      if (request.body.toId !== user.id) {
        const toUser = await db.user.findById(request.server.prisma, request.body.toId);
        if (!toUser) {
          return fastify.httpErrors.badRequest(
            "Destination failed. The user you're trying to reach does not exist or is invalid. Please check the user ID and try again."
          );
        }
      }

      const message = await db.message.create(request.server.prisma, (request.user as User).id, request.body.content, request.body.toId);
      return response.status(StatusCodes.OK).send({ id: message.id });
    }
  );
};

export default messageRoutes;
