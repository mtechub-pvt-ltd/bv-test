import db from '../db.config/index.js';
import { Server } from 'socket.io';
import { sendPushNotificationToUser } from '../utils/notificationService.js';
import { NOTIFICATION_TITLES, NOTIFICATION_MESSAGES } from '../utils/notificationStrings.js';

const generateRoomId = (userId1, userId2) => {
  if (!userId1 || !userId2) return null;
  const sortedIds = [Number(userId1), Number(userId2)].sort((a, b) => a - b);
  return `wotchagotcha_chat_${sortedIds[0]}_${sortedIds[1]}`;
};

const connectedUsers = new Map();
/** @type {Map<string, Array<{id: string, senderId: number|string, username: string, senderImage: string|null, content: string, createdAt: string}>>} */
const liveStreamChatByChannel = new Map();
let chatMessagesHasOfferItemColumn = null;

const liveStreamRoomId = (channelName) =>
  `livestream_${String(channelName || '').replace(/[^a-zA-Z0-9_-]/g, '')}`;

const normalizeOfferItem = (rawOfferItem) => {
  if (!rawOfferItem) return null;

  const parsedOfferItem = typeof rawOfferItem === 'string'
    ? (() => {
      try {
        return JSON.parse(rawOfferItem);
      } catch {
        return null;
      }
    })()
    : rawOfferItem;

  if (!parsedOfferItem || typeof parsedOfferItem !== 'object') return null;

  let normalizedImage = parsedOfferItem.image || parsedOfferItem.item_image || '';
  if (typeof normalizedImage === 'string') {
    const trimmed = normalizedImage.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsedImage = JSON.parse(trimmed);
        normalizedImage =
          parsedImage?.image ||
          parsedImage?.url ||
          parsedImage?.secure_url ||
          '';
      } catch {
        normalizedImage = trimmed;
      }
    }
  } else if (normalizedImage && typeof normalizedImage === 'object') {
    normalizedImage =
      normalizedImage?.image ||
      normalizedImage?.url ||
      normalizedImage?.secure_url ||
      '';
  }

  return {
    ...parsedOfferItem,
    image: normalizedImage,
    title: parsedOfferItem?.title || parsedOfferItem?.name || 'Item',
    price: parsedOfferItem?.price ?? parsedOfferItem?.offer_price ?? '',
  };
};

