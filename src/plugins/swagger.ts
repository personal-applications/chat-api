import swagger, { SwaggerOptions } from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import fp from "fastify-plugin";
import { ReasonPhrases } from "http-status-codes";
import config from "../config";

const errorDef = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["error"],
    },
    code: {
      type: "number",
    },
    message: {
      type: "string",
    },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: {
            type: "string",
          },
          message: {
            type: "string",
          },
        },
        required: ["field", "message"],
      },
    },
  },
  required: ["status", "code", "message", "errors"],
};
export const serverErrorDefs = {
  400: {
    description: "Validation error",
    ...errorDef,
  },
  500: errorDef,
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
          url: `http://localhost:${config.backend.port}`,
        },
        {
          url: `http://localhost:8080/api`,
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
