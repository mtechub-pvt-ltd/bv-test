import { getSupportContactEmail, EMAIL_LOGO_CID } from "./EmailSent.js";
import "dotenv/config";

const displayName = (name) => {
  const trimmed = name != null ? String(name).trim() : "";
  return trimmed || "there";
};

const formatOtp = (otpCode) => String(otpCode ?? "").replace(/\D/g, "");

const appLink = () => process.env.APP_LINK || "#";

/**
 * Shared transactional layout used by every system email:
 * soft gray page, platform logo, white card, orange top bar, support footer.
 */
const emailShell = ({
  title,
  name,
  previewText,
  bodyHtml,
  supportEmail,
  headerSubtitle = "Watcha Gotcha",
}) => {
  const logoBlock = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr>
        <td align="center">
          <img
            src="cid:${EMAIL_LOGO_CID}"
            alt="Watcha Gotcha"
            width="150"
            style="display:block;margin:0 auto;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none;mix-blend-mode:multiply;background-color:transparent;"
          />
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:10px;font-size:11px;color:#9CA3AF;letter-spacing:0.3px;">
          ${headerSubtitle}
        </td>
      </tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  <!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText || title}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;margin:0 auto;">
          <tr>
            <td align="center" style="padding:0 0 24px;">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,0.04);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;line-height:4px;background-color:#EAB308;font-size:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:36px 36px 28px;">
                    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.2px;">${title}</p>
                    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4B5563;">Hi ${name},</p>
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 36px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;border-radius:8px;">
                      <tr>
                        <td style="padding:16px 18px;font-size:13px;line-height:1.55;color:#6B7280;">
                          Need help? Reach our support team at
                          <a href="mailto:${supportEmail}" style="color:#D97706;text-decoration:none;font-weight:600;">${supportEmail}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 12px 0;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.7;color:#9CA3AF;">
                This is an automated message from Watcha Gotcha.<br>
                Please do not reply directly to this email.<br>
                &copy; ${new Date().getFullYear()} Watcha Gotcha. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/** Soft mustard yellow highlight panel (OTP codes, key facts). */
const highlightBlock = (label, valueHtml, note, isCode = false) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
    <tr>
      <td align="center" style="padding:28px 20px;background-color:#FFFBEB;border-radius:10px;border:1px solid #FEF08A;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#854D0E;">${label}</p>
        <p style="margin:0;font-size:${isCode ? '36px' : '20px'};font-weight:700;letter-spacing:${isCode ? '8px' : '0px'};color:#D97706;font-family:${isCode ? `ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace` : `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`};line-height:1.2;">${valueHtml}</p>
        ${
          note
            ? `<p style="margin:14px 0 0;font-size:13px;color:#78716C;">${note}</p>`
            : ""
        }
      </td>
    </tr>
  </table>`;

const primaryButton = (label, href) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
    <tr>
      <td align="center" style="border-radius:10px;background-color:#EAB308;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#000000;text-decoration:none;border-radius:10px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;

export const forgetPasswordTemplate = (otpCode, username) => {
  const name = displayName(username);
  const supportEmail = getSupportContactEmail();
  const bodyHtml = `
    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.65;">
      We received a request to reset the password for your Watcha Gotcha account. Enter the code below to continue.
    </p>
    ${highlightBlock("Password reset code", formatOtp(otpCode), "Expires in 10 minutes", true)}
    <p style="margin:0;color:#6B7280;font-size:14px;line-height:1.6;">
      If you did not request a password reset, you can safely ignore this email.
    </p>`;
  return emailShell({
    title: "Reset your password",
    name,
    previewText: `Your password reset code is ${otpCode}`,
    bodyHtml,
    supportEmail,
    headerSubtitle: "Secure account verification",
  });
};

export const ConfirmEmailTemplate = (otpCode, username) => {
  const name = displayName(username);
  const supportEmail = getSupportContactEmail();
  const bodyHtml = `
    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.65;">
      Welcome to Watcha Gotcha. Confirm your email address with the verification code below to activate your account.
    </p>
    ${highlightBlock("Verification code", formatOtp(otpCode), "Expires in 10 minutes", true)}
    <p style="margin:0;color:#6B7280;font-size:14px;line-height:1.6;">
      If you did not create this account, please contact support right away.
    </p>`;
  return emailShell({
    title: "Verify your email",
    name,
    previewText: `Your verification code is ${otpCode}`,
    bodyHtml,
    supportEmail,
    headerSubtitle: "Secure account verification",
  });
};

export const Login2FATemplate = (otpCode, username) => {
  const name = displayName(username);
  const supportEmail = getSupportContactEmail();
  const bodyHtml = `
    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.65;">
      Use the one-time code below to finish signing in to your Watcha Gotcha account.
    </p>
    ${highlightBlock("Login code", formatOtp(otpCode), "Expires in 10 minutes", true)}
    <p style="margin:0;color:#6B7280;font-size:14px;line-height:1.6;">
      If you did not attempt to sign in, secure your account and contact support immediately.
    </p>`;
  return emailShell({
    title: "Your login code",
    name,
    previewText: `Your Watcha Gotcha login code is ${otpCode}`,
    bodyHtml,
    supportEmail,
    headerSubtitle: "Secure account verification",
  });
};

export const LoginAlertTemplate = (username, loginAtFormatted) => {
  const name = displayName(username);
  const supportEmail = getSupportContactEmail();
  
  // Format the time string to match the requested design: "24 Jul 2026 · <span style='color:#D97706'>07:11 UTC</span>"
  const formattedHtmlTime = loginAtFormatted.replace(/,\s*(.*UTC)/, ' &middot; <span style="color:#D97706;">$1</span>');

  const timeHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
      <tr>
        <td align="center" style="padding:28px 20px;background-color:#FFFBEB;border-radius:10px;border:1px solid #FEF08A;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#854D0E;">🕒 SIGN-IN TIME</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:#1F2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.2;">${formattedHtmlTime}</p>
        </td>
      </tr>
    </table>`;

  const bodyHtml = `
    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.65;">
      We detected a new sign-in to your Watcha Gotcha account. Review the details below.
    </p>
    ${timeHtml}
    <p style="margin:0;color:#6B7280;font-size:14px;line-height:1.6;">
      If this was not you, contact support immediately and change your password.
    </p>`;
  return emailShell({
    title: "New sign-in alert",
    name,
    previewText: `New sign-in detected at ${loginAtFormatted}`,
    bodyHtml,
    supportEmail,
    headerSubtitle: "Account security",
  });
};

