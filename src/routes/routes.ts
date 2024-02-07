import { FastifyPluginAsync } from "fastify";
import authenticationRoutes from "../modules/authentication/routes";
import messageRoutes from "../modules/message/route";

const authRoutes: FastifyPluginAsync = async (fastify, ops) => {
  fastify.register(async (ctx) => {
    ctx.addHook("onRequest", async (request) => {
      try {
        await request.jwtVerify();
      } catch (error) {
        throw error;
      }
    });

    await messageRoutes(ctx, ops);
  });
};

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  await authenticationRoutes(fastify, opts);
  await authRoutes(fastify, opts);
};

export default route;
