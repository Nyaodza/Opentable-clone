import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getFloorPlans,
  createFloorPlan,
  updateFloorPlan,
  deleteFloorPlan,
  getTableAvailability,
  assignTable,
  seatTable,
  vacateTable,
  getFloorPlanStatus
} from '../controllers/table.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Floor plan management
router.get('/restaurants/:restaurantId/floor-plans', getFloorPlans);
router.post('/restaurants/:restaurantId/floor-plans', createFloorPlan);
router.put('/floor-plans/:id', updateFloorPlan);
router.delete('/floor-plans/:id', deleteFloorPlan);

// Table availability and status
router.get('/restaurants/:restaurantId/availability', getTableAvailability);
router.get('/floor-plans/:floorPlanId/status', getFloorPlanStatus);

// Table assignment management
router.post('/assignments', assignTable);
router.patch('/assignments/:assignmentId/seat', seatTable);
router.patch('/assignments/:assignmentId/vacate', vacateTable);

export default router;