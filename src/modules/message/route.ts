import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { User } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
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
            "Destination failed. The user you're trying to reach does not exist or is invalid. Please check the user ID and try again.",
          );
        }
      }

      const message = await db.message.create(request.server.prisma, (request.user as User).id, request.body.content, request.body.toId);
      return response.status(StatusCodes.OK).send({ id: message.id });
    },
  );

  server.get(
    "/messages/conversations",
    {
      schema: {
        tags: ["Message"],
        querystring: {
          type: "object",
          properties: {
            first: { type: "number", minimum: 0, default: 10 },
            after: { type: "number", minimum: 0 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "number",
                    },
                    fromUser: {
                      type: "object",
                      properties: {
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                      },
                      required: ["firstName", "lastName"],
                    },
                    toUser: {
                      type: "object",
                      properties: {
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                      },
                      required: ["firstName", "lastName"],
                    },
                    content: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                  },
                  required: ["id", "fromUser", "toUser", "content", "createdAt"],
                },
              },
              hasNextPage: {
                type: "boolean",
              },
            },
            required: ["items", "hasNextPage"],
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
      const result = await db.message.listConversations(request.server.prisma, { ...request.query, user: user });
      return response.status(StatusCodes.OK).send(result);
    },
  );
};

export default messageRoutes;
