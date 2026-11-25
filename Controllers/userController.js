import { getSingleRow, insertRow } from "../queries/common.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.config/index.js";
import {
  CancellationEmail,
  SubscriptionEmail,
  WellcomeEmail,
  forgetPasswordTemplate,
  ConfirmEmailTemplate,
  Login2FATemplate,
  LoginAlertTemplate,
} from "../utils/EmailTemplates.js";
import { emailSent } from "../utils/EmailSent.js";
import { handle_delete_photos_from_folder } from "../utils/handleDeletePhoto.js";
import { getMonthName } from "../utils/getMonth.js";
// import cloudinary from "../utils/cloudinary.js"; // LEGACY CLOUDINARY (COMMENTED OUT)
import { interleaveBadgeSearchResults, paginateBadgeSearchResults } from "../utils/badgeSearchPagination.js";
import {
  buildLoginUserPayload,
  formatLoginAlertTime,
  generateLogin2faCode,
  getTwoFaExpiryDate,
  hasActiveTwoFaCode,
  isLogin2faRequired,
  isTwoFaCodeValid,
  normalizeLoginOtp,
  userHasBadge,
} from "../utils/loginSecurity.js";
import {
  parseDaysQuery,
  resolveCreatorBadgeTier,
} from "../utils/creatorAnalyticsAccess.js";
import {
  fetchCreatorSummarySeries,
  fetchCreatorTopPosts,
  fetchCreatorPostDetail,
} from "../utils/creatorAnalyticsService.js";
import {
  getUploadLimits,
  formatFileSizeLabel,
  formatDurationLabel,
  formatUploadTierLabel,
  getTodayUploadedVideoCount,
} from "../utils/uploadLimits.js";
import { fetchTopLeaderboard } from "../utils/leaderboardService.js";
import { safeSearchWord } from "../utils/sqlSafe.js";

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;

async function completeLoginSuccess(res, row, deviceId) {
  const token = jwt.sign({ userId: row.id }, JWT_SECRET, {
    expiresIn: "30d",
  });
  await pool.query(
    `UPDATE users SET last_login_at = NOW(), two_fa_code = NULL, two_fa_code_expires_at = NULL WHERE id = $1`,
    [row.id]
  );
  // Blue / Gold badge users get a login-alert email (time only) after successful login.
  if (userHasBadge(row)) {
    const when = formatLoginAlertTime(new Date());
    const html = LoginAlertTemplate(row.username, when);
    try {
      await emailSent(row.email, html, "New login to your account");
    } catch (err) {
      console.error("login alert email failed", err);
    }
  }
  return res.status(200).json({
    statusCode: 200,
    user: buildLoginUserPayload(row, token, deviceId),
  });
}

export const login = async (req, res) => {
  const { email, password, role: rawRole, deviceId, otp } = req.body;
  const role = rawRole || "user";
  const submittedOtp = normalizeLoginOtp(otp);

  try {
    const query = `SELECT * FROM users WHERE email=$1 AND role=$2 AND is_deleted=$3`;
    const { rows } = await pool.query(query, [email, role, "FALSE"]);

    if (
      rows.length === 0 ||
      !(await bcrypt.compare(password, rows[0].password)) ||
      rows[0].role !== role
    ) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Invalid email or password" });
    }

    // Check if email is verified
    if (!rows[0].verified) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Please verify your email first before logging in", requiresEmailVerification: true, email: rows[0].email });
    }

    // Update device_id only when provided and different
    if (deviceId && rows[0]?.device_id !== deviceId) {
      const updateDeviceQuery = `UPDATE users SET device_id=$1 WHERE id=$2`;
      await pool.query(updateDeviceQuery, [deviceId, rows[0].id]);
      rows[0].device_id = deviceId;
    }

    if (rows[0].is_deleted) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Your account has been deleted." });
    }
    if (rows[0].block) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Your account has been blocked" });
    }

    let row = rows[0];

    // Free / non-badge users & Admin role logins: simple login without 2FA requirement.
    if (isLogin2faRequired(row) && row.role !== "admin" && String(req.body.role || "").toLowerCase() !== "admin") {
      if (!submittedOtp) {
        // Reuse an active code so double Sign-In / Strict Mode doesn't invalidate the email OTP.
        let code = hasActiveTwoFaCode(row) ? normalizeLoginOtp(row.two_fa_code) : null;
        let expires = row.two_fa_code_expires_at;
        if (!code) {
          code = generateLogin2faCode();
          expires = getTwoFaExpiryDate(10);
          await pool.query(
            `UPDATE users SET two_fa_code = $1, two_fa_code_expires_at = $2 WHERE id = $3`,
            [code, expires, row.id]
          );
        }
        try {
          await emailSent(
            row.email,
            Login2FATemplate(code, row.username),
            "Login verification code"
          );
        } catch (err) {
          console.error("login 2FA email failed", err);
        }
        return res.status(200).json({
          statusCode: 200,
          requires_2fa: true,
          email: row.email,
          message: "Two-factor authentication required",
        });
      }

      const fresh = await pool.query(`SELECT * FROM users WHERE id=$1`, [row.id]);
      row = fresh.rows[0];
      if (!isLogin2faRequired(row)) {
        return completeLoginSuccess(res, row, deviceId);
      }

      if (!isTwoFaCodeValid(row.two_fa_code, row.two_fa_code_expires_at, submittedOtp)) {
        return res.status(401).json({
          statusCode: 401,
          message: "Invalid or expired verification code",
        });
      }
    } else if (row.two_fa_enabled) {
      // Clear leftover 2FA state after badge downgrade / free account.
      await pool.query(
        `UPDATE users SET two_fa_enabled = FALSE, two_fa_code = NULL, two_fa_code_expires_at = NULL WHERE id = $1`,
        [row.id]
      );
      row.two_fa_enabled = false;
    }

    return completeLoginSuccess(res, row, deviceId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const register = async (req, res) => {
  try {
    const { email, username, password, confirmPassword, role, device_id, city, country, province, profession, state, region, image } =
      req.body;
      console.log("iamge",image)
    if (password !== confirmPassword) {
      return res.status(401).json({
        statusCode: 401,
        message: "Password and ConfirmPassword not matched",
      });
    }
    await pool.query("BEGIN"); // Start a transaction

    const existingUserResult = await getSingleRow("users", {
      column: "email",
      value: email,
    });
    console.log(existingUserResult);
    if (existingUserResult.length > 0) {
      await pool.query("ROLLBACK"); // Roll back the transaction
      if (!existingUserResult[0].is_deleted) {
        return res
          .status(401)
          .json({ statusCode: 401, message: "Email is already in use" });
      }
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save image value provided by frontend directly (no Cloudinary upload)
    const imageUrl = image || null;

    // Generate OTP for email verification
    const otpCode = Math.floor(1000 + Math.random() * 9000);

    const insertUserQuery =
      "INSERT INTO users (email, password, role, username, device_id, image, city, country, province, profession, state, region, code, verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *";
    const newUserResult = await pool.query(insertUserQuery, [
      email,
      hashedPassword,
      "user", // sign-up can never create an admin: the client-sent role is ignored
      username,
      device_id,
      imageUrl,
      city || null,
      country || null,
      province || null,
      profession || null,
      state || null,
      region || null,
      otpCode,
      false, // verified = false initially
    ]);
    const userId = newUserResult.rows[0].id;
    await pool.query("COMMIT"); // Commit the transaction

    // Send verification email with OTP
    const output = ConfirmEmailTemplate(otpCode, username);
    await emailSent(email, output, "Email Verification Code");

    res.status(201).json({
      statusCode: 200,
      message: "Registration successful! Please verify your email to continue.",
      email: email,
      userId: userId,
      requiresEmailVerification: true,
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal server error",
      error: error.stack,
    });
  } finally {
    await pool.query("END"); // End the transaction
  }
};
export const uploadImage = async (req, res) => {
  try {
    // You can save additional information about the image in your database
    const { userId, image } = req.body;
    const existingUserResult = await getSingleRow("users", {
      column: "id",
      value: userId,
    });

    if (existingUserResult.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not found" });
    }
    const filePath = `${image}`; // Path to the uploaded image

    // Insert the image information into your database
    const insertImageQuery =
      "UPDATE users SET image=$1 WHERE id=$2 RETURNING *";
    const result = await pool.query(insertImageQuery, [filePath, userId]);

    res.status(201).json({
      statusCode: 201,
      message: "Image uploaded successfully",
      image: {
        id: userId,
        username: result.rows[0].username,
        image: result.rows[0].image,
        role: result.rows[0].role,
        block: result.rows[0].block,
        email: result.rows[0].email,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal server error",
      error: error.stack,
    });
  }
};

export const forgetPassword = async (req, res, next) => {
  const { email, role } = req.body;
  try {
    const userEmailExistQuery =
      "SELECT * FROM users WHERE email=$1 AND role=$2";
    const userEmailExistResult = await pool.query(userEmailExistQuery, [
      email,
      role,
    ]);
    if (userEmailExistResult.rows.length === 0) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Invalid Email" });
    }
    if (userEmailExistResult.rows[0].is_deleted) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Your account has been deleted." });
    }
    if (userEmailExistResult.rows[0].block) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Your account has been blocked" });
    }
    const otpCode = Math.floor(1000 + Math.random() * 9000);
    const updateQuery = "UPDATE users SET code =$1 WHERE email=$2";
    const updateQueryResult = await pool.query(updateQuery, [otpCode, email]);
    if (updateQueryResult.rowCount === 1) {
      const output = forgetPasswordTemplate(
        otpCode,
        userEmailExistResult.rows[0].username
      );
      await emailSent(email, output, "Verification Code");
      res.status(200).json({
        statusCode: 200,
        message: "Reset password link sent successfully!",
        otp: otpCode,
        userEmailExistResult: userEmailExistResult.rows[0],
      });
    } else {
      res.status(400).json({
        statusCode: 400,
        message: "Reset passord link not sent",
      });
    }
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      error: error.stack,
      message: "Server error",
    });
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { code, email, role } = req.body;

    const veritOtpQuery =
      "UPDATE users SET code=$1 WHERE email=$2 AND code=$3 AND role=$4 RETURNING *";
    const VerifyResult = await pool.query(veritOtpQuery, [
      null,
      email,
      code,
      role,
    ]);
    if (VerifyResult.rowCount === 1) {
      // const token = jwt.sign(
      //   { email, id: VerifyResult.rows[0].id },
      //   process.env.JWT_SECRET_KEY + VerifyResult.rows[0].password,
      //   { expiresIn: "60m" }
      // );
      return res.status(200).json({
        statusCode: 200,
        message: "Otp Code verify successfully",
        userId: VerifyResult.rows[0].id,
      });
    }
    return res
      .status(401)
      .json({ statusCode: 401, message: "Invalid Otp Code" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      statusCode: 500,
      error: error.stack,
      message: "Server error",
    });
  }
};

