import { Router } from 'express';
import { jwtAuth } from '../middleware/auth.middleware.js';
import { getUploadSignature } from '../controllers/upload.controller.js';

const router = Router();

router.route('/upload-signature').get(jwtAuth, getUploadSignature);

export default router;
