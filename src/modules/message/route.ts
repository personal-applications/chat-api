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
        description: "Get all users who messages with current authenticated user.",
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
                    createdAt: { type: "number" },
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
      let messages = await db.message.listConversations(request.server.prisma, { ...request.query, userId: user.id });

      const hasNextPage = messages.length > request.query.first;
      if (hasNextPage) {
        messages = messages.slice(0, request.query.first);
      }

      const userIds = _.flatten<number>(messages.map((m) => [m.fromId, m.toId])).filter((id) => id !== user.id);
      const users = await db.user.findByIds(request.server.prisma, userIds);

      const result = messages.map((m) => {
        if (m.fromId === m.toId && m.toId === user.id) {
          return {
            id: m.id,
            fromUser: user,
            toUser: user,
            content: m.content,
            createdAt: m.createdAt,
          };
        } else if (m.fromId === user.id) {
          return {
            id: m.id,
            fromUser: user,
            toUser: users.find((user) => user.id === m.toId),
            content: m.content,
            createdAt: m.createdAt,
          };
        } else if (m.toId === user.id) {
          return {
            id: m.id,
            fromUser: users.find((user) => user.id === m.fromId),
            toUser: user,
            content: m.content,
            createdAt: m.createdAt,
          };
        }
      });

      return response.status(StatusCodes.OK).send({
        items: result,
        hasNextPage,
      });
    },
  );

  server.get(
    "/messages",
    {
      schema: {
        tags: ["Message"],
        querystring: {
          type: "object",
          properties: {
            toId: { type: "number", minimum: 0 },
            first: { type: "number", minimum: 0, default: 10 },
            after: { type: "number", minimum: 0 },
          },
          required: ["toId"],
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
                    createdAt: { type: "number" },
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
      const messages = await db.message.list(request.server.prisma, { ...request.query, userId: user.id });
      const hasNextPage = messages.length > request.query.first;

      const toUser = await db.user.findById(request.server.prisma, request.query.toId);
      const result = messages.map((message) => {
        const source = _.pick(message, ["id", "content", "createdAt"]);
        return _.merge(source, {
          toUser: _.pick(toUser, ["firstName", "lastName"]),
          fromUser: _.pick(user, ["firstName", "lastName"]),
        });
      });

      return response.status(StatusCodes.OK).send({
        items: result,
        hasNextPage,
      });
    },
  );
};

export default messageRoutes;
