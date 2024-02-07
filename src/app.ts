import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import fastifyJwt from "@fastify/jwt";
import fastifyPrisma from "@joggr/fastify-prisma";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";
import { join } from "path";
import config from "./config";

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  // Place here your custom code!
  await fastify.register(fastifyPrisma, {
    clientConfig: {
      log: ["query"],
    },
  });
  await fastify.register(fastifyJwt, {
    secret: config.jwt.secret,
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
