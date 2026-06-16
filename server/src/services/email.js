import nodemailer from "nodemailer";
import { config } from "../config.js";

const POSTMARK_API_URL = "https://api.postmarkapp.com/email";

let smtpTransporter;

function getSmtpTransporter() {
  if (smtpTransporter !== undefined) return smtpTransporter;

  if (!config.smtpHost) {
    smtpTransporter = null;
    return smtpTransporter;
  }

  smtpTransporter = nodemailer.createTransport({
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

  return smtpTransporter;
}

function logEmail(event, details) {
  console.info("[email]", JSON.stringify({ event, ...details }));
}

function logPostmarkResponse({ to, subject, tag, status, data, ok }) {
  logEmail("postmark_response", {
    ok,
    status,
    to,
    subject,
    tag: tag || null,
    messageId: data?.MessageID || null,
    submittedAt: data?.SubmittedAt || null,
    errorCode: data?.ErrorCode || null,
    message: data?.Message || null,
  });
}

async function sendViaPostmark({ to, subject, text, html, tag }) {
  const payload = {
    From: config.mailFrom,
    To: to,
    Subject: subject,
    TextBody: text,
    HtmlBody: html || text.replace(/\n/g, "<br>"),
    MessageStream: config.postmarkMessageStream,
  };

  if (tag) payload.Tag = tag;

  const response = await fetch(POSTMARK_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": config.postmarkApiToken,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  logPostmarkResponse({ to, subject, tag, status: response.status, data, ok: response.ok });

  if (!response.ok) {
    const message = data.Message || data.message || `Postmark error (${response.status})`;
    throw new Error(message);
  }

  return { delivered: true, provider: "postmark", messageId: data.MessageID, postmark: data };
}

async function sendViaSmtp({ to, subject, text, html }) {
  const transport = getSmtpTransporter();
  if (!transport) return null;

  await transport.sendMail({
    from: config.mailFrom,
    to,
    subject,
    text,
    html: html || text.replace(/\n/g, "<br>"),
  });

  return { delivered: true, provider: "smtp" };
}

function sendViaFallback({ to, subject, text }) {
  logEmail("send_simulated", {
    to,
    subject,
    provider: "none",
    reason: "No mail provider configured",
    preview: text.split("\n").slice(0, 4).join(" | "),
  });
  return { delivered: false, logged: true, provider: "none" };
}

export async function sendEmail({ to, subject, text, html, tag }) {
  const provider = config.postmarkApiToken ? "postmark" : config.smtpHost ? "smtp" : "none";

  logEmail("send_start", {
    to,
    subject,
    tag: tag || null,
    provider,
  });

  try {
    let result;

    if (config.postmarkApiToken) {
      result = await sendViaPostmark({ to, subject, text, html, tag });
    } else {
      const smtpResult = await sendViaSmtp({ to, subject, text, html });
      result = smtpResult || sendViaFallback({ to, subject, text });
    }

    logEmail(result.delivered ? "send_success" : "send_simulated", {
      to,
      subject,
      tag: tag || null,
      provider: result.provider,
      delivered: result.delivered,
      messageId: result.messageId || null,
    });

    return result;
  } catch (err) {
    logEmail("send_failed", {
      to,
      subject,
      tag: tag || null,
      provider,
      error: err.message,
    });
    throw err;
  }
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

  const html = `
    <p>We received a request to reset your PASSR password.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p style="color:#666;font-size:14px;">Or copy this link: ${resetUrl}</p>
    <p>This link expires in one hour. If you did not request a reset, you can ignore this email.</p>
  `.trim();

  return { subject, text, html, tag: "password-reset" };
}

export function buildSubscribeWelcomeEmail({ siteUrl }) {
  const subject = "Welcome to PASSR";
  const text = [
    "Thanks for subscribing to PASSR.",
    "",
    "You will get new engineering articles by email — backend systems, infrastructure, security, and the tools teams use in production. No digests, no sponsored filler.",
    "",
    `Read the latest: ${siteUrl}`,
    "",
    "Glad you are here.",
    "— The PASSR team",
  ].join("\n");

  const html = `
    <p>Thanks for subscribing to <strong>PASSR</strong>.</p>
    <p>You will get new engineering articles by email — backend systems, infrastructure, security, and the tools teams use in production. No digests, no sponsored filler.</p>
    <p><a href="${siteUrl}">Read the latest on PASSR</a></p>
    <p>Glad you are here.<br>— The PASSR team</p>
  `.trim();

  return { subject, text, html, tag: "subscribe-welcome" };
}

export function buildRegistrationWelcomeEmail({ name, siteUrl, verifyUrl, needsVerification }) {
  const displayName = name?.trim() || "there";
  const subject = needsVerification ? "Welcome to PASSR — activate your account" : "Welcome to PASSR";

  if (needsVerification) {
    const text = [
      `Hi ${displayName},`,
      "",
      "Thanks for creating a PASSR account.",
      "",
      "Confirm your email to join article discussions:",
      verifyUrl,
      "",
      "This link expires in 24 hours. If you did not create an account, you can ignore this email.",
      "",
      `Browse articles: ${siteUrl}`,
      "",
      "— The PASSR team",
    ].join("\n");

    const html = `
      <p>Hi ${displayName},</p>
      <p>Thanks for creating a <strong>PASSR</strong> account.</p>
      <p><a href="${verifyUrl}">Activate your account</a></p>
      <p style="color:#666;font-size:14px;">Or copy this link: ${verifyUrl}</p>
      <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
      <p><a href="${siteUrl}">Browse articles on PASSR</a></p>
      <p>— The PASSR team</p>
    `.trim();

    return { subject, text, html, tag: "registration-welcome" };
  }

  const text = [
    `Hi ${displayName},`,
    "",
    "Thanks for creating a PASSR account. You are all set to join article discussions.",
    "",
    `Browse articles: ${siteUrl}`,
    "",
    "— The PASSR team",
  ].join("\n");

  const html = `
    <p>Hi ${displayName},</p>
    <p>Thanks for creating a <strong>PASSR</strong> account. You are all set to join article discussions.</p>
    <p><a href="${siteUrl}">Browse articles on PASSR</a></p>
    <p>— The PASSR team</p>
  `.trim();

  return { subject, text, html, tag: "registration-welcome" };
}
