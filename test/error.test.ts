import assert from "node:assert";
import { test } from "node:test";
import {
  createBadRequestResponse,
  createErrorResponse,
  createForbiddenResponse,
  createInternalServerErrorResponse,
  createUnauthorizedResponse,
} from "../src/error";

test("createErrorResponse", () => {
  const response = createErrorResponse(400, "Bad Request", [{ field: "username", message: "Username is required" }]);
  assert.deepStrictEqual(response, {
    status: "error",
    code: 400,
    message: "Bad Request",
    errors: [{ field: "username", message: "Username is required" }],
  });
});

test("createBadRequestResponse", () => {
  const response = createBadRequestResponse("Bad Request", [{ field: "username", message: "Username is required" }]);
  assert.deepStrictEqual(response, {
    status: "error",
    code: 400,
    message: "Bad Request",
    errors: [{ field: "username", message: "Username is required" }],
  });
});

test("createUnauthorizedResponse", () => {
  const response = createUnauthorizedResponse("Unauthorized", [{ field: "token", message: "Invalid token" }]);
  assert.deepStrictEqual(response, {
    status: "error",
    code: 401,
    message: "Unauthorized",
    errors: [{ field: "token", message: "Invalid token" }],
  });
});

test("createForbiddenResponse", () => {
  const response = createForbiddenResponse("Forbidden", [{ field: "role", message: "Insufficient permissions" }]);
  assert.deepStrictEqual(response, {
    status: "error",
    code: 403,
    message: "Forbidden",
    errors: [{ field: "role", message: "Insufficient permissions" }],
  });
});

test("createInternalServerErrorResponse", () => {
  const response = createInternalServerErrorResponse("Internal Server Error", []);
  assert.deepStrictEqual(response, {
    status: "error",
    code: 500,
    message: "Internal Server Error",
    errors: [],
  });
});
