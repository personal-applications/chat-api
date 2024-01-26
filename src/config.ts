const jwt = {
  secret: process.env.JWT_SECRET ?? "",
  expirationTime: Number(process.env.JWT_EXPIRATION_TIME ?? 0),
  secretForgotPassword: process.env.JWT_SECRET_FORGOT_PASSWORD ?? "",
  expirationTimeForgotPassword: Number(process.env.JWT_EXPIRATION_TIME_FORGOT_PASSWORD ?? 0),
};

const resend = {
  apiKey: process.env.RESEND_API_KEY ?? "",
};

const backend = {
  domain: process.env.BACKEND_DOMAIN ?? "",
};

export default { jwt, resend, backend };
