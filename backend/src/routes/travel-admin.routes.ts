import { Router } from 'express';
import { TravelAdminController } from '../controllers/travel-admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All travel admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Main dashboard endpoint
router.get('/dashboard', TravelAdminController.getDashboard);

// Analytics endpoints
router.get('/analytics', TravelAdminController.getAnalytics);

// Search console endpoint
router.get('/search-console', TravelAdminController.getSearchConsole);

// Individual metric endpoints (optional, for more granular data)
router.get('/metrics/users', async (req, res) => {
  const metrics = await TravelAdminController.getUserMetrics(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(metrics);
});

router.get('/metrics/traffic', async (req, res) => {
  const metrics = await TravelAdminController.getTrafficMetrics(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(metrics);
});

router.get('/metrics/bookings', async (req, res) => {
  const metrics = await TravelAdminController.getBookingMetrics(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(metrics);
});

router.get('/metrics/revenue', async (req, res) => {
  const metrics = await TravelAdminController.getRevenueMetrics(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(metrics);
});

router.get('/metrics/geographic', async (req, res) => {
  const metrics = await TravelAdminController.getGeographicMetrics(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(metrics);
});

router.get('/metrics/listings', async (req, res) => {
  const metrics = await TravelAdminController.getListingMetrics();
  res.json(metrics);
});

router.get('/metrics/top-performers', async (req, res) => {
  const metrics = await TravelAdminController.getTopPerformers(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(metrics);
});

router.get('/metrics/category-performance', async (req, res) => {
  const metrics = await TravelAdminController.getCategoryPerformance(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(metrics);
});

// Listings management endpoints
router.get('/listings', TravelAdminController.getListings);

// Reports endpoints
router.get('/reports', TravelAdminController.getReports);
router.post('/reports/generate', TravelAdminController.generateReport);

export default router;