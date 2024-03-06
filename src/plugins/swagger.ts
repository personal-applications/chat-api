import swagger, { SwaggerOptions } from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import fp from "fastify-plugin";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import config from "../config";

const errorDef = {
  type: "object",
  properties: {
    status: {
      type: "string",
      default: ReasonPhrases.OK,
    },
    code: {
      type: "number",
      default: StatusCodes.OK,
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
      default: [],
    },
  },
  required: ["status", "code", "message", "errors"],
};

export const serverErrorDefs = {
  [StatusCodes.BAD_REQUEST]: errorDef,
  [StatusCodes.INTERNAL_SERVER_ERROR]: errorDef,
};

export const authServerErrorDefs = {
  ...serverErrorDefs,
  [StatusCodes.UNAUTHORIZED]: errorDef,
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
