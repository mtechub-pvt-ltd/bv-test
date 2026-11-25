import { Router } from 'express';
import { verification } from '../Middleware/Verification.js';
import { createNotification, deleteNotification, getAllNotificationsByUser, getAllReadNotificationsByUser, getAllUnReadNotificationsByUser, readNotification, markAllNotificationsAsRead } from '../Controllers/notificationController.js';
const notification = Router();

notification.post('/createNotification', createNotification);
notification.delete('/deleteNotification/:id', deleteNotification);
notification.put('/readNotification', readNotification);
notification.put('/markAllAsRead', markAllNotificationsAsRead);

// Cleaner routes for current user (ID from token)
notification.get("/unread", verification, getAllUnReadNotificationsByUser);
notification.get("/read", verification, getAllReadNotificationsByUser);
notification.get("/all", verification, getAllNotificationsByUser);

notification.get("/getAllNotificationsByUser/:user_id", getAllNotificationsByUser)
notification.get("/getAllReadNotificationsByUser/:user_id", getAllReadNotificationsByUser)
notification.get("/getAllUnReadNotificationsByUser/:user_id", getAllUnReadNotificationsByUser)
export default notification;
