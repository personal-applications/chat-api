import swagger, { SwaggerOptions } from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import fp from "fastify-plugin";

export default fp<SwaggerOptions>(async (fastify) => {
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: "Chat API",
        version: "1.0.0",
      },
      host: "localhost:3000",
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/api-doc",
  });
});
