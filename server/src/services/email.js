import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  if (!config.smtpHost) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser
      ? {
          user: config.smtpUser,
          pass: config.smtpPass,
        }
      : undefined,
  });

  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  const message = {
    from: config.smtpFrom,
    to,
    subject,
    text,
    html: html || text.replace(/\n/g, "<br>"),
  };

  if (!transport) {
    console.info("[email] SMTP not configured — message logged instead of sent:");
    console.info(`  To: ${to}`);
    console.info(`  Subject: ${subject}`);
    console.info(`  Body:\n${text}`);
    return { delivered: false, logged: true };
  }

  await transport.sendMail(message);
  return { delivered: true, logged: false };
}

export function buildPasswordResetEmail({ resetUrl }) {
  const subject = "Reset your PASSR password";
  const text = [
    "We received a request to reset your PASSR password.",
    "",
    `Reset your password: ${resetUrl}`,
    "",
    "This link expires in one hour. If you did not request a reset, you can ignore this email.",
  ].join("\n");

  return { subject, text };
}