export const verifyEmailOtp = async (req, res, next) => {
  try {
    const { code, email, role } = req.body;

    // Verify OTP and set verified = true
    const verifyEmailQuery =
      "UPDATE users SET code=$1, verified=$2 WHERE email=$3 AND code=$4 AND role=$5 RETURNING *";
    const VerifyResult = await pool.query(verifyEmailQuery, [
      null,
      true,
      email,
      code,
      role,
    ]);

    if (VerifyResult.rowCount === 1) {
      const user = VerifyResult.rows[0];
      // Generate JWT token after email verification
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "30d",
      });

      return res.status(200).json({
        statusCode: 200,
        message: "Email verified successfully! You can now login.",
        newUser: {
          id: user.id,
          token,
          username: user.username,
          email: user.email,
          role: user.role,
          block: user.block,
          is_deleted: user.is_deleted,
          device_id: user.device_id,
          image: user.image,
          city: user.city,
          country: user.country,
          province: user.province,
          profession: user.profession,
          state: user.state,
          region: user.region,
          banner_subscript_key: user.banner_subscript_key,
          premium_subscription_key: user.premium_subscription_key,
          is_premium: user.is_premium,
          is_subscribed: user.is_subscribed,
          badge: user.badge,
          badge_subscription_key: user.badge_subscription_key,
          subscription_amount: user.subscription_amount,
          created_at: user.created_at,
          updated_at: user.updated_at,
          verified: user.verified,
        },
      });
    }

    return res
      .status(401)
      .json({ statusCode: 401, message: "Invalid OTP Code or Email" });
  } catch (error) {
    console.error("Error verifying email OTP:", error);
    return res.status(500).json({
      statusCode: 500,
      error: error.stack,
      message: "Server error",
    });
  }
};

export const resendEmailVerificationOtp = async (req, res, next) => {
  try {
    const { email, role, purpose } = req.body;

    const userQuery = "SELECT * FROM users WHERE email=$1 AND role=$2";
    const userResult = await pool.query(userQuery, [email, role]);

    if (userResult.rows.length === 0) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "User not found" });
    }

    const user = userResult.rows[0];

    if (purpose === "login_2fa") {
      if (!isLogin2faRequired(user)) {
        return res.status(400).json({
          statusCode: 400,
          message: "Two-factor authentication is only available for Blue or Gold badge users",
        });
      }
      const code = generateLogin2faCode();
      const expires = getTwoFaExpiryDate(10);
      await pool.query(
        `UPDATE users SET two_fa_code=$1, two_fa_code_expires_at=$2 WHERE id=$3`,
        [normalizeLoginOtp(code), expires, user.id]
      );
      await emailSent(
        user.email,
        Login2FATemplate(code, user.username),
        "Login verification code"
      );
      return res.status(200).json({
        statusCode: 200,
        message: "Login verification code sent",
      });
    }

    if (user.verified) {
      return res.status(400).json({
        statusCode: 400,
        message: "Email is already verified",
      });
    }

    // Generate new OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000);

    // Update user with new OTP
    const updateQuery = "UPDATE users SET code=$1 WHERE email=$2";
    await pool.query(updateQuery, [otpCode, email]);

    // Send verification email with new OTP
    const output = ConfirmEmailTemplate(otpCode, user.username);
    await emailSent(email, output, "Email Verification Code");

    return res.status(200).json({
      statusCode: 200,
      message: "Verification OTP sent to your email",
    });
  } catch (error) {
    console.error("Error resending email verification OTP:", error);
    return res.status(500).json({
      statusCode: 500,
      error: error.stack,
      message: "Server error",
    });
  }
};

