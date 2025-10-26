import nodemailer from "nodemailer";
import crypto from "crypto";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  APP_BASE_URL
} = process.env;

let transporter;

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
} else {
  transporter = nodemailer.createTransport({
    jsonTransport: true
  });
  console.warn(
    "[email] SMTP credentials missing. Emails will be printed to the console instead of being delivered."
  );
}

export function buildPasswordResetLink(email) {
  const baseUrl = APP_BASE_URL || "https://example.com";
  const token = crypto.randomBytes(24).toString("hex");
  const params = new URLSearchParams({ email, token }).toString();
  return `${baseUrl.replace(/\/$/, "")}/reset-password?${params}`;
}

export async function sendPasswordResetEmail({ name, email }) {
  const resetLink = buildPasswordResetLink(email);
  const mailOptions = {
    from: process.env.MAIL_FROM || `"Portfolio Builder" <no-reply@example.com>`,
    to: email,
    subject: "Set up your password",
    html: `
      <h2>Welcome${name ? `, ${name}` : ""}!</h2>
      <p>We created a personalized portfolio for you. Use the link below to set your password and securely access it anytime.</p>
      <p><a href="${resetLink}" style="color:#2563eb">Reset your password</a></p>
      <p>If you did not request this, you can safely ignore the email.</p>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  let preview = undefined;

  if (info && typeof info.message === "string") {
    try {
      const parsed = JSON.parse(info.message);
      preview = parsed;
    } catch {
      preview = info.message;
    }
  } else if (info?.messageId && !info.messageId.startsWith("<")) {
    preview = info.messageId;
  }

  return {
    accepted: info.accepted ?? [],
    rejected: info.rejected ?? [],
    preview,
    resetLink
  };
}
