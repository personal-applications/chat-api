export const JWT_SECRET = process.env.JWT_SECRET ?? "";
export const JWT_EXPIRATION_TIME = Number(process.env.JWT_EXPIRATION_TIME ?? 0);

export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

export const BACKEND_DOMAIN = process.env.BACKEND_DOMAIN ?? "";

export const JWT_SECRET_FORGOT_PASSWORD = process.env.JWT_SECRET_FORGOT_PASSWORD ?? "";
export const JWT_EXPIRATION_TIME_FORGOT_PASSWORD = Number(process.env.JWT_EXPIRATION_TIME_FORGOT_PASSWORD ?? 0);
