import { getFirebaseAdmin } from "./firebaseAdmin.js";
import pool from "../db.config/index.js";

export const sendPushNotificationToAll = async (title, body, data = {}, excludeUserId = null) => {
  const admin = getFirebaseAdmin();
  if (!admin) {
    console.error("Firebase admin not initialized, skipping push notification");
    return;
  }

  try {
    // 1. Fetch all unique non-null FCM tokens from active users
    let query = "SELECT DISTINCT fcm_token FROM users WHERE fcm_token IS NOT NULL AND is_deleted = FALSE";
    let params = [];
    
    if (excludeUserId) {
      query += " AND id != $1";
      params.push(excludeUserId);
    }
    
    const { rows } = await pool.query(query, params);

    if (rows.length === 0) {
      console.log("No FCM tokens found in database.");
      return;
    }

    const tokens = rows.map(r => r.fcm_token);

    // 2. Prepare message
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      },
      tokens: tokens,
    };

    // 3. Send multicast
    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`[PUSH] Sent broadcast: "${title}". Success: ${response.successCount}, Fail: ${response.failureCount}`);

    // 4. Handle invalid tokens (Optional but recommended)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (errorCode === 'messaging/invalid-registration-token' || 
              errorCode === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
          // Clean up old tokens from DB
          await pool.query("UPDATE users SET fcm_token = NULL WHERE fcm_token = ANY($1)", [failedTokens]);
          console.log(`Cleaned up ${failedTokens.length} stale FCM tokens.`);
      }
    }

  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

export const sendPushNotificationToUser = async (user_id, title, body, data = {}) => {
  const admin = getFirebaseAdmin();
  if (!admin) {
    console.error("Firebase admin not initialized, skipping push notification");
    return;
  }

  try {
    const query = "SELECT fcm_token FROM users WHERE id = $1 AND fcm_token IS NOT NULL AND is_deleted = FALSE";
    const { rows } = await pool.query(query, [user_id]);

    if (rows.length === 0) {
      console.log(`No FCM token found for user ${user_id}.`);
      return;
    }

    const token = rows[0].fcm_token;

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      },
      token: token,
    };

    await admin.messaging().send(message);
    console.log(`Successfully sent push notification to user ${user_id}`);
  } catch (error) {
    console.error(`Error sending push notification to user ${user_id}:`, error);
  }
};

/**
 * High-level helper to both save a notification to the DB and send a push notification.
 */
export const notifyUser = async ({
  sender_id,
  receiver_id,
  title,
  body,
  moduletype,
  item_id,
  action = "comment",
  reference_table = null,
  reference_id = null,
}) => {
  const normalizedSenderId = Number(sender_id);
  const normalizedReceiverId = Number(receiver_id);
  const normalizedItemId =
    item_id === null || typeof item_id === "undefined" ? "" : String(item_id);
  const normalizedModuleType = moduletype ? String(moduletype) : "";
  const normalizedAction = action ? String(action) : "comment";

  if (!Number.isFinite(normalizedReceiverId)) {
    console.warn("[notifyUser] Skipping push: invalid receiver_id", { receiver_id });
    return;
  }
  if (Number.isFinite(normalizedSenderId) && normalizedSenderId === normalizedReceiverId) return;

  // 1. Save to Database
  try {
    // Ensure notification type exists (e.g., 'comment', 'like')
    let typeResult = await pool.query(
      "SELECT id FROM notification_type WHERE name = $1 LIMIT 1",
      [action]
    );
    if (typeResult.rowCount === 0) {
      typeResult = await pool.query(
        "INSERT INTO notification_type (name) VALUES ($1) RETURNING id",
        [action]
      );
    }
    const typeId = typeResult.rows[0].id;

    // Insert into notification table
    await pool.query(
      `INSERT INTO public.notification 
       (sender_id, receiver_id, type, title, content, moduletype, item_id, action, reference_table, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [normalizedSenderId || sender_id, normalizedReceiverId, typeId, title, body, normalizedModuleType, normalizedItemId, normalizedAction, reference_table, Number.isInteger(Number(reference_id)) && reference_id !== null ? Number(reference_id) : null]
    );
    console.log(`Notification saved to DB for user ${normalizedReceiverId}`);
  } catch (dbErr) {
    console.error("Failed to save notification to DB:", dbErr.message);
  }

  // 2. Send Push Notification
  try {
    await sendPushNotificationToUser(normalizedReceiverId, title, body, {
      // Provide both naming styles for compatibility across web/mobile clients.
      moduletype: normalizedModuleType,
      item_id: normalizedItemId,
      moduleId: normalizedModuleType,
      itemId: normalizedItemId,
      action: normalizedAction,
      reference_id: reference_id != null ? String(reference_id) : "",
    });
  } catch (pushErr) {
    console.error("Push notification failed in notifyUser:", pushErr.message);
  }
};
