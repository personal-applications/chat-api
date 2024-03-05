export interface FieldError {
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
  return createErrorResponse(400, message, fieldErrors);
}
export function createUnauthorizedResponse(message: string, fieldErrors: FieldError[] = []) {
  return createErrorResponse(401, message, fieldErrors);
}

export function createForbiddenResponse(message: string, fieldErrors: FieldError[] = []) {
  return createErrorResponse(403, message, fieldErrors);
}

export function createInternalServerErrorResponse(message: string, fieldErrors: FieldError[] = []) {
  return createErrorResponse(500, message, fieldErrors);
}
