/**
 * DSBP Comments API
 */
import http from './http';

const getTaskComments = (taskId) => http.get(`/comments/task/${taskId}`);
const createComment = (data) => http.post('/comments', data);
const resolveComment = (id, data) => http.patch(`/comments/${id}/resolve`, data);

export default {
  getTaskComments,
  createComment,
  resolveComment,
};
