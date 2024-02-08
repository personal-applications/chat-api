import { User } from "@prisma/client";
import jwt from "../src/modules/jwt/jwt";

export const authenticatedUser: User = {
  id: 1,
  email: "email@email.com",
  password: "password",
  firstName: "firstName",
  lastName: "lastName",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const loginToken = jwt.createLogInToken(authenticatedUser);
