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
    openapi: {
      info: {
        title: "Chat API",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/api-doc",
    uiConfig: {
      persistAuthorization: true,
      tagsSorter: "alpha",
    },
  });
});