export const WellcomeEmail = (username) => {
  const name = displayName(username);
  const supportEmail = getSupportContactEmail();
  const bodyHtml = `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.65;">
      Welcome to Watcha Gotcha — we are glad you are here. Explore creator tools, connect with the community, and start sharing your story.
    </p>
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
      Your account is ready. Jump in anytime to upload, discover, and engage.
    </p>
    ${primaryButton("Get started", appLink())}
    <p style="margin:0;color:#6B7280;font-size:14px;line-height:1.6;">
      If you did not create this account, please contact our support team.
    </p>`;
  return emailShell({
    title: "Welcome to Watcha Gotcha",
    name,
    previewText: "Your Watcha Gotcha account is ready.",
    bodyHtml,
    supportEmail,
    headerSubtitle: "Welcome aboard",
  });
};

export const SubscriptionEmail = (username) => {
  const name = displayName(username);
  const supportEmail = getSupportContactEmail();
  const bodyHtml = `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.65;">
      Thanks for subscribing. Your premium access is now active, and you can enjoy the upgraded features on Watcha Gotcha.
    </p>
    ${highlightBlock("Status", "ACTIVE", "Your subscription is confirmed")}
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
      Manage your plan anytime from your profile settings.
    </p>
    ${primaryButton("Open Watcha Gotcha", appLink())}
    <p style="margin:0;color:#6B7280;font-size:14px;line-height:1.6;">
      Questions about billing or your plan? Our support team is happy to help.
    </p>`;
  return emailShell({
    title: "Subscription confirmed",
    name,
    previewText: "Your Watcha Gotcha subscription is active.",
    bodyHtml,
    supportEmail,
    headerSubtitle: "Subscription",
  });
};

export const CancellationEmail = (username) => {
  const name = displayName(username);
  const supportEmail = getSupportContactEmail();
  const bodyHtml = `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.65;">
      Your subscription has been cancelled. You will keep access until the end of your current billing period, then your account returns to the free plan.
    </p>
    ${highlightBlock("Status", "CANCELLED", "You can resubscribe anytime")}
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
      We would love to have you back. Resubscribe from your profile whenever you are ready.
    </p>
    ${primaryButton("Back to Watcha Gotcha", appLink())}
    <p style="margin:0;color:#6B7280;font-size:14px;line-height:1.6;">
      If this cancellation was a mistake, contact support and we will help.
    </p>`;
  return emailShell({
    title: "Subscription cancelled",
    name,
    previewText: "Your Watcha Gotcha subscription has been cancelled.",
    bodyHtml,
    supportEmail,
    headerSubtitle: "Subscription",
  });
};
