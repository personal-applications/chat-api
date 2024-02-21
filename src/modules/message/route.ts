import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { User } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import db from "../../db";
import { authServerErrorDefs } from "../../plugins/swagger";
import { cursorPaginationDefs } from "../../pagination";

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
            receiverId: { type: "number" },
          },
          required: ["content", "receiverId"],
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
      const currentUser = request.user as User;
      if (request.body.receiverId !== currentUser.id) {
        const receiver = await db.user.findById(request.server.prisma, request.body.receiverId);
        if (!receiver) {
          return fastify.httpErrors.badRequest(
            "Destination failed. The user you're trying to reach does not exist or is invalid. Please check the user ID and try again.",
          );
        }
      }

      const message = await db.message.create(request.server.prisma, {
        senderId: currentUser.id,
        receiverId: request.body.receiverId,
        content: request.body.content,
      });
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
            ...cursorPaginationDefs,
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
                    sender: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                      },
                      required: ["id", "firstName", "lastName"],
                    },
                    receiver: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                      },
                      required: ["id", "firstName", "lastName"],
                    },
                    content: { type: "string" },
                    createdAt: { type: "number" },
                  },
                  required: ["id", "sender", "receiver", "content", "createdAt"],
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
      const currentUser = request.user as User;
      let messages = await db.message.listConversations(request.server.prisma, {
        ...request.query,
        senderId: currentUser.id,
      });

      const hasNextPage = messages.length > request.query.first;
      if (hasNextPage) {
        messages = messages.slice(0, request.query.first);
      }

      const userIds = _.flatten<number>(messages.map((m) => [m.senderId, m.receiverId])).filter((id) => id !== currentUser.id);
      const users = await db.user.findByIds(request.server.prisma, userIds);

      const result = messages.map((m) => {
        return {
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          sender: users.find((user) => user.id === m.senderId) ?? currentUser,
          receiver: users.find((user) => user.id === m.receiverId) ?? currentUser,
        };
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
            receiverId: { type: "number", minimum: 0 },
            ...cursorPaginationDefs,
          },
          required: ["receiverId"],
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
                    sender: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                      },
                      required: ["id", "firstName", "lastName"],
                    },
                    receiver: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                      },
                      required: ["id", "firstName", "lastName"],
                    },
                    content: { type: "string" },
                    createdAt: { type: "number" },
                  },
                  required: ["id", "sender", "receiver", "content", "createdAt"],
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
      const sender = request.user as User;
      let messages = await db.message.list(request.server.prisma, { ...request.query, senderId: sender.id });
      const hasNextPage = messages.length > request.query.first;
      if (hasNextPage) {
        messages = messages.slice(0, request.query.first);
      }

      const selectedFields = ["id", "firstName", "lastName"];
      if (request.query.receiverId === sender.id) {
        return {
          items: messages.map((m) => {
            return {
              id: m.id,
              content: m.content,
              createdAt: m.createdAt,
              sender: _.pick(sender, selectedFields),
              receiver: _.pick(sender, selectedFields),
            };
          }),
          hasNextPage,
        };
      }

      const receiver = await db.user.findById(request.server.prisma, request.query.receiverId);
      const result = messages.map((message) => {
        return {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          sender: receiver.id === message.senderId ? _.pick(receiver, selectedFields) : _.pick(sender, selectedFields),
          receiver: receiver.id === message.receiverId ? _.pick(receiver, selectedFields) : _.pick(sender, selectedFields),
        };
      });

      return response.status(StatusCodes.OK).send({
        items: result,
        hasNextPage,
      });
    },
  );
};

export default messageRoutes;
