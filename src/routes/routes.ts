import { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../modules/authentication/plugin";
import authenticationRoutes from "../modules/authentication/routes";
import messageRoutes from "../modules/message/route";

const authRoutes: FastifyPluginAsync = async (fastify, ops) => {
  fastify.register(async (ctx) => {
    ctx.register(requireAuth);
    await messageRoutes(ctx, ops);
  });
};

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  await authenticationRoutes(fastify, opts);
  await authRoutes(fastify, opts);
};

export default route;
