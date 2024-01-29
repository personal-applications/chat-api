import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyPluginAsync } from "fastify";

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
          },
          required: ["content"],
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
    async (request, response) => {}
  );
};

export default messageRoutes;
