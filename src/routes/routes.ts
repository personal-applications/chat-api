import { FastifyPluginAsync } from "fastify";
import authenticationRoutes from "../modules/authentication/routes";

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  await authenticationRoutes(fastify, opts);
};

export default route;
