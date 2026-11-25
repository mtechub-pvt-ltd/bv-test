import "dotenv/config";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT
  ? Number(process.env.EMAIL_PORT)
  : 465;
const EMAIL_SECURE = process.env.EMAIL_SECURE
  ? process.env.EMAIL_SECURE === "true"
  : true;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
export const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "Watcha Gotcha";

/** CID referenced by all HTML email templates for the platform logo */
export const EMAIL_LOGO_CID = "watchagotcha-logo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const EMAIL_LOGO_PATH = path.join(
  __dirname,
  "../assets/email/logo-light.png"
);

/** Prefer SUPPORT_EMAIL for user-facing contact; fall back to from-address */
export const getSupportContactEmail = () =>
  process.env.SUPPORT_EMAIL || EMAIL_FROM;

const assertEmailConfigured = () => {
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error(
      "Email is not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env"
    );
  }
};

export const emailSent = (email, output, subject) => {
  return new Promise((resolve, reject) => {
    try {
      assertEmailConfigured();
    } catch (error) {
      return reject(error);
    }

    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: email,
      subject: subject,
      html: output,
      attachments: [
        {
          filename: "logo-light.png",
          path: EMAIL_LOGO_PATH,
          cid: EMAIL_LOGO_CID,
          contentDisposition: "inline",
        },
      ],
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Email send error:", error);
        return reject(error);
      }
      console.log("Email sent: " + info.response);
      return resolve(true);
    });
  });
};
