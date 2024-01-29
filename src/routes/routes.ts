import { FastifyPluginAsync } from "fastify";
import authenticationRoutes from "../modules/authentication/routes";
import messageRoutes from "../modules/message/route";

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  await authenticationRoutes(fastify, opts);
  await messageRoutes(fastify, opts);
};

export default route;
