import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { denyMembers } from '../../middlewares/authorize-team.js';
import {
  getConversations,
  getConversationById,
  postConversation,
  postInternalConversation,
  getConversationMessages,
  postConversationMessage,
  patchConversationStatus,
  patchConversationAssign,
  getUnreadCountHandler,
  postTypingIndicator,
  postCallSignal,
} from './conversations.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster', 'admin'));

router.post('/internal', postInternalConversation);

router.post('/', denyMembers, postConversation);
router.patch('/:id/status', denyMembers, patchConversationStatus);
router.patch('/:id/assign', authorize('admin'), patchConversationAssign);

router.get('/', getConversations);
router.get('/unread-count', getUnreadCountHandler);
router.get('/:id', getConversationById);
router.get('/:id/messages', getConversationMessages);
router.post('/:id/messages', postConversationMessage);
router.post('/:id/typing', postTypingIndicator);
router.post('/:id/call/signal', postCallSignal);


export default router;
