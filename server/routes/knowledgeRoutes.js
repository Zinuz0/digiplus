// server/routes/knowledgeRoutes.js
import { Router } from 'express';
import {
  getKnowledgeItems,
  getKnowledgeItemById,
  getKnowledgeStats
} from '../controllers/knowledgeController.js';

const router = Router();

router.get('/stats', getKnowledgeStats);
router.get('/', getKnowledgeItems);
router.get('/:id', getKnowledgeItemById);

export default router;
