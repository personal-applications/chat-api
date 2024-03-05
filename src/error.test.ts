import * as assert from "node:assert";
import { it } from "node:test";
import { FieldError, createErrorResponse } from "../src/error";

it("FieldError interface", async (t) => {
  const fieldError: FieldError = {
    field: "username",
    message: "Invalid username",
  };

  assert.equal(fieldError.field, "username");
  assert.equal(fieldError.message, "Invalid username");
});

it("FieldError interface", async (t) => {
  const fieldError: FieldError = {
    field: "username",
    message: "Invalid username",
  };

  assert.equal(fieldError.field, "username");
  assert.equal(fieldError.message, "Invalid username");
});

it("createErrorResponse function", async (t) => {
  const fieldErrors: FieldError[] = [
    { field: "email", message: "Invalid email" },
    { field: "password", message: "Invalid password" },
  ];

  const response = createErrorResponse(400, "Validation failed", fieldErrors);

  assert.equal(response.status, "error");
  assert.equal(response.code, 400);
  assert.equal(response.message, "Validation failed");
  assert.deepEqual(response.errors, fieldErrors);
});
