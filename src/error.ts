import { StatusCodes } from "http-status-codes";

interface FieldError {
  field: string;
  message: string;
}

export function createErrorResponse(code: number, message: string, fieldErrors: FieldError[] = []) {
  return {
    status: "error",
    code,
    message,
    errors: fieldErrors,
  };
}
export function createBadRequestResponse(message: string, fieldErrors: FieldError[] = []) {
  return createErrorResponse(StatusCodes.BAD_REQUEST, message, fieldErrors);
}
export function createUnauthorizedResponse(message: string, fieldErrors: FieldError[] = []) {
  return createErrorResponse(StatusCodes.UNAUTHORIZED, message, fieldErrors);
}

export function createForbiddenResponse(message: string, fieldErrors: FieldError[] = []) {
  return createErrorResponse(StatusCodes.FORBIDDEN, message, fieldErrors);
}

export function createInternalServerErrorResponse(message: string, fieldErrors: FieldError[] = []) {
  return createErrorResponse(StatusCodes.INTERNAL_SERVER_ERROR, message, fieldErrors);
}
