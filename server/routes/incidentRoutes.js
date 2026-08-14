// server/routes/incidentRoutes.js
import { Router } from 'express';
import {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncident,
  analyzeIncidentWithAI,
  resolveIncident,
  getIncidentStats
} from '../controllers/incidentController.js';

const router = Router();

router.get('/stats', getIncidentStats);
router.post('/', createIncident);
router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.patch('/:id', updateIncident);
router.post('/:id/analyze', analyzeIncidentWithAI);
router.post('/:id/resolve', resolveIncident);

export default router;
