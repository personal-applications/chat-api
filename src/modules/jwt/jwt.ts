import { JWT } from "@fastify/jwt";
import { User } from "@prisma/client";
import jsonwebtoken from "jsonwebtoken";
import config from "../../config";

const jwt = {
  createForgotPasswordToken: (user: User) => {
    return jsonwebtoken.sign({ email: user.email }, config.jwt.secretForgotPassword, { expiresIn: config.jwt.expirationTimeForgotPassword });
  },

  createLogInToken: (jwt: JWT, user: User) => {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      { expiresIn: config.jwt.expirationTime }
    );
  },
};

export default jwt;
