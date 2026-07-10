import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  getConversations,
  getConversationById,
  postConversation,
  getConversationMessages,
  postConversationMessage,
  patchConversationStatus,
  patchConversationAssign,
  getUnreadCountHandler,
  postTypingIndicator,
} from './conversations.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster', 'admin'));

router.get('/', getConversations);
router.get('/unread-count', getUnreadCountHandler);
router.post('/', postConversation);

router.get('/:id', getConversationById);
router.get('/:id/messages', getConversationMessages);
router.post('/:id/messages', postConversationMessage);
router.patch('/:id/status', patchConversationStatus);
router.patch('/:id/assign', authorize('admin'), patchConversationAssign);
router.post('/:id/typing', postTypingIndicator);

export default router;