export const ResetPasswordLinkValidate = async (req, res, next) => {
  const { id, token } = req.body;
  const userQuery = `SELECT * FROM users WHERE id=$1`;
  const userResult = await pool.query(userQuery, [id]);
  if (userResult.rows.length === 0) {
    return res.status(401).json({ statusCode: 400, message: "Invalid Link" });
  }

  const secret = (process.env.JWT_SECRET_KEY || process.env.JWT_SECRET) + userResult.rows[0].password;

  try {
    const payload = jwt.verify(token, secret);

    if (!payload) {
      return res.status(401).json({ statusCode: 401, message: "Link Expire" });
    }

    return res.status(200).json({ status: 200, message: "Valid Link" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: 500, error, message: "Server error" });
  }
};
export const resetPassword = async (req, res, next) => {
  try {
    const {
      password,
      confirmPassword,
      id,
      // token
    } = req.body;
    if (password !== confirmPassword) {
      return res.status(401).json({
        statusCode: 401,
        message: "Password and confirm password not matched",
      });
    }
    const userEmailExistQuery = "SELECT * FROM users WHERE   id=$1";
    const userEmailExistResult = await pool.query(userEmailExistQuery, [id]);
    if (userEmailExistResult.rows.length === 0) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "User not exist" });
    }
    if (userEmailExistResult.rows[0].is_deleted) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Your account has been deleted." });
    }
    if (userEmailExistResult.rows[0].block) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Your account has been blocked" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const updateQuery = "UPDATE users SET password=$1 WHERE id=$2";
    const updateResult = await pool.query(updateQuery, [hashedPassword, id]);
    if (updateResult.rowCount === 1) {
      return res
        .status(200)
        .json({ statusCode: 200, message: "Password reset successfully" });
    }

    return res
      .status(401)
      .json({ statusCode: 401, message: "Password not updated" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({
      statusCode: 500,
      error: error.stack,
      message: "Server error",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      id,
      username,
      hide_email,
      hide_location,
      hide_profession,
      bio,
      city,
      state,
      province,
      region,
      profession,
      image,
      two_fa_enabled,
    } = req.body;
    const existingUserResult = await getSingleRow("users", {
      column: "id",
      value: id,
    });

    if (existingUserResult.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not found" });
    }

    const existing = existingUserResult[0];
    let nextTwoFa = existing.two_fa_enabled;

    if (two_fa_enabled !== undefined) {
      if (!userHasBadge(existing)) {
        return res.status(403).json({
          statusCode: 403,
          message: "Security settings require an active Blue or Gold badge",
        });
      }
      nextTwoFa = Boolean(two_fa_enabled);
    }

    const insertUserQuery =
      "UPDATE users SET username=$1, hide_email=$2, hide_location=$3, hide_profession=$4, bio=$5, city=$6, state=$7, province=$8, region=$9, profession=$10, image=$11, two_fa_enabled=$12 WHERE id=$13 RETURNING *";
    const newUserResult = await pool.query(insertUserQuery, [
      username || existing.username,
      hide_email !== undefined ? hide_email : existing.hide_email,
      hide_location !== undefined ? hide_location : existing.hide_location,
      hide_profession !== undefined ? hide_profession : existing.hide_profession,
      bio !== undefined ? bio : existing.bio,
      city !== undefined ? city : existing.city,
      state !== undefined ? state : existing.state,
      province !== undefined ? province : existing.province,
      region !== undefined ? region : existing.region,
      profession !== undefined ? profession : existing.profession,
      image !== undefined ? image : existing.image,
      nextTwoFa,
      id
    ]);
    res.status(200).json({
      statusCode: 200,
      newUser: {
        id: id,
        username: newUserResult.rows[0].username,
        role: newUserResult.rows[0].role,
        block: newUserResult.rows[0].block,
        email: newUserResult.rows[0].email,
        image: newUserResult.rows[0].image,
        banner_subscript_key: newUserResult.rows[0].banner_subscript_key,
        premium_subscription_key: newUserResult.rows[0].premium_subscription_key,
        is_premium: newUserResult.rows[0].is_premium,
        is_subscribed: newUserResult.rows[0].is_subscribed,
        badge: newUserResult.rows[0].badge,
        badge_subscription_key: newUserResult.rows[0].badge_subscription_key,
        hide_email: newUserResult.rows[0].hide_email,
        hide_location: newUserResult.rows[0].hide_location,
        hide_profession: newUserResult.rows[0].hide_profession,
        bio: newUserResult.rows[0].bio,
        city: newUserResult.rows[0].city,
        state: newUserResult.rows[0].state,
        province: newUserResult.rows[0].province,
        region: newUserResult.rows[0].region,
        profession: newUserResult.rows[0].profession,
        two_fa_enabled: isLogin2faRequired(newUserResult.rows[0]),
        created_at: newUserResult.rows[0].created_at,
        updated_at: newUserResult.rows[0].updated_at,
      },
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal server error",
      error: error.stack,
    });
  } finally {
    await pool.query("END"); // End the transaction
  }
};

export const getSpecificUser = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `SELECT * FROM users WHERE id=$1`;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "User not found" });
    }

    const likesQuery = `SELECT COUNT(*) FROM user_profile_likes WHERE liked_user_id=$1`;
    const likesResult = await pool.query(likesQuery, [id]);
    const total_likes = parseInt(likesResult.rows[0].count) || 0;

    let violations_count = 0;
    let active_posts_count = 0;
    try {
      const reportsQuery = `
        SELECT
          (SELECT COUNT(*)::int FROM item_report WHERE reported_user_id = $1) +
          (SELECT COUNT(*)::int FROM reported_user WHERE reported_user_id = $1)
        AS total_reports
      `;
      const reportsResult = await pool.query(reportsQuery, [id]);
      violations_count = parseInt(reportsResult.rows[0]?.total_reports) || 0;

      const postsQuery = `
        SELECT
          (SELECT COUNT(*)::int FROM xpi_videos WHERE user_id = $1 AND status != 'blocked') +
          (SELECT COUNT(*)::int FROM pic_tours WHERE user_id = $1 AND status != 'blocked') +
          (SELECT COUNT(*)::int FROM news WHERE user_id = $1 AND status != 'blocked') +
          (SELECT COUNT(*)::int FROM post_letters WHERE user_id = $1 AND status != 'blocked') +
          (SELECT COUNT(*)::int FROM qafi WHERE user_id = $1 AND status != 'blocked') +
          (SELECT COUNT(*)::int FROM gebc WHERE user_id = $1 AND status != 'blocked') +
          (SELECT COUNT(*)::int FROM sports WHERE user_id = $1 AND status != 'blocked') +
          (SELECT COUNT(*)::int FROM item WHERE user_id = $1 AND status != 'blocked')
        AS total_active_posts
      `;
      const postsResult = await pool.query(postsQuery, [id]);
      active_posts_count = parseInt(postsResult.rows[0]?.total_active_posts) || 0;
    } catch (e) {}

    // Mask fields based on privacy settings
    let email = rows[0].email;
    let city = rows[0].city;
    let country = rows[0].country;
    let province = rows[0].province;
    let profession = rows[0].profession;
    let state = rows[0].state;
    let region = rows[0].region;
    let bio = rows[0].bio;

    if (rows[0].hide_email) email = null;
    if (rows[0].hide_location) {
      city = null; country = null; province = null; state = null; region = null;
    }
    if (rows[0].hide_profession) profession = null;
    res.status(200).json({
      statusCode: 200,
      user: {
        id: rows[0].id,
        role: rows[0].role,
        username: rows[0].username,
        email: email,
        block: rows[0].block,
        image: rows[0].image,
        city: city,
        country: country,
        province: province,
        profession: profession,
        state: state,
        region: region,
        banner_subscript_key: rows[0].banner_subscript_key,
        premium_subscription_key: rows[0].premium_subscription_key,
        is_premium: rows[0].is_premium,
        is_subscribed: rows[0].is_subscribed,
        badge: rows[0].badge,
        badge_subscription_key: rows[0].badge_subscription_key,
        subscription_amount: rows[0].subscription_amount,
        hide_email: rows[0].hide_email,
        hide_location: rows[0].hide_location,
        hide_profession: rows[0].hide_profession,
        bio: bio,
        total_likes: total_likes,
        violations_count: violations_count,
        active_posts_count: active_posts_count,
        two_fa_enabled: isLogin2faRequired(rows[0]),
        created_at: rows[0].created_at,
        updated_at: rows[0].updated_at,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const likeUserProfile = async (req, res) => {
  try {
    const { liked_user_id, liked_by_user_id } = req.body;

    if (!liked_user_id || !liked_by_user_id) {
      return res.status(400).json({ statusCode: 400, message: "liked_user_id and liked_by_user_id are required" });
    }

    if (liked_user_id === liked_by_user_id) {
      return res.status(400).json({ statusCode: 400, message: "You cannot like your own profile" });
    }

    // Check if like already exists
    const checkQuery = "SELECT * FROM user_profile_likes WHERE liked_user_id = $1 AND liked_by_user_id = $2";
    const { rows } = await pool.query(checkQuery, [liked_user_id, liked_by_user_id]);

    if (rows.length > 0) {
      // Unlike
      const deleteQuery = "DELETE FROM user_profile_likes WHERE liked_user_id = $1 AND liked_by_user_id = $2";
      await pool.query(deleteQuery, [liked_user_id, liked_by_user_id]);
      return res.status(200).json({ statusCode: 200, message: "Profile unliked successfully", liked: false });
    } else {
      // Like
      const insertQuery = "INSERT INTO user_profile_likes (liked_user_id, liked_by_user_id) VALUES ($1, $2)";
      await pool.query(insertQuery, [liked_user_id, liked_by_user_id]);
      return res.status(200).json({ statusCode: 200, message: "Profile liked successfully", liked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error", error: error.message });
  }
};

export const getProfileLikesCount = async (req, res) => {
  try {
    const { user_id } = req.params;
    const query = "SELECT COUNT(*) FROM user_profile_likes WHERE liked_user_id = $1";
    const { rows } = await pool.query(query, [user_id]);
    const count = parseInt(rows[0].count) || 0;
    res.status(200).json({ statusCode: 200, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getUsersWhoLikedProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT u.id, u.username, u.image, u.profession, upl.created_at as liked_at
      FROM user_profile_likes upl
      JOIN users u ON upl.liked_by_user_id = u.id
      WHERE upl.liked_user_id = $1
      ORDER BY upl.created_at DESC
    `;
    const { rows } = await pool.query(query, [id]);
    res.status(200).json({ statusCode: 200, total_likes: rows.length, users: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    let page = Math.max(1, parseInt(req.query.page || 1));
    const perPage = Math.max(1, parseInt(req.query.limit || (isPaginated ? 10 : 1000)));
    const offset = (page - 1) * perPage;
    const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;

    let whereClause = `WHERE is_deleted=FALSE AND (role IS NULL OR role != 'admin')`;
    let queryParams = [];

    if (req.query.id) {
      queryParams.push(req.query.id);
      whereClause += ` AND id = $${queryParams.length}`;
    } else if (search) {
      const cleanSearch = String(search).replace(/^@+/, "");
      queryParams.push(search, cleanSearch);
      whereClause += ` AND (username ILIKE $${queryParams.length - 1} OR username ILIKE $${queryParams.length} OR email ILIKE $${queryParams.length - 1} OR email ILIKE $${queryParams.length})`;
    }

    // Count total users matching filters
    const totalUserQuery = `SELECT COUNT(*)::int AS total FROM public.users ${whereClause}`;
    const totalUsersResult = await pool.query(totalUserQuery, queryParams);
    const totalUsers = totalUsersResult.rows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));

    // Fetch matching paginated rows
    let userQuery = `SELECT * FROM public.users ${whereClause} ORDER BY created_at DESC`;
    if (isPaginated) {
      userQuery += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(perPage, offset);
    }

    const { rows } = await pool.query(userQuery, queryParams);

    return res.status(200).json({
      statusCode: 200,
      totalUsers,
      totalPages,
      currentPage: page,
      perPage,
      AllUser: rows,
      AllUsers: rows,
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error: error.message });
  }
};

export const getAllUsersByYears = async (req, res) => {
  try {
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 1000);
    const offset = (page - 1) * perPage;
    const { year } = req.query;
    let userQuery = `SELECT * FROM users WHERE EXTRACT(YEAR FROM created_at) = $1 ORDER BY created_at DESC
  `;

    if (req.query.page === undefined && req.query.limit === undefined) {
    } else {
      userQuery += ` LIMIT $2 OFFSET $3;`;
    }
    let queryParameters = [year];

    if (req.query.page !== undefined || req.query.limit !== undefined) {
      queryParameters = [year, perPage, offset];
    }

    const { rows } = await pool.query(userQuery, queryParameters);

    if (req.query.page === undefined && req.query.limit === undefined) {
      // If no pagination is applied, don't calculate totalCategories and totalPages
      res.status(200).json({
        statusCode: 200,
        totalUsers: rows.length,
        AllUsers: rows,
      });
    } else {
      // Calculate the total number of categories (without pagination)
      const totalUserQuery = `SELECT COUNT(*) AS total FROM users WHERE EXTRACT(YEAR FROM created_at) = $1`;
      const totalUsersResult = await pool.query(totalUserQuery, [year]);
      const totalUsers = totalUsersResult.rows[0].total;
      const totalPages = Math.ceil(totalUsers / perPage);

      res.status(200).json({
        statusCode: 200,
        totalUsers,
        totalPages,
        AllUser: rows,
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const countUsersByMonth = async (req, res) => {
  try {
    const { year } = req.query; // Get the year from the request query parameters

    // Check if the year is provided
    if (!year) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Year is required" });
    }

    // Construct the SQL query to count users for each month in the provided year
    const userQuery = `
      SELECT
        EXTRACT(MONTH FROM created_at) AS month,
        COUNT(id) AS user_count
      FROM
        users
      WHERE
        EXTRACT(YEAR FROM created_at) = $1
      GROUP BY
        EXTRACT(MONTH FROM created_at)
      ORDER BY
        month
    `;

    // Execute the query with the provided year as a parameter
    const { rows } = await pool.query(userQuery, [year]);

    // Create an object to store user counts by month
    const userCountsByMonth = {};

    // Initialize user counts for all months to 0
    for (let month = 1; month <= 12; month++) {
      userCountsByMonth[getMonthName(month)] = 0;
    }

    // Process the result set to update user counts
    for (const row of rows) {
      const month = getMonthName(row.month);
      userCountsByMonth[month] = row.user_count;
    }

    return res.status(200).json({
      statusCode: 200,
      userCountsByMonth,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `SELECT * FROM users WHERE id=$1`;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }
    const result = await pool.query(
      `UPDATE users SET is_deleted=TRUE,deleted_date=NOW() WHERE id=$1 RETURNING id,username,email,role,image,is_deleted,deleted_date,block`,
      [id]
    );
    res.status(200).json({
      statusCode: 200,
      deletedUser: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteAllUsers = async (req, res) => {
  try {
    // Perform a query to delete all users from the database
    const query = "DELETE FROM users RETURNING *";
    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "No users found to delete",
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: "All users deleted successfully",
      deletedUsers: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const searchUsers = async (req, res) => {
  try {
    const name = req.query.name || req.query.username || "";

    if (!name || typeof name !== "string") {
      return res.status(200).json({ statusCode: 200, totalResults: 0, Users: [] });
    }

    // Split the search query into individual words
    const searchWords = name.split(/\s+/).filter(Boolean).map(safeSearchWord);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Suppliers: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      const cleanWord = word.replace(/^@+/, "");
      return `(username ILIKE '%${cleanWord}%' OR username ILIKE '%${word}%')`;
    });

    const userQuery = `SELECT
    *
    FROM
    users
   
    WHERE ${conditions.join(" OR ")}
    ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(userQuery);
    const ordered = interleaveBadgeSearchResults(rows, {
      dateFields: ["created_at"],
    });
    return res
      .status(200)
      .json({ statusCode: 200, totalResults: ordered.length, Users: ordered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const blockUnblockUser = async (req, res) => {
  try {
    const { block, id } = req.body; // You can use a JSON request body with a "block" field
    if (block !== true && block !== false) {
      return res.status(400).json({
        statusCode: 400,
        message:
          'Invalid value for the "block" parameter. It should be either true or false.',
      });
    }
    const query = "SELECT * FROM users WHERE id = $1";
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }
    const updateQuery = "UPDATE users SET block = $1 WHERE id = $2 RETURNING *";
    const updated = await pool.query(updateQuery, [block, id]);

    const message = block
      ? "User blocked suucessfully"
      : "User unblocked successfully";

    res.status(200).json({
      statusCode: 200,
      message,
      user: updated.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const changePassword = async (req, res) => {
  const { id, currentPassword, newPassword, role } = req.body;
  try {
    const userEmailExistQuery = "SELECT * FROM users WHERE id=$1 AND role=$2";
    const { rows } = await pool.query(userEmailExistQuery, [id, role]);
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "User not found" });
    }
    if (
      !(await bcrypt.compare(currentPassword, rows[0].password)) ||
      rows[0].role !== role
    ) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Current password invalid" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateQuery = `UPDATE users SET password=$1 WHERE id=$2`;
    const updateResult = await pool.query(updateQuery, [hashedPassword, id]);
    if (updateResult.rowCount === 0) {
      return res
        .status(401)
        .json({ statusCode: 400, message: "Operation not successfull" });
    }

    res
      .status(200)
      .json({ statusCode: 200, message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const getAllDeleteUsers = async (req, res) => {
  try {
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    let page = Math.max(1, parseInt(req.query.page || 1));
    const perPage = Math.max(1, parseInt(req.query.limit || (isPaginated ? 10 : 1000)));
    const offset = (page - 1) * perPage;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let whereClause = `WHERE is_deleted = TRUE AND deleted_date >= $1`;
    let queryParameters = [ninetyDaysAgo];

    if (req.query.id) {
      queryParameters.push(req.query.id);
      whereClause += ` AND id = $${queryParameters.length}`;
    }

    const countQuery = `SELECT COUNT(*)::int AS total FROM public.users ${whereClause}`;
    const totalUsersResult = await pool.query(countQuery, queryParameters);
    const totalUsers = totalUsersResult.rows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));

    let userQuery = `
      SELECT id, username, email, role, image, is_deleted, deleted_date, block
      FROM users
      ${whereClause}
      ORDER BY deleted_date DESC
    `;

    if (isPaginated) {
      userQuery += ` LIMIT $${queryParameters.length + 1} OFFSET $${queryParameters.length + 2};`;
      queryParameters.push(perPage, offset);
    }

    const { rows } = await pool.query(userQuery, queryParameters);
    const formattedRows = rows.map((user) => ({
      ...user,
      daysLeftToRestore: Math.abs(
        Math.floor((ninetyDaysAgo - user.deleted_date) / (1000 * 60 * 60 * 24))
      ),
    }));

    return res.status(200).json({
      statusCode: 200,
      totalUsers,
      totalPages,
      currentPage: page,
      perPage,
      AllDeletedUsers: formattedRows,
    });
  } catch (error) {
    console.error("getAllDeleteUsers error:", error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error: error.message });
  }
};

export const restoreUser = async (req, res) => {
  try {
    const { id } = req.body;
    const query = `SELECT * FROM users WHERE id=$1`;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }
    await pool.query(
      `UPDATE users SET is_deleted=FALSE,deleted_date=$2 WHERE id=$1 RETURNING id,username,email,role,image,is_deleted,deleted_date,block`,
      [id, null]
    );
    res.status(200).json({
      statusCode: 200,
      restoreUser: rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const { id, badge, amount } = req.body; // You can use a JSON request body with a "block" field
    console.log(badge);
    const validBadges = ["gold", "silver", "brownze", "blue"];
    if (!validBadges.includes(badge)) {
      return res.status(400).json({
        statusCode: 400,
        message:
          'Invalid value for the "badge" parameter. It should be blue, gold, silver, or brownze',
      });
    }
    const query = "SELECT * FROM users WHERE id = $1";
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }
    const updateQuery =
      "UPDATE users SET is_subscribed = $1,badge=$2,subscription_amount=$3 WHERE id = $4 RETURNING *";
    const updated = await pool.query(updateQuery, [true, badge, amount, id]);

    const message = "User subscribe suucessfully";

    res.status(200).json({
      statusCode: 200,
      message,
      user: updated.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getAllSubscribedUser = async (req, res) => {
  try {
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    let page = Math.max(1, parseInt(req.query.page || 1));
    const perPage = Math.max(1, parseInt(req.query.limit || (isPaginated ? 10 : 1000)));
    const offset = (page - 1) * perPage;
    const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;
    const statusFilter = (req.query.status || "all").toLowerCase();
    const sort = req.query.sort || "Newest";

    let whereConditions = [
      "(u.is_deleted = FALSE OR u.is_deleted IS NULL)",
      "(u.role IS NULL OR u.role != 'admin')",
    ];
    let queryParams = [];

    if (req.query.id) {
      queryParams.push(req.query.id);
      whereConditions.push(`u.id = $${queryParams.length}`);
    } else {
      if (search) {
        queryParams.push(search);
        whereConditions.push(
          `(u.username ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length})`
        );
      }

      if (statusFilter === "paid") {
        whereConditions.push("(u.is_subscribed = TRUE OR sp.status = 'paid')");
      } else if (statusFilter === "unpaid") {
        whereConditions.push(
          "(u.is_subscribed IS NOT TRUE AND (sp.status IS NULL OR sp.status != 'paid'))"
        );
      }
    }

    let orderByClause = "ORDER BY u.created_at DESC";
    if (sort === "A-Z") {
      orderByClause = "ORDER BY u.username ASC";
    } else if (sort === "Z-A") {
      orderByClause = "ORDER BY u.username DESC";
    } else if (sort === "Oldest") {
      orderByClause = "ORDER BY u.created_at ASC";
    } else if (sort === "Newest") {
      orderByClause = "ORDER BY u.created_at DESC";
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE u.is_subscribed = TRUE OR sp.status = 'paid')::int AS paid_count,
        COUNT(*) FILTER (WHERE u.is_subscribed IS NOT TRUE AND (sp.status IS NULL OR sp.status != 'paid'))::int AS unpaid_count
      FROM users u
      LEFT JOIN LATERAL (
        SELECT status, amount_decimal, currency, created_at
        FROM stripe_payments
        WHERE user_id = u.id
        ORDER BY created_at DESC
        LIMIT 1
      ) sp ON true
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const totalUsers = countResult.rows[0]?.total || 0;
    const paidCount = countResult.rows[0]?.paid_count || 0;
    const unpaidCount = countResult.rows[0]?.unpaid_count || 0;
    const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));

    let dataQuery = `
      SELECT 
        u.id, 
        u.username, 
        u.username AS name,
        u.email, 
        u.role, 
        u.image, 
        u.is_deleted, 
        u.block,
        u.is_subscribed,
        u.is_premium,
        u.badge,
        u.subscription_amount,
        u.banner_subscript_key,
        u.premium_subscription_key,
        u.badge_subscription_key,
        u.created_at,
        CASE 
          WHEN u.is_subscribed = TRUE OR sp.status = 'paid' THEN 'paid'
          ELSE 'unpaid'
        END AS status,
        COALESCE(sp.amount_decimal::text, CASE WHEN u.subscription_amount IS NOT NULL THEN (u.subscription_amount::numeric / 100)::text ELSE NULL END, '0.00') AS amount,
        COALESCE(sp.currency, 'usd') AS currency,
        sp.created_at AS last_payment_date
      FROM users u
      LEFT JOIN LATERAL (
        SELECT status, amount_decimal, currency, created_at
        FROM stripe_payments
        WHERE user_id = u.id
        ORDER BY created_at DESC
        LIMIT 1
      ) sp ON true
      ${whereClause}
      ${orderByClause}
    `;

    if (isPaginated) {
      dataQuery += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(perPage, offset);
    }

    const { rows } = await pool.query(dataQuery, queryParams);

    return res.status(200).json({
      statusCode: 200,
      totalUsers,
      totalPages,
      currentPage: page,
      perPage,
      paidCount,
      unpaidCount,
      AllUsers: rows,
      AllSubscribedUsers: rows,
      AllDeletedUsers: rows,
    });
  } catch (error) {
    console.error("getAllSubscribedUser error:", error);
    res.status(500).json({ statusCode: 500, message: "Internal server error", error: error.message });
  }
};
export const getDashboardUserMetrics = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const startDate = req.query.startDate || yearStart;
    const endDate = req.query.endDate || today;

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        statusCode: 400,
        message: "startDate must be before or equal to endDate",
      });
    }

    const metricsQuery = `
      SELECT
        (SELECT COUNT(*)::int FROM users
         WHERE is_deleted = FALSE
         AND created_at >= $1::date
         AND created_at < ($2::date + INTERVAL '1 day')) AS total_users,
        (SELECT COUNT(*)::int FROM users
         WHERE is_deleted = FALSE
         AND COALESCE(is_premium, FALSE) = TRUE
         AND created_at >= $1::date
         AND created_at < ($2::date + INTERVAL '1 day')) AS premium_users,
        (SELECT COUNT(DISTINCT b.user_id)::int
         FROM banner b
         INNER JOIN users u ON u.id = b.user_id
         WHERE u.is_deleted = FALSE
         AND b.status = 'active'
         AND b.created_at >= $1::date
         AND b.created_at < ($2::date + INTERVAL '1 day')) AS banner_activated_users,
        (SELECT COUNT(*)::int
         FROM banner b
         INNER JOIN users u ON u.id = b.user_id
         WHERE u.is_deleted = FALSE
         AND b.status = 'active'
         AND b.created_at >= $1::date
         AND b.created_at < ($2::date + INTERVAL '1 day')) AS total_active_banners
    `;

    const monthlyQuery = `
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', $1::date),
          date_trunc('month', $2::date),
          interval '1 month'
        ) AS month_start
      ),
      user_stats AS (
        SELECT
          date_trunc('month', created_at) AS month_start,
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE COALESCE(is_premium, FALSE) = TRUE)::int AS premium_users
        FROM users
        WHERE is_deleted = FALSE
          AND created_at >= $1::date
          AND created_at < ($2::date + INTERVAL '1 day')
        GROUP BY 1
      ),
      banner_stats AS (
        SELECT
          date_trunc('month', b.created_at) AS month_start,
          COUNT(DISTINCT b.user_id)::int AS banner_activated_users
        FROM banner b
        INNER JOIN users u ON u.id = b.user_id
        WHERE u.is_deleted = FALSE
          AND b.status = 'active'
          AND b.created_at >= $1::date
          AND b.created_at < ($2::date + INTERVAL '1 day')
        GROUP BY 1
      )
      SELECT
        to_char(m.month_start, 'Mon YYYY') AS label,
        COALESCE(u.total_users, 0) AS total_users,
        COALESCE(u.premium_users, 0) AS premium_users,
        COALESCE(b.banner_activated_users, 0) AS banner_activated_users
      FROM months m
      LEFT JOIN user_stats u ON u.month_start = m.month_start
      LEFT JOIN banner_stats b ON b.month_start = m.month_start
      ORDER BY m.month_start
    `;

    const [metricsResult, monthlyResult] = await Promise.all([
      pool.query(metricsQuery, [startDate, endDate]),
      pool.query(monthlyQuery, [startDate, endDate]),
    ]);

    const row = metricsResult.rows[0];

    return res.status(200).json({
      statusCode: 200,
      startDate,
      endDate,
      totalUsers: row.total_users,
      premiumUsers: row.premium_users,
      bannerActivatedUsers: row.banner_activated_users,
      totalActiveBanners: row.total_active_banners,
      monthlyBreakdown: monthlyResult.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error",
    });
  }
};

export const getAdminDashboardStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM xpi_videos) AS total_videos,
        (SELECT COUNT(*) FROM pic_tours) AS total_pics,
        (SELECT COUNT(*) FROM item) AS total_items,
        (SELECT COUNT(*) FROM blogs) AS total_blogs,
        (SELECT COUNT(*) FROM banner) AS total_banners,
        (SELECT COUNT(*) FROM news) AS total_news,
        (SELECT COUNT(*) FROM post_letters) AS total_letters,
        (SELECT COUNT(*) FROM qafi) AS total_qafi,
        (SELECT COUNT(*) FROM gebc) AS total_gebc,
        (SELECT COUNT(*) FROM cinematics_category) AS total_cinematix,
        (SELECT COUNT(*) FROM kid_vids_category) AS total_kid_vids,
        (SELECT COUNT(*) FROM learning_hobbies_category) AS total_learnings,
        (SELECT COUNT(*) FROM fan_star_category) AS total_fan_star,
        (SELECT COUNT(*) FROM tv_progmax_category) AS total_tv_progmax
    `;

    const { rows } = await pool.query(statsQuery);
    const r = rows[0] || {};

    const data = {
      users: Number(r.total_users || 0),
      xpi_videos: Number(r.total_videos || 0),
      pic_tours: Number(r.total_pics || 0),
      item: Number(r.total_items || 0),
      blogs: Number(r.total_blogs || 0),
      banners: Number(r.total_banners || 0),
      open_letters: Number(r.total_news || 0) + Number(r.total_letters || 0) + Number(r.total_qafi || 0) + Number(r.total_gebc || 0),
      DISC: Number(r.total_news || 0) + Number(r.total_letters || 0) + Number(r.total_qafi || 0) + Number(r.total_gebc || 0),
      cinematix: Number(r.total_cinematix || 0),
      kid_vids: Number(r.total_kid_vids || 0),
      learnings: Number(r.total_learnings || 0),
      fan_star: Number(r.total_fan_star || 0),
      tv_progmax: Number(r.total_tv_progmax || 0)
    };

    return res.status(200).json({ statusCode: 200, stats: data });
  } catch (error) {
    console.error("getAdminDashboardStats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const { user_id } = req.params;
    const statsQuery = `
WITH table_counts AS (
  SELECT 'xpi_videos' AS table_name, COUNT(*) AS row_count FROM xpi_videos WHERE user_id=$1
  UNION ALL
  SELECT 'pic_tours' AS table_name, COUNT(*) AS row_count FROM pic_tours WHERE user_id=$1
  UNION ALL
  SELECT 'item' AS table_name, COUNT(*) AS row_count FROM item WHERE user_id=$1
  UNION ALL
  SELECT 'NEWS' AS table_name, COUNT(*) AS row_count FROM NEWS WHERE user_id=$1
  UNION ALL
  SELECT 'post_letters' AS table_name, COUNT(*) AS row_count FROM post_letters WHERE user_id=$1
  UNION ALL
  SELECT 'QAFI' AS table_name, COUNT(*) AS row_count FROM QAFI WHERE user_id=$1
  UNION ALL
  SELECT 'GEBC' AS table_name, COUNT(*) AS row_count FROM GEBC WHERE user_id=$1
)
SELECT json_object_agg(table_name, row_count) AS result
FROM table_counts;
`;
    const { rows } = await pool.query(statsQuery, [user_id]);
    const data = {
      xpi_videos: rows[0].result.xpi_videos,
      pic_tours: rows[0].result.pic_tours,
      item: rows[0].result.item,
      DISC:
        rows[0].result.NEWS +
        rows[0].result.post_letters +
        rows[0].result.QAFI +
        rows[0].result.GEBC,
    };
    return res.status(200).json({ statusCode: 200, stats: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserProfileSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const summaryQuery = `
      SELECT
        EXISTS(SELECT 1 FROM users WHERE id = $1 AND is_deleted = FALSE) AS "userExists",
        (SELECT COUNT(*)::int FROM xpi_videos WHERE user_id = $1) AS "videoMania",
        (SELECT COUNT(*)::int FROM pic_tours WHERE user_id = $1) AS "picTours",
        (SELECT COUNT(*)::int FROM NEWS WHERE user_id = $1) AS "onNews",
        (SELECT COUNT(*)::int FROM post_letters WHERE user_id = $1) AS "openLetters",
        (SELECT COUNT(*)::int FROM QAFI WHERE user_id = $1) AS "qafi",
        (SELECT COUNT(*)::int FROM GEBC WHERE user_id = $1) AS "ebic",
        (SELECT COUNT(*)::int FROM sports WHERE user_id = $1) AS "sports",
        (SELECT COUNT(*)::int FROM cinematics_videos WHERE user_id = $1) AS "cinematic",
        (SELECT COUNT(*)::int FROM fan_star_videos WHERE user_id = $1) AS "fanStarZone",
        (SELECT COUNT(*)::int FROM kid_vids_videos WHERE user_id = $1) AS "kidVids",
        (SELECT COUNT(*)::int FROM tv_progmax_videos WHERE user_id = $1) AS "tvProgmax",
        (SELECT COUNT(*)::int FROM learning_hobbies_videos WHERE user_id = $1) AS "learningAndHobbies",
        (SELECT COUNT(*)::int FROM item WHERE user_id = $1) AS "mondoMarket",
        (SELECT (
          (SELECT COUNT(*)::int FROM video_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM pic_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM news_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM comment_post_letter WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM qafi_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM gebc_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM sport_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM cinematics_video_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM fan_star_video_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM kid_vids_video_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM tv_progmax_video_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM learning_hobbies_video_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE) +
          (SELECT COUNT(*)::int FROM mondon_market_comment WHERE user_id = $1 AND is_deleted = FALSE AND is_hidden = FALSE)
        )) AS "totalComments"
    `;

    const { rows } = await pool.query(summaryQuery, [userId]);
    const row = rows[0] || {};
    if (!row.userExists) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }

    // Remove helper field from response payload
    const { userExists, ...counts } = row;
    return res.status(200).json({
      statusCode: 200,
      userId: Number(userId),
      counts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const sendWellcomeEmail = async (req, res) => {
  try {
    const { user_id } = req.body;
    const getQuery = `
SELECT * FROM users WHERE id=$1
`;
    const { rows } = await pool.query(getQuery, [user_id]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not exist" });
    }
    const output = WellcomeEmail(rows[0].username, new Date(Date.now()));
    await emailSent(rows[0].email, output, "Wellcome Email");
    return res
      .status(200)
      .json({ statusCode: 200, message: "wellcome email sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const sendSubsciptionEmail = async (req, res) => {
  try {
    const { user_id } = req.body;
    console.log(user_id);
    const getQuery = `
    SELECT * FROM users WHERE id=$1
`;
    const { rows } = await pool.query(getQuery, [user_id]);
    console.log(rows);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not exist" });
    }
    if (rows[0].is_deleted) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "This user is deleted" });
    }
    const output = SubscriptionEmail(rows[0].username, new Date(Date.now()));
    await emailSent(
      rows[0].email,
      output,
      "Congratulations on Your Subscription Purchase!"
    );
    return res.status(200).json({
      statusCode: 200,
      message: "subscription email sent successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const cancelSubsciptionEmail = async (req, res) => {
  try {
    const { user_id } = req.body;
    console.log(user_id);
    const getQuery = `
SELECT * FROM users WHERE id=$1
`;
    const { rows } = await pool.query(getQuery, [user_id]);
    console.log(rows);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not exist" });
    }
    const output = CancellationEmail(rows[0].username, new Date(Date.now()));
    await emailSent(rows[0].email, output, "Cancel Subscription!");
    return res
      .status(200)
      .json({ statusCode: 200, message: "Cancel Subscription successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllDataOfDeletedUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    let userQuery = `
      SELECT *
      FROM users
      WHERE is_deleted = TRUE 
      AND deleted_date >= $1 AND id=$2
      ORDER BY deleted_date DESC
    `;
    const { rows } = await pool.query(userQuery, [ninetyDaysAgo, user_id]);
    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message:
          "The user does not exist, or the user has been permanently deleted.",
      });
    }
    let xpilQuery = `
     SELECT
     v.id AS video_id,
     v.name,
     v.description,
     v.video_category,
     v.video,
     v.created_at AS video_created_at,
     v.user_id,
     u.username AS username,
     u.image AS userImage,
     (
       SELECT COALESCE(json_agg(
         json_build_object(
           'comment_id', c.id,
           'comment', c.comment,
           'user_id', c.user_id,
           'username', cu.username,
           'userimage', cu.image,
           'is_subscribed', cu.is_subscribed,
           'badge', cu.badge,
           'comment_created_at', c.created_at
         )
       ), '[]'::json)
       FROM video_comment c
       JOIN users cu ON c.user_id = cu.id
       WHERE c.video_id = v.id
     ) AS comments,
     (
       SELECT COALESCE(json_agg(
         json_build_object(
           'id', lv.id,
           'user_id', lv.user_id,
           'video_id', v.id,
           'created_at', lu.created_at,
           'updated_at', lu.updated_at
         )
       ), '[]'::json)
       FROM like_video lv
       JOIN users lu ON lv.user_id = lu.id
       WHERE lv.video_id = v.id
     ) AS likes,
     (
       SELECT count(*) FROM video_comment c WHERE c.video_id = v.id AND c.is_deleted = FALSE AND c.is_hidden = FALSE
   ) AS comment_count,
   (
       SELECT count(*) FROM like_video lv WHERE lv.video_id = v.id
   ) AS like_count
     FROM xpi_videos v
     JOIN users u ON v.user_id = u.id
     WHERE v.user_id = $1
     GROUP BY v.id, u.username, u.image
       `;

    let picTourQuery = `
 SELECT
   v.id AS pic_tour_id,
   v.name,
   v.description,
   v.pic_category,
   v.image,
   v.created_at AS tour_created_at,
   v.user_id,
   u.username AS username,
   u.image AS userImage,
   (
     SELECT COALESCE(json_agg(
       json_build_object(
         'comment_id', c.id,
         'comment', c.comment,
         'user_id', c.user_id,
         'username', cu.username,
         'userimage', cu.image,
         'comment_created_at', c.created_at
       )
     ), '[]'::json)
     FROM pic_comment c
     JOIN users cu ON c.user_id = cu.id
     WHERE c.pic_tours_id = v.id
   ) AS comments,
   (
     SELECT COALESCE(json_agg(
       json_build_object(
         'id', lv.id,
         'user_id', lv.user_id,
         'pic_tours_id', v.id,
         'created_at', lu.created_at,
         'updated_at', lu.updated_at
       )
     ), '[]'::json)
     FROM like_pic lv
     JOIN users lu ON lv.user_id = lu.id 
     WHERE lv.pic_tours_id = v.id 
   ) AS likes,
   (
    SELECT count(*) FROM pic_comment c WHERE c.pic_tours_id = v.id AND c.is_deleted = FALSE AND c.is_hidden = FALSE
) AS comment_count,
(
    SELECT count(*) FROM like_pic lv WHERE lv.pic_tours_id = v.id
) AS like_count
   FROM pic_tours v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id = $1
      GROUP BY v.id, u.username, u.image
   `;
    const qafi_query = `SELECT
   v.id AS qafi_id,
   v.description,
   v.disc_category,
   v.image,
   v.created_at AS tour_created_at,
   v.user_id,
   u.username AS username,
   u.image AS userImage,
   (
       SELECT COALESCE(json_agg(
           json_build_object(
               'comment_id', c.id,
               'comment', c.comment,
               'user_id', c.user_id,
               'username', cu.username,
               'userimage', cu.image,
               'comment_created_at', c.created_at
           )
       ), '[]'::json)
       FROM qafi_comment c
       JOIN users cu ON c.user_id = cu.id
       WHERE c.QAFI_id = v.id
   ) AS comments,
   (
       SELECT COALESCE(json_agg(
           json_build_object(
               'id', lv.id,
               'user_id', lv.user_id,
               'QAFI_id', v.id,
               'created_at', lu.created_at,
               'updated_at', lu.updated_at
           )
       ), '[]'::json)
       FROM like_qafi lv
       JOIN users lu ON lv.user_id = lu.id
       WHERE lv.QAFI_id = v.id
   ) AS likes
FROM QAFI v
JOIN users u ON v.user_id = u.id
WHERE v.user_id = $1
GROUP BY v.id, u.username, u.image;


`;

    const gebcQuery = `SELECT
    v.id AS GEBC_id,
    v.description,
    v.disc_category,
    v.image,
    v.created_at AS tour_created_at,
    v.user_id,
    u.username AS username,
    u.image AS userImage,
    (
        SELECT COALESCE(json_agg(
            json_build_object(
                'comment_id', c.id,
                'comment', c.comment,
                'user_id', c.user_id,
                'username', cu.username,
                'userimage', cu.image,
                'is_subscribed', cu.is_subscribed,
                'badge', cu.badge,
                'comment_created_at', c.created_at
            )
        ), '[]'::json)
        FROM GEBC_comment c
        JOIN users cu ON c.user_id = cu.id
        WHERE c.GEBC_id = v.id
    ) AS comments,
    (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', lv.id,
                'user_id', lv.user_id,
                'GEBC_id', v.id,
                'created_at', lu.created_at,
                'updated_at', lu.updated_at
            )
        ), '[]'::json)
        FROM like_GEBC lv
        JOIN users lu ON lv.user_id = lu.id
        WHERE lv.GEBC_id = v.id
    ) AS likes
FROM GEBC v
JOIN users u ON v.user_id = u.id
WHERE v.user_id = $1
GROUP BY v.id, u.username, u.image;

 
 `;
    const newsQuery = `SELECT
 v.id AS News_id,
 v.description,
 v.disc_category,
 v.image,
 v.created_at AS tour_created_at,
 v.user_id,
 u.username AS username,
 u.image AS userImage,
 (
     SELECT COALESCE(json_agg(
         json_build_object(
             'comment_id', c.id,
             'comment', c.comment,
             'user_id', c.user_id,
             'username', cu.username,
             'userimage', cu.image,
             'is_subscribed', cu.is_subscribed,
             'badge', cu.badge,
             'comment_created_at', c.created_at
         )
     ), '[]'::json)
     FROM NEWS_comment c
     JOIN users cu ON c.user_id = cu.id
     WHERE c.NEWS_id = v.id
 ) AS comments,
 (
     SELECT COALESCE(json_agg(
         json_build_object(
             'id', lv.id,
             'user_id', lv.user_id,
             'news_id', v.id,
             'created_at', lu.created_at,
             'updated_at', lu.updated_at
         )
     ), '[]'::json)
     FROM like_NEWS lv
     JOIN users lu ON lv.user_id = lu.id
     WHERE lv.NEWS_id = v.id
 ) AS likes
FROM NEWS v
JOIN users u ON v.user_id = u.id
WHERE v.user_id = $1
GROUP BY v.id, u.username, u.image;


`;
    const signatureQuery = `SELECT
s.id AS signature_id,
s.image AS signature_image,
s.created_at AS signature_created_at,
s.user_id AS user_id,
u.username AS username,
u.image AS userImage
FROM signature s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.user_id=$1`;
    const letterQuery = `SELECT
pl.id AS post_id,
pl.user_id,
u.username,
u.image AS userImage,
pl.post_type,
pl.receiver_type,
pl.disc_category,
d.name AS disc_category_name,
pl.name,
pl.address,
pl.email,
pl.contact_no,
pl.subject_place,
pl.post_date,
pl.greetings,
pl.introduction,
pl.body,
pl.form_of_appeal,
pl.video,
pl.signature_id,
pl.paid_status,
COALESCE(
  json_agg(
    json_build_object('id', pli.id, 'image', pli.image)
  ) FILTER (WHERE pli.id IS NOT NULL),
  '[]'::json
) AS images,

lru.username AS receiver_name,
lru.image AS reciever_image,
lri.address AS receiver_address
FROM
post_letters AS pl
LEFT JOIN
users AS u ON pl.user_id = u.id
LEFT JOIN
post_letters_images AS pli ON pl.id = pli.letter_id
LEFT JOIN
letter_reciever_info AS lri ON pl.id = lri.letter_id
LEFT JOIN
users AS lru ON lri.reciever_id = lru.id

LEFT JOIN
disc_category AS d ON pl.disc_category = d.id
WHERE
pl.user_id = $1
GROUP BY
pl.id, pl.user_id, pl.post_type, pl.receiver_type, pl.disc_category, pl.name, pl.address,
pl.email, pl.contact_no, pl.subject_place, pl.post_date, pl.greetings, pl.introduction,
pl.body, pl.form_of_appeal, pl.video, pl.signature_id, pl.paid_status, lru.username,lru.image,
u.image, lri.address, u.username,d.name;`;
    let itemQuery = `
SELECT
  item.id,
  item.user_id,
  u.username AS username,
  u.image AS userImage,
  item.item_category,
  ic.name AS item_category_name,
  item.title,
  item.region,
  item.description,
  item.price,
  item.condition,
  item.location,
  item.paid_status,
  COALESCE(ARRAY_AGG(
    JSONB_BUILD_OBJECT(
      'id', ii.id,
      'image', ii.image
    )
  ), ARRAY[]::JSONB[]) AS images
  FROM item
  LEFT JOIN item_images ii ON item.id = ii.item_id
  LEFT JOIN users u ON item.user_id = u.id
  LEFT JOIN item_category ic ON item.item_category = ic.id
  WHERE item.user_id = $1
  GROUP BY
  item.id,
  item.user_id,
  item.item_category,
  item.title,
  item.description,
  item.price,
  item.condition,
  item.location,
  item.paid_status,
  u.username,
  u.image,
  ic.name`;
    let saveItemQuery = `
  SELECT
    item.id,
    item.user_id,
    u.username AS username,
    u.image AS userImage,
    item.item_category,
    ic.name AS item_category_name,
    item.title,
    item.region,
    item.description,
    item.price,
    item.condition,
    item.location,
    item.paid_status,
    COALESCE(ARRAY_AGG(
      JSONB_BUILD_OBJECT(
        'id', ii.id,
        'image', ii.image
      )
    ), ARRAY[]::JSONB[]) AS images,
    bool_or(si.id IS NOT NULL) AS is_saved
  FROM save_item
  LEFT JOIN item  ON save_item.item_id = item.id
  LEFT JOIN item_images ii ON item.id = ii.item_id
  LEFT JOIN users u ON item.user_id = u.id
  LEFT JOIN item_category ic ON item.item_category = ic.id
  LEFT JOIN save_item si ON item.id = si.item_id AND si.user_id = $1
  WHERE save_item.user_id = $1
  GROUP BY
    item.id,
    item.user_id,
    item.item_category,
    item.title,
    item.description,
    item.price,
    item.condition,
    item.location,
    item.paid_status,
    u.username,
    u.image,
    ic.name,
    si.id
`;
    const bannerQuery = `
SELECT banner.*, users.username AS user_username, users.image AS user_image
FROM banner
LEFT JOIN users ON banner.user_id = users.id
WHERE banner.user_id = $1

`;
    let paymentQuery = `SELECT
payment.payment_detail, users.id, users.username, users.email, users.image, users.created_at FROM payment
LEFT JOIN users ON payment.user_id=users.id
WHERE users.id=$1
`;
    const [
      xpiVideos,
      picTour,
      QAFI,
      GEBC,
      NEWS,
      signature,
      letter,
      item,
      saveItem,
      banner,
      payment,
    ] = await Promise.all([
      pool.query(xpilQuery, [user_id]),
      pool.query(picTourQuery, [user_id]),
      pool.query(qafi_query, [user_id]),
      pool.query(gebcQuery, [user_id]),
      pool.query(newsQuery, [user_id]),
      pool.query(signatureQuery, [user_id]),
      pool.query(letterQuery, [user_id]),
      pool.query(itemQuery, [user_id]),
      pool.query(saveItemQuery, [user_id]),
      pool.query(bannerQuery, [user_id]),
      pool.query(paymentQuery, [user_id]),
    ]);

    res.status(200).json({
      statusCode: 200,
      DeletedUsersData: {
        user: rows[0],
        xpiVideos: xpiVideos.rows,
        picTour: picTour.rows,
        QAFI: QAFI.rows,
        GEBC: GEBC.rows,
        NEWS: NEWS.rows,
        signature: signature.rows,
        letters: letter.rows,
        item: item.rows,
        saveItems: saveItem.rows,
        banner: banner.rows,
        payment: payment.rows,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const { id } = req.body;
    const query = `SELECT * FROM users WHERE id=$1 AND is_deleted=$2`;
    const { rows } = await pool.query(query, [id, "FALSE"]);
    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }
    const update = await pool.query(
      `UPDATE users SET is_subscribed=FALSE, badge=$1, subscription_amount=$2, badge_subscription_key=$3,
        two_fa_enabled=FALSE, two_fa_code=NULL, two_fa_code_expires_at=NULL
       WHERE id=$4
       RETURNING id,username,email,role,image,is_deleted,deleted_date,block,is_subscribed,badge,subscription_amount`,
      [null, null, null, id]
    );
    if (update.rowCount === 1) {
      res.status(200).json({
        statusCode: 200,
        unsubscribedUser: update.rows[0],
      });
    } else {
      res.status(400).json({
        statusCode: 400,
        message: "Operation not successfull",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

// Helper function to delete legacy media (Cloudinary code commented out)
const deleteFromCloudinary = async (publicIds = []) => {
  /* LEGACY CLOUDINARY DELETION (COMMENTED OUT)
  try {
    const results = [];
    for (const id of publicIds) {
      if (!id) continue;
      const publicId = id.split("/").pop().split(".")[0];
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
      results.push({ id, result });
    }
    return results;
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    throw error;
  }
  */
  return [];
};

// Controller function
export const accountDeletePermanently = async (req, res) => {
  const { id } = req.params;

  try {
    const userQuery = `SELECT * FROM users WHERE id = $1 `;
    const { rows } = await pool.query(userQuery, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found or not marked as deleted.",
      });
    }

    await pool.query("BEGIN");

    // 1. Collect Cloudinary public IDs
    const cloudinaryPublicIds = [];

    const queries = [
      `SELECT video, thumbnail FROM xpi_videos WHERE user_id = $1`,
      `SELECT image FROM pic_tours WHERE user_id = $1`,
      `SELECT image FROM QAFI WHERE user_id = $1
        UNION SELECT image FROM GEBC WHERE user_id = $1
        UNION SELECT image FROM NEWS WHERE user_id = $1`,
      `SELECT image FROM item_images WHERE item_id IN (SELECT id FROM item WHERE user_id = $1)`,
      `SELECT image FROM post_letters_images WHERE letter_id IN (SELECT id FROM post_letters WHERE user_id = $1)`,
      `SELECT image FROM signature WHERE user_id = $1`,
      `SELECT image FROM banner WHERE user_id = $1`,
    ];

    for (const query of queries) {
      const res = await pool.query(query, [id]);
      res.rows.forEach((row) => {
        for (const key in row) {
          if (row[key]) cloudinaryPublicIds.push(row[key]);
        }
      });
    }

    // const uniquePublicIds = [...new Set(cloudinaryPublicIds)].filter(Boolean);
    // await deleteFromCloudinary(uniquePublicIds);

    // 2. Delete related data from dependent tables
    const relatedTables = [
      "video_comment",
      "like_video",
      "viewed_video",
      "xpi_videos",
      "pic_comment",
      "like_pic",
      "viewed_pic",
      "pic_tours",
      "qafi_comment",
      "like_qafi",
      "QAFI",
      "GEBC_comment",
      "like_GEBC",
      "GEBC",
      "NEWS_comment",
      "like_NEWS",
      "NEWS",
      "item_images",
      "save_item",
      "send_offer",
      "item",
      "post_letters_images",
      "letter_reciever_info",
      "post_letters",
      "signature",
      "banner",
      "payment",
      "transactions",
      "cards",
      "notification",
    ];

    for (const table of relatedTables) {
      await pool
        .query(`DELETE FROM ${table} WHERE user_id = $1`, [id])
        .catch(console.warn);
    }

    // 3. Finally delete the user
    const deleteUserQuery = `DELETE FROM users WHERE id = $1 RETURNING id, email, username`;
    const deleteUserResult = await pool.query(deleteUserQuery, [id]);

    await pool.query("COMMIT");

    return res.status(200).json({
      statusCode: 200,
      message: "User and all associated media/data permanently deleted.",
      deletedUser: deleteUserResult.rows[0],
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error in accountDeletePermanently:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const filterUsers = async (req, res) => {
  try {
    const { username } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let conditions = [`is_deleted = FALSE`];
    let queryParams = [];

    // Optional username search (case-insensitive partial match)
    if (username && username.trim() !== "") {
      queryParams.push(`%${username.trim()}%`);
      conditions.push(`username ILIKE $${queryParams.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Count query for pagination metadata
    const countQuery = `SELECT COUNT(*) AS total FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalUsers = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT
        id,
        username,
        email,
        role,
        image,
        block,
        is_subscribed,
        badge,
        city,
        country,
        region,
        profession,
        is_premium,
        created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(dataQuery, queryParams);
    const paginated = paginateBadgeSearchResults(rows, page, limit, {
      dateFields: ["created_at"],
    });

    return res.status(200).json({
      statusCode: 200,
      totalUsers: paginated.total,
      totalPages: paginated.totalPages,
      currentPage: paginated.currentPage,
      limit: paginated.limit,
      users: paginated.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const saveFCMToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) {
      return res.status(400).json({ statusCode: 400, message: "userId and fcmToken are required" });
    }

    const updateQuery = "UPDATE users SET fcm_token = $1 WHERE id = $2 RETURNING id, username, fcm_token";
    const { rows } = await pool.query(updateQuery, [fcmToken, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ statusCode: 404, message: "User not found" });
    }

    res.status(200).json({
      statusCode: 200,
      message: "FCM token saved successfully",
      data: rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const removeFCMToken = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ statusCode: 400, message: "userId is required" });
    }

    const updateQuery = "UPDATE users SET fcm_token = NULL WHERE id = $1 RETURNING id, username, fcm_token";
    const { rows } = await pool.query(updateQuery, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ statusCode: 404, message: "User not found" });
    }

    res.status(200).json({
      statusCode: 200,
      message: "FCM token removed successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

async function loadCreatorBadgeTier(userId) {
  const userRes = await pool.query(
    "SELECT is_subscribed, badge FROM users WHERE id = $1 AND is_deleted = FALSE",
    [userId]
  );
  return resolveCreatorBadgeTier(userRes.rows[0] || {});
}

export const getCreatorAnalyticsSummary = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ statusCode: 401, message: "Authentication required." });
    }

    const tier = await loadCreatorBadgeTier(userId);
    if (tier === "free") {
      return res.status(403).json({
        statusCode: 403,
        message: "Analytics requires a Blue or Gold badge.",
      });
    }

    const parsed = parseDaysQuery(req.query.days, tier);
    if (!parsed.ok) {
      return res.status(400).json({ statusCode: 400, message: parsed.message });
    }

    const { totals, series } = await fetchCreatorSummarySeries(userId, parsed.days);
    return res.status(200).json({
      statusCode: 200,
      badgeTier: tier,
      days: parsed.days,
      totals,
      series,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getCreatorAnalyticsPosts = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ statusCode: 401, message: "Authentication required." });
    }

    const tier = await loadCreatorBadgeTier(userId);
    if (tier !== "gold") {
      return res.status(403).json({
        statusCode: 403,
        message: "Post analytics requires a Gold badge.",
      });
    }

    const parsed = parseDaysQuery(req.query.days, tier);
    if (!parsed.ok) {
      return res.status(400).json({ statusCode: 400, message: parsed.message });
    }

    const module = String(req.query.module || "all");
    const limit = Math.min(Number.parseInt(String(req.query.limit || "20"), 10) || 20, 50);
    const offset = Number.parseInt(String(req.query.offset || "0"), 10) || 0;

    const posts = await fetchCreatorTopPosts(userId, parsed.days, { module, limit, offset });
    return res.status(200).json({
      statusCode: 200,
      days: parsed.days,
      posts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getCreatorAnalyticsPostDetail = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ statusCode: 401, message: "Authentication required." });
    }

    const tier = await loadCreatorBadgeTier(userId);
    if (tier !== "gold") {
      return res.status(403).json({
        statusCode: 403,
        message: "Post analytics requires a Gold badge.",
      });
    }

    const parsed = parseDaysQuery(req.query.days, tier);
    if (!parsed.ok) {
      return res.status(400).json({ statusCode: 400, message: parsed.message });
    }

    const { module, postId } = req.params;
    const detail = await fetchCreatorPostDetail(userId, module, Number(postId), parsed.days);
    if (!detail) {
      return res.status(404).json({ statusCode: 404, message: "Post not found." });
    }

    return res.status(200).json({
      statusCode: 200,
      days: parsed.days,
      ...detail,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getUploadLimitsForUser = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ statusCode: 401, message: "Authentication required." });
    }

    const userRes = await pool.query(
      "SELECT is_subscribed, badge, badge_subscription_key FROM users WHERE id = $1 AND is_deleted = FALSE",
      [userId]
    );
    const limits = getUploadLimits(userRes.rows[0] || {});
    const totalToday = await getTodayUploadedVideoCount(pool, userId);
    const remainingToday = Math.max(0, limits.maxVideosPerDay - totalToday);

    return res.status(200).json({
      statusCode: 200,
      ...limits,
      tierLabel: formatUploadTierLabel(limits.badgeTier),
      videosUploadedToday: totalToday,
      videosRemainingToday: remainingToday,
      maxFileSizeLabel: formatFileSizeLabel(limits.maxFileSizeBytes),
      maxVideoDurationLabel: formatDurationLabel(limits.maxVideoDurationSec),
      maxVideosPerDayLabel: `${limits.maxVideosPerDay} videos / day`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await fetchTopLeaderboard(pool, 10);
    return res.status(200).json({ statusCode: 200, leaderboard });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getUserComments = async (req, res) => {
  try {
    const rawUserId = req.params.userId || req.params.id || req.query.user_id || req.user?.userId;
    const userId = Number(rawUserId);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: "Valid user ID is required",
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const moduleFilter = req.query.module ? String(req.query.module).trim().toLowerCase() : "all";
    const search = req.query.search ? String(req.query.search).trim() : "";

    const moduleQueries = [
      // 1. video-mania
      {
        module: "video-mania",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.video_id AS post_id,
          COALESCE(v.name, 'Video') AS post_title,
          v.thumbnail AS post_image,
          'video-mania' AS module,
          'Video Mania' AS module_name
         FROM video_comment cm
         LEFT JOIN xpi_videos v ON v.id = cm.video_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 2. pic-tours
      {
        module: "pic-tours",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.pic_tours_id AS post_id,
          COALESCE(pt.name, 'Pic Tour') AS post_title,
          pt.image AS post_image,
          'pic-tours' AS module,
          'Pic Tours' AS module_name
         FROM pic_comment cm
         LEFT JOIN pic_tours pt ON pt.id = cm.pic_tours_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 3. on-news
      {
        module: "on-news",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.news_id AS post_id,
          COALESCE(LEFT(n.description, 80), 'News') AS post_title,
          n.image AS post_image,
          'on-news' AS module,
          'On News' AS module_name
         FROM news_comment cm
         LEFT JOIN news n ON n.id = cm.news_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 4. open-letters
      {
        module: "open-letters",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.letter_id AS post_id,
          COALESCE(pl.name, 'Letter') AS post_title,
          (SELECT pli.image FROM post_letters_images pli WHERE pli.letter_id = pl.id ORDER BY pli.id ASC LIMIT 1) AS post_image,
          'open-letters' AS module,
          'Open Letters' AS module_name
         FROM comment_post_letter cm
         LEFT JOIN post_letters pl ON pl.id = cm.letter_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 5. qafi
      {
        module: "qafi",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.qafi_id AS post_id,
          COALESCE(LEFT(q.description, 80), 'QAFI') AS post_title,
          q.image AS post_image,
          'qafi' AS module,
          'QAFI' AS module_name
         FROM qafi_comment cm
         LEFT JOIN qafi q ON q.id = cm.qafi_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 6. ebic
      {
        module: "ebic",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.gebc_id AS post_id,
          COALESCE(LEFT(g.description, 80), 'EBIC') AS post_title,
          g.image AS post_image,
          'ebic' AS module,
          'EBIC' AS module_name
         FROM gebc_comment cm
         LEFT JOIN gebc g ON g.id = cm.gebc_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 7. sports-&-sports
      {
        module: "sports-&-sports",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.sport_id AS post_id,
          COALESCE(s.name, 'Sport') AS post_title,
          s.image AS post_image,
          'sports-&-sports' AS module,
          'Sports & Sports' AS module_name
         FROM sport_comment cm
         LEFT JOIN sports s ON s.id = cm.sport_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 8. cinematic
      {
        module: "cinematic",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.video_id AS post_id,
          COALESCE(c.name, 'Cinematic') AS post_title,
          c.thumbnail AS post_image,
          'cinematic' AS module,
          'Cinematic' AS module_name
         FROM cinematics_video_comment cm
         LEFT JOIN cinematics_videos c ON c.id = cm.video_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 9. fan-star-zone
      {
        module: "fan-star-zone",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.video_id AS post_id,
          COALESCE(f.name, 'Fan Star') AS post_title,
          COALESCE(f.thumbnail, f.image) AS post_image,
          'fan-star-zone' AS module,
          'Fan Star Zone' AS module_name
         FROM fan_star_video_comment cm
         LEFT JOIN fan_star_videos f ON f.id = cm.video_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 10. kid-vids
      {
        module: "kid-vids",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.video_id AS post_id,
          COALESCE(k.name, 'Kid Vid') AS post_title,
          k.thumbnail AS post_image,
          'kid-vids' AS module,
          'Kid Vids' AS module_name
         FROM kid_vids_video_comment cm
         LEFT JOIN kid_vids_videos k ON k.id = cm.video_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 11. tv-progmax
      {
        module: "tv-progmax",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.video_id AS post_id,
          COALESCE(t.name, 'TV ProgMax') AS post_title,
          t.thumbnail AS post_image,
          'tv-progmax' AS module,
          'TV ProgMax' AS module_name
         FROM tv_progmax_video_comment cm
         LEFT JOIN tv_progmax_videos t ON t.id = cm.video_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 12. learning-and-hobbies
      {
        module: "learning-and-hobbies",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.video_id AS post_id,
          COALESCE(l.name, 'Learning & Hobbies') AS post_title,
          l.thumbnail AS post_image,
          'learning-and-hobbies' AS module,
          'Learning & Hobbies' AS module_name
         FROM learning_hobbies_video_comment cm
         LEFT JOIN learning_hobbies_videos l ON l.id = cm.video_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
      // 13. mondo-market
      {
        module: "mondo-market",
        sql: `SELECT cm.id, cm.user_id, cm.comment, cm.created_at, cm.is_edited, cm.edited_at, cm.is_deleted,
          cm.item_id AS post_id,
          COALESCE(it.title, 'Mondo Market') AS post_title,
          (SELECT ii.image FROM item_images ii WHERE ii.item_id = it.id ORDER BY ii.id ASC LIMIT 1) AS post_image,
          'mondo-market' AS module,
          'Mondo Market' AS module_name
         FROM mondon_market_comment cm
         LEFT JOIN item it ON it.id = cm.item_id
         WHERE cm.user_id = $1 AND cm.is_deleted = FALSE AND cm.is_hidden = FALSE`,
      },
    ];

    let activeQueries = moduleQueries;
    if (moduleFilter && moduleFilter !== "all") {
      // an unknown module filter returns nothing (it used to silently return every module)
      activeQueries = moduleQueries.filter((m) => m.module === moduleFilter);
      if (activeQueries.length === 0) {
        return res.status(200).json({
          statusCode: 200,
          success: true,
          comments: [],
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    }

    const unionSql = activeQueries.map((m) => m.sql).join(" UNION ALL ");
    const params = [userId];
    let filterClause = "";

    if (search) {
      params.push(`%${search}%`);
      filterClause = ` WHERE (comment ILIKE $${params.length} OR post_title ILIKE $${params.length})`;
    }

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const fullSql = `
      WITH all_user_comments AS (
        ${unionSql}
      )
      SELECT *,
        COUNT(*) OVER() AS total_count
      FROM all_user_comments
      ${filterClause}
      ORDER BY created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const { rows } = await pool.query(fullSql, params);
    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const comments = rows.map(({ total_count, ...c }) => ({
      ...c,
      post_url: `/post/${c.module}/${c.post_id}?comment_id=${c.id}#comments-section`,
    }));

    return res.status(200).json({
      statusCode: 200,
      success: true,
      comments,
      data: comments,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("getUserComments error:", error);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Internal server error fetching user comments",
    });
  }
};
