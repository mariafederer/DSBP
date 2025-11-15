/**
 * DSBP Notifications API
 */
import http from './http';

const getNotifications = (unreadOnly = false) => {
  const query = unreadOnly ? '?unread_only=true' : '';
  return http.get(`/notifications${query}`);
};

const updateNotification = (id, data) => http.patch(`/notifications/${id}`, data);

export default {
  getNotifications,
  updateNotification,
};