const ensureOfferItemColumnInfo = async (pool) => {
  if (!pool) return false;
  if (typeof chatMessagesHasOfferItemColumn === 'boolean') {
    return chatMessagesHasOfferItemColumn;
  }
  try {
    const q = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'chat_messages'
          AND column_name = 'offer_item'
      ) AS has_offer_item
    `;
    const result = await pool.query(q);
    chatMessagesHasOfferItemColumn = Boolean(result?.rows?.[0]?.has_offer_item);
  } catch (err) {
    console.error(`Unable to check offer_item column: ${err.message}`);
    chatMessagesHasOfferItemColumn = false;
  }
  return chatMessagesHasOfferItemColumn;
};

export default function setupMessagingSocket(server, fallbackDb) {
  const pool = db || fallbackDb;

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      // Avoid browser CORS issues in production (origin "*" + credentials true is commonly rejected)
      credentials: false,
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
    },
  });

  io.on('connection', (socket) => {
    console.log(`Messaging socket connected: ${socket.id}`);

    socket.on('authenticate', async ({ userId }) => {
      try {
        if (!userId) {
          socket.emit('auth_error', { message: 'User ID required' });
          return;
        }
        
        socket.userId = userId;
        let authUser = { id: userId, name: `User-${userId}` };
        if (pool) {
          try {
            const uRes = await pool.query("SELECT id, username, image, badge, is_subscribed FROM users WHERE id = $1", [userId]);
            if (uRes?.rows?.[0]) {
              const u = uRes.rows[0];
              authUser = {
                id: u.id,
                name: u.username,
                username: u.username,
                image: u.image,
                badge: u.badge || null,
                is_subscribed: Boolean(u.is_subscribed)
              };
            }
          } catch (e) {
            console.error(`Error querying user on socket auth: ${e.message}`);
          }
        }
        socket.user = authUser;
        
        connectedUsers.set(String(userId), socket.id);
        socket.emit('authenticated', { success: true, user: socket.user });
        console.log(`User ${userId} authenticated for messaging`);
      } catch (err) {
        console.error(`authenticate error: ${err.message}`);
        socket.emit('auth_error', { message: err.message });
      }
    });

    socket.on('join_room', async ({ otherUserId }) => {
      try {
        const currentUserId = socket.userId;
        if (!currentUserId) {
          return socket.emit('join_room_error', { message: 'User not authenticated' });
        }
        if (!otherUserId) {
          return socket.emit('join_room_error', { message: 'Other user ID required' });
        }

        const roomId = generateRoomId(currentUserId, otherUserId);
        socket.join(roomId);
        
        let recentMessages = [];
        try {
          if (pool) {
            const historyQuery = `
              SELECT c.*, u.username AS sender_username, u.image AS sender_image, u.badge AS sender_badge, u.is_subscribed AS sender_is_subscribed
              FROM chat_messages c
              LEFT JOIN users u ON c.sender_id = u.id
              WHERE c.room_id = $1
              ORDER BY c.created_at DESC
              LIMIT 10
            `;
            const historyResult = await pool.query(historyQuery, [roomId]);
            recentMessages = historyResult.rows.map(r => {
                const normalizedOfferItem = normalizeOfferItem(r.offer_item);
                return {
                    id: r.id,
                    sender_id: r.sender_id,
                    receiver_id: r.receiver_id,
                    sender_username: r.sender_username,
                    sender_image: r.sender_image,
                    badge: r.sender_badge || null,
                    is_subscribed: Boolean(r.sender_is_subscribed),
                    content: r.content,
                    message_type: r.message_type,
                    file_url: r.image_url || r.voice_url || r.file_name,
                    file_type: r.mime_type,
                    room_id: r.room_id,
                    created_at: r.created_at,
                    is_read: r.is_read,
                    offer_item: normalizedOfferItem
                };
            }).reverse(); // oldest to newest
          }
        } catch (historyError) {
          console.error(`Error fetching message history on join: ${historyError.message}`);
        }

        socket.emit('room_joined', {
          roomId,
          otherUserId,
          recentMessages,
          message: `Joined room ${roomId} with ${recentMessages.length} recent messages`
        });
      } catch (error) {
        console.error(`join_room error: ${error.message}`);
        socket.emit('join_room_error', { message: error.message });
      }
    });

    socket.on('send_message', async (data) => {
      try {
        await handleSendMessage(socket, data, io, pool);
      } catch (err) {
        console.error(`send_message error: ${err.message}`);
        socket.emit('message_error', { error: true, message: err.message });
      }
    });

    socket.on('join_live_stream', ({ channelName }) => {
      try {
        if (!socket.userId) {
          return socket.emit('live_stream_error', { message: 'User not authenticated' });
        }
        const normalizedChannelName = String(channelName || '').trim();
        if (!normalizedChannelName) {
          return socket.emit('live_stream_error', { message: 'channelName required' });
        }
        const room = liveStreamRoomId(normalizedChannelName);
        socket.join(room);
        const history = liveStreamChatByChannel.get(normalizedChannelName) || [];
        socket.emit('live_stream_chat_history', {
          channelName: normalizedChannelName,
          messages: history.slice(-50),
        });
      } catch (err) {
        console.error(`join_live_stream error: ${err.message}`);
        socket.emit('live_stream_error', { message: err.message });
      }
    });

    socket.on('leave_live_stream', ({ channelName }) => {
      try {
        if (!channelName) return;
        socket.leave(liveStreamRoomId(channelName));
      } catch (err) {
        console.error(`leave_live_stream error: ${err.message}`);
      }
    });

    socket.on('live_stream_chat', async ({ channelName, content, username, senderImage }) => {
      try {
        if (!socket.userId) {
          return socket.emit('live_stream_error', { message: 'User not authenticated' });
        }
        const normalizedChannelName = String(channelName || '').trim();
        if (!normalizedChannelName) {
          return socket.emit('live_stream_error', { message: 'channelName required' });
        }
        const text = String(content || '').trim();
        if (!text) return;
        if (text.length > 2000) {
          return socket.emit('live_stream_error', { message: 'Message too long' });
        }

        let senderBadge = null;
        let senderIsSubscribed = false;
        if (pool) {
          try {
            const sRes = await pool.query("SELECT username, image, badge, is_subscribed FROM users WHERE id = $1", [socket.userId]);
            if (sRes?.rows?.[0]) {
              username = sRes.rows[0].username || username;
              senderImage = sRes.rows[0].image || senderImage;
              senderBadge = sRes.rows[0].badge || null;
              senderIsSubscribed = Boolean(sRes.rows[0].is_subscribed);
            }
          } catch (e) {
            console.error(`Error querying user for live_stream_chat: ${e.message}`);
          }
        }

        const msg = {
          id: `ls_${Date.now()}_${socket.id}`,
          channelName: normalizedChannelName,
          senderId: socket.userId,
          username: username || `User ${socket.userId}`,
          senderImage: senderImage || null,
          badge: senderBadge,
          is_subscribed: senderIsSubscribed,
          content: text,
          createdAt: new Date().toISOString(),
        };
        if (!liveStreamChatByChannel.has(normalizedChannelName)) {
          liveStreamChatByChannel.set(normalizedChannelName, []);
        }
        const arr = liveStreamChatByChannel.get(normalizedChannelName);
        arr.push(msg);
        if (arr.length > 200) {
          arr.splice(0, arr.length - 200);
        }
        io.to(liveStreamRoomId(normalizedChannelName)).emit('live_stream_chat_message', msg);
      } catch (err) {
        console.error(`live_stream_chat error: ${err.message}`);
        socket.emit('live_stream_error', { message: err.message });
      }
    });

    socket.on('mark_read', async ({ roomId, readerId }) => {
      if (!roomId || !readerId) return;
      try {
        if (pool) {
          const q = 'UPDATE chat_messages SET is_read = true WHERE room_id = $1 AND receiver_id = $2 AND is_read = false';
          await pool.query(q, [roomId, readerId]);
        }
        io.to(roomId).emit('messages_read', { roomId, readerId });
        // Also notify the specific user to refresh their global unread count
        socket.emit('unread_count_refreshed');
      } catch (err) {
        console.error(`mark_read error: ${err.message}`);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(String(socket.userId));
        console.log(`User ${socket.userId} disconnected from messaging`);
      }
    });
  });

  io.connectedUsers = connectedUsers;
  global.__IO = io;
  return io;
}

async function handleSendMessage(socket, { receiverId, content, messageType = 'text', fileUrl, fileType, roomId, tempId, senderId, offer_item: offerItemSnake }, io, pool) {
  const currentUserId = socket.userId || senderId;
  if (!currentUserId) throw new Error('Sender ID required');
  if (!receiverId) throw new Error('Receiver ID required');
  
  let finalRoomId = roomId;
  if (!finalRoomId || finalRoomId.trim() === '') {
    finalRoomId = generateRoomId(currentUserId, receiverId);
  }
  
  const createdAt = new Date();

  let savedMessage = null;
  let imageUrl = null;
  let voiceUrl = null;
  const normalizedOfferItem = normalizeOfferItem(offerItemSnake);

  if (messageType === 'image') imageUrl = fileUrl || content;
  if (messageType === 'voice' || messageType === 'video') voiceUrl = fileUrl || content;

  try {
    if (pool) {
      const hasOfferItemColumn = await ensureOfferItemColumnInfo(pool);
      const insertQ = hasOfferItemColumn
        ? `INSERT INTO chat_messages (sender_id, receiver_id, content, message_type, image_url, voice_url, mime_type, room_id, created_at, is_read, offer_item) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`
        : `INSERT INTO chat_messages (sender_id, receiver_id, content, message_type, image_url, voice_url, mime_type, room_id, created_at, is_read) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
      const vals = hasOfferItemColumn
        ? [
          currentUserId,
          receiverId,
          content || null,
          messageType || 'text',
          imageUrl,
          voiceUrl,
          fileType || null,
          finalRoomId,
          createdAt,
          false,
          normalizedOfferItem ? JSON.stringify(normalizedOfferItem) : null
        ]
        : [
          currentUserId,
          receiverId,
          content || null,
          messageType || 'text',
          imageUrl,
          voiceUrl,
          fileType || null,
          finalRoomId,
          createdAt,
          false
        ];
      const res = await pool.query(insertQ, vals);
      if (res && res.rows && res.rows[0]) savedMessage = res.rows[0];
    }
  } catch (e) {
    console.error(`Error saving chat message to DB: ${e.message}`);
  }

  const message = savedMessage || {
    id: tempId || `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    sender_id: currentUserId,
    receiver_id: receiverId,
    content,
    message_type: messageType,
    image_url: imageUrl,
    voice_url: voiceUrl,
    room_id: finalRoomId,
    created_at: createdAt.toISOString(),
    is_read: false,
    offer_item: normalizedOfferItem
  };

  let senderBadge = null;
  let senderIsSubscribed = false;
  let senderName = "Someone";

  try {
    if (pool) {
      const senderInfo = await pool.query("SELECT username, image, badge, is_subscribed FROM users WHERE id = $1", [currentUserId]);
      if (senderInfo?.rows?.[0]) {
        senderName = senderInfo.rows[0].username || "Someone";
        senderBadge = senderInfo.rows[0].badge || null;
        senderIsSubscribed = Boolean(senderInfo.rows[0].is_subscribed);
      }
    }
  } catch (e) {
    console.error(`Error querying sender info: ${e.message}`);
  }

  const messageOfferItem = normalizeOfferItem(message.offer_item) || normalizedOfferItem;
  const messagePayload = {
    messageId: message.id,
    senderId: currentUserId,
    badge: senderBadge,
    is_subscribed: senderIsSubscribed,
    receiverId,
    roomId: finalRoomId,
    content: content || '',
    messageType,
    fileUrl: imageUrl || voiceUrl || '',
    timestamp: message.created_at,
    offer_item: messageOfferItem
  };

  const receiverSocketId = connectedUsers.get(String(receiverId));
  const senderSocketId = connectedUsers.get(String(currentUserId));

  // The sender is already joined to the room via 'join_room', but let's make sure both are if connected
  if (receiverSocketId) {
    const receiverSocket = io.sockets.sockets.get(receiverSocketId);
    if (receiverSocket) receiverSocket.join(finalRoomId);
  }
  if (senderSocketId) {
    const sSocket = io.sockets.sockets.get(senderSocketId);
    if (sSocket) sSocket.join(finalRoomId);
  }

  io.to(finalRoomId).emit('receive_message', messagePayload);

  // Send Push Notification
  try {
    const title = NOTIFICATION_TITLES.NEW_MESSAGE;
    const body = NOTIFICATION_MESSAGES.NEW_MESSAGE_DESC(senderName);

    sendPushNotificationToUser(receiverId, title, body, {
      moduleId: 'messaging',
      senderId: String(currentUserId),
      roomId: String(finalRoomId),
      type: 'message'
    });
  } catch (err) {
    console.warn('Push notification for message failed:', err.message);
  }
}
