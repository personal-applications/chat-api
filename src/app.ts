import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyPrisma from "@joggr/fastify-prisma";
import addFormats from "ajv-formats";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";
import { join } from "path";
import config from "./config";

import Ajv2019 from "ajv/dist/2019";
import { FastifySchemaValidationError } from "fastify/types/schema";
import { createBadRequestResponse, createErrorResponse } from "./error";
const ajv = new Ajv2019({
  removeAdditional: "all",
  coerceTypes: true,
});
addFormats(ajv);

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  fastify.setValidatorCompiler(({ schema }) => {
    return ajv.compile(schema);
  });
  // Place here your custom code!
  await fastify.register(fastifyPrisma, {
    clientConfig: {
      log: ["query"],
    },
  });
  await fastify.register(fastifyJwt, {
    secret: config.jwt.secret,
  });
  await fastify.register(cors);

  fastify.setErrorHandler((error, request, response) => {
    request.log.error(error);
    if (error.validation) {
      const validationError = error.validation[0] as FastifySchemaValidationError;
      return response
        .status(error.statusCode!)
        .send(createBadRequestResponse(error.message, [{ field: validationError.instancePath.replace("/", ""), message: validationError.message! }]));
    }

    return response.status(error.statusCode!).send(createErrorResponse(error.statusCode!, error.message));
  });
  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
export { app, options };
