import ejs from "ejs";
import { Resend } from "resend";
import config from "../../config";

const resend = new Resend(config.resend.apiKey);

export type Template = "ForgotPassword" | "ResetPasswordSuccess";
export type TemplateOption<T extends Template> = T extends "ForgotPassword"
  ? {
      resetLink: string;
    }
  : T extends "ResetPasswordSuccess"
  ? {}
  : never;
export type SendEmailOption<T extends Template> = {
  to: string;
  template: T;
  data: TemplateOption<T>;
};

const subjectByTemplate: Record<Template, string> = {
  ForgotPassword: "Reset your password",
  ResetPasswordSuccess: "Your password has been successfully reset",
};

export async function sendMail<T extends Template>(options: SendEmailOption<T>) {
  const { to, template, data } = options;

  const html = await ejs.renderFile(__dirname + `/templates/${template}.ejs`, data);
  const { data: resendData, error } = await resend.emails.send({
    from: "Noreply <noreply@trungpham.tech>",
    to: [to],
    subject: subjectByTemplate[template],
    html,
  });

  if (error) {
    return console.error({ error });
  }

  return console.log(`Send email success: ${JSON.stringify(resendData)}`);
}
