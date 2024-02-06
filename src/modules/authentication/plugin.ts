import fp from "fastify-plugin";
import db from "../../db";

export const requireAuth = fp(async (fastify) => {
  fastify.addHook("onRequest", async (request) => {
    const payload = (await request.jwtVerify()) as Record<string, string>;
    const email = payload.email;

    const user = await db.user.findByEmail(fastify.prisma, email);
    if (!user) {
      throw fastify.httpErrors.unauthorized();
    }

    request.user = user;
  });
});
