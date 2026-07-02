import { Router } from 'express';
import { login, me, register } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me); // Protected route

export default router;  