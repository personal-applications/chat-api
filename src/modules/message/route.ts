import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyPluginAsync } from "fastify";
import { StatusCodes } from "http-status-codes";
import { serverErrorDefs } from "../../plugins/swagger";

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
          ...serverErrorDefs,
        },
      },
    },
    async (request, response) => {
      return response.status(StatusCodes.OK).send({});
    }
  );
};

export default messageRoutes;
