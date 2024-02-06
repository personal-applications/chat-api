import swagger, { SwaggerOptions } from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import fp from "fastify-plugin";
import { ReasonPhrases } from "http-status-codes";

export const serverErrorDefs = {
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
};

export const authServerErrorDefs = {
  ...serverErrorDefs,
  401: {
    description: ReasonPhrases.UNAUTHORIZED,
    type: "object",
    properties: {
      message: { type: "string" },
    },
    required: ["message"],
  },
};

export default fp<SwaggerOptions>(async (fastify) => {
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: "Chat API",
        version: "1.0.0",
      },
      host: "localhost:3000",
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/api-doc",
  });
});
